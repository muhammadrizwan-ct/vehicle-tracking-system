// --- Per-Ticket Last Viewed Tracking ---
const TICKETS_LAST_VIEWED_KEY = 'vts_tickets_last_viewed';

function getTicketsLastViewed() {
    try {
        return JSON.parse(localStorage.getItem(TICKETS_LAST_VIEWED_KEY) || '{}');
    } catch {
        return {};
    }
}

function setTicketLastViewed(ticketId) {
    const viewed = getTicketsLastViewed();
    viewed[ticketId] = new Date().toISOString();
    localStorage.setItem(TICKETS_LAST_VIEWED_KEY, JSON.stringify(viewed));
}

function getTicketLastViewed(ticketId) {
    const viewed = getTicketsLastViewed();
    return viewed[ticketId] || '1970-01-01T00:00:00Z';
}
// Tickets Module
var supabase = window.supabaseClient;

// --- Realtime Ticket Updates ---
function subscribeToTicketUpdates() {
    if (!supabase || !supabase.channel) return;

    // Subscribe to tickets table changes
    const ticketChannel = supabase.channel('tickets-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, payload => {
            handleTicketRealtimeEvent(payload, 'ticket');
        })
        .subscribe();

    // Subscribe to ticket_comments table changes
    const commentChannel = supabase.channel('ticket-comments-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_comments' }, payload => {
            handleTicketRealtimeEvent(payload, 'comment');
        })
        .subscribe();
}

function handleTicketRealtimeEvent(payload, type) {
    // Only show popup if user is on tickets page
    const activeNav = document.querySelector('.nav-item.active');
    const isOnTicketsPage = activeNav && activeNav.textContent.includes('Tickets');
    if (!isOnTicketsPage) return;

    let ticketId = null;
    let ticketNumber = '';
    let title = '';
    let message = '';

    if (type === 'ticket') {
        ticketId = payload.new?.id || payload.old?.id;
        ticketNumber = payload.new?.ticket_number || payload.old?.ticket_number || '';
        title = payload.new?.title || payload.old?.title || '';
        if (payload.eventType === 'INSERT') {
            message = `New ticket created: <strong>${escapeHtmlTickets(ticketNumber)}</strong> - ${escapeHtmlTickets(title)}`;
        } else if (payload.eventType === 'UPDATE') {
            message = `Ticket updated: <strong>${escapeHtmlTickets(ticketNumber)}</strong> - ${escapeHtmlTickets(title)}`;
        }
    } else if (type === 'comment') {
        ticketId = payload.new?.ticket_id || payload.old?.ticket_id;
        // We need to fetch ticket details for number/title
        if (ticketId) {
            fetchTicketAndShowPopup(ticketId, payload);
            return;
        }
    }

    if (message && ticketId) {
        showTicketPopup(message, ticketId);
    }
}

async function fetchTicketAndShowPopup(ticketId, payload) {
    // Try to find ticket in memory first
    let ticket = (window._allTickets || []).find(t => t.id === ticketId);
    if (!ticket) {
        // Fallback: fetch from DB
        const { data, error } = await supabase.from('tickets').select('ticket_number,title').eq('id', ticketId).single();
        if (error || !data) return;
        ticket = data;
    }
    const message = `New comment on ticket: <strong>${escapeHtmlTickets(ticket.ticket_number)}</strong> - ${escapeHtmlTickets(ticket.title)}`;
    showTicketPopup(message, ticketId);
}

function showTicketPopup(message, ticketId) {
    // Remove any existing popup in toolbar
    const headerActions = document.getElementById('header-actions');
    if (!headerActions) return;
    const existing = document.getElementById('ticket-realtime-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'ticket-realtime-popup';
    popup.style.display = 'inline-flex';
    popup.style.alignItems = 'center';
    popup.style.gap = '10px';
    popup.style.background = '#fff';
    popup.style.border = '2px solid #1976d2';
    popup.style.borderRadius = '8px';
    popup.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)';
    popup.style.padding = '8px 18px 8px 12px';
    popup.style.marginLeft = '16px';
    popup.style.fontSize = '15px';
    popup.style.color = '#222';
    popup.style.zIndex = 10;
    popup.innerHTML = `
        <i class="fas fa-bell" style="color: #1976d2; font-size: 18px;"></i>
        <span>${message}</span>
        <button class="btn btn-primary btn-sm" style="margin-left: 10px;" onclick="viewTicketDetail('${ticketId}'); closeTicketPopup();">View</button>
        <button class="btn btn-secondary btn-sm" style="margin-left: 4px;" onclick="closeTicketPopup()">Dismiss</button>
    `;
    headerActions.appendChild(popup);
    // Auto-dismiss after 15 seconds if not viewed
    setTimeout(() => { if (popup.parentNode) popup.remove(); }, 15000);
}

window.closeTicketPopup = function() {
    const popup = document.getElementById('ticket-realtime-popup');
    if (popup) popup.remove();
};

// Initialize realtime subscription on tickets page load
if (typeof subscribeToTicketUpdates === 'function' || supabase?.channel) {
    setTimeout(() => {
        subscribeToTicketUpdates();
    }, 2000);
}

function escapeHtmlTickets(value) {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(value);
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Generate next ticket number (TKT-0001, TKT-0002, ...)
async function generateTicketNumber() {
    const { data } = await supabase
        .from('tickets')
        .select('ticket_number')
        .order('created_at', { ascending: false })
        .limit(1);

    if (data && data.length > 0) {
        const lastNum = parseInt(String(data[0].ticket_number).replace('TKT-', ''), 10) || 0;
        return `TKT-${String(lastNum + 1).padStart(4, '0')}`;
    }
    return 'TKT-0001';
}

// Fetch all tickets
async function fetchTickets() {
    const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Tickets fetch error:', error);
        return [];
    }
    return data || [];
}

// Fetch users for assignment dropdown
async function fetchUsersForTickets() {
    const { data, error } = await supabase
        .from('users')
        .select('username, fullname')
        .eq('status', 'active');

    if (error) {
        console.error('Users fetch error:', error);
        return [];
    }
    return data || [];
}

// Status config
const TICKET_STATUSES = {
    open: { label: 'Open', color: '#1976d2', bg: '#e3f2fd', icon: 'fa-circle' },
    'in-progress': { label: 'In Progress', color: '#f57c00', bg: '#fff3e0', icon: 'fa-spinner' },
    issue: { label: 'Issue', color: '#d32f2f', bg: '#ffebee', icon: 'fa-exclamation-triangle' },
    finished: { label: 'Finished', color: '#388e3c', bg: '#e8f5e9', icon: 'fa-check-circle' }
};

const TICKET_PRIORITIES = {
    low: { label: 'Low', color: '#757575', bg: '#f5f5f5' },
    medium: { label: 'Medium', color: '#1976d2', bg: '#e3f2fd' },
    high: { label: 'High', color: '#f57c00', bg: '#fff3e0' },
    urgent: { label: 'Urgent', color: '#d32f2f', bg: '#ffebee' }
};

// Main load function
async function loadTickets() {
    const container = document.getElementById('content-body');
    if (!container) return;

    // Mark tickets as seen to clear badge
    markTicketsSeen();

    // Clear header actions from previous page
    const headerActions = document.getElementById('header-actions');
    if (headerActions) {
        headerActions.innerHTML = `
            <button class="btn btn-primary" onclick="showCreateTicketModal()">
                <i class="fas fa-plus"></i> New Ticket
            </button>
        `;
    }

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <select id="ticket-status-filter" onchange="filterTickets()" style="padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px; font-size: 14px;">
                    <option value="">All Statuses</option>
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="issue">Issue</option>
                    <option value="finished">Finished</option>
                </select>
                <select id="ticket-priority-filter" onchange="filterTickets()" style="padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px; font-size: 14px;">
                    <option value="">All Priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                </select>
            </div>
        </div>
        <div id="tickets-table-container">
            <p style="text-align: center; padding: 40px; color: var(--gray-500);">Loading tickets...</p>
        </div>
    `;

    window._allTickets = await fetchTickets();
    renderTicketsTable(window._allTickets);
}

function filterTickets() {
    const statusFilter = document.getElementById('ticket-status-filter')?.value || '';
    const priorityFilter = document.getElementById('ticket-priority-filter')?.value || '';
    let tickets = window._allTickets || [];

    if (statusFilter) tickets = tickets.filter(t => t.status === statusFilter);
    if (priorityFilter) tickets = tickets.filter(t => t.priority === priorityFilter);

    renderTicketsTable(tickets);
}

function renderTicketsTable(tickets) {
    const container = document.getElementById('tickets-table-container');
    if (!container) return;

    if (!tickets || tickets.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: 40px;">No tickets found</p>';
        return;
    }

    let html = '<div class="table-responsive"><table class="data-table">';
    html += '<thead><tr>';
    html += '<th>Ticket #</th>';
    html += '<th>Title</th>';
    html += '<th>Assigned To</th>';
    html += '<th>Priority</th>';
    html += '<th>Status</th>';
    html += '<th>Created By</th>';
    html += '<th>Due Date</th>';
    html += '<th>Created</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';

    tickets.forEach(ticket => {
        const statusCfg = TICKET_STATUSES[ticket.status] || TICKET_STATUSES.open;
        const priorityCfg = TICKET_PRIORITIES[ticket.priority] || TICKET_PRIORITIES.medium;
        const dueDate = ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : '-';
        const createdDate = ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '-';
        const safeId = escapeHtmlTickets(ticket.id);

        // Determine latest activity (ticket update or latest comment)
        let latestActivity = ticket.updated_at;
        if (ticket.comments && ticket.comments.length > 0) {
            const lastComment = ticket.comments.reduce((latest, c) => {
                if (!latest) return c;
                return new Date(c.created_at) > new Date(latest.created_at) ? c : latest;
            }, null);
            if (lastComment && new Date(lastComment.created_at) > new Date(latestActivity)) {
                latestActivity = lastComment.created_at;
            }
        }
        const lastViewed = getTicketLastViewed(ticket.id);
        const hasNew = new Date(latestActivity) > new Date(lastViewed);

        html += '<tr>';
        html += `<td><strong>${escapeHtmlTickets(ticket.ticket_number)}</strong></td>`;
        // Only show dot if hasNew is true
        html += `<td>${escapeHtmlTickets(ticket.title)}${hasNew ? ' <span title="New activity" style="color: #d32f2f; margin-left: 6px;"><i class="fas fa-circle" style="font-size: 10px;"></i></span>' : ''}</td>`;
        html += `<td>${escapeHtmlTickets(ticket.assigned_to || '-')}</td>`;
        html += `<td><span style="background: ${priorityCfg.bg}; color: ${priorityCfg.color}; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 12px;">${escapeHtmlTickets(priorityCfg.label)}</span></td>`;
        html += `<td><span style="background: ${statusCfg.bg}; color: ${statusCfg.color}; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 12px;"><i class="fas ${statusCfg.icon}" style="margin-right: 4px;"></i>${escapeHtmlTickets(statusCfg.label)}</span></td>`;
        html += `<td>${escapeHtmlTickets(ticket.created_by)}</td>`;
        html += `<td>${escapeHtmlTickets(dueDate)}</td>`;
        html += `<td>${escapeHtmlTickets(createdDate)}</td>`;
        html += `<td style="white-space: nowrap;">
            <div style="display: inline-flex; align-items: center; gap: 6px;">
                <button class="btn btn-sm btn-secondary" onclick="viewTicketDetail('${safeId}')" title="View" style="width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-primary" onclick="showUpdateTicketStatusModal('${safeId}')" title="Update Status" style="width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// Create Ticket Modal
async function showCreateTicketModal() {
    const users = await fetchUsersForTickets();
    const ticketNumber = await generateTicketNumber();

    const userOptions = users.map(u => `<option value="${escapeHtmlTickets(u.username)}">${escapeHtmlTickets(u.fullname || u.username)}</option>`).join('');

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 560px;">
                <div class="modal-header">
                    <h3><i class="fas fa-ticket-alt" style="margin-right: 8px;"></i>New Ticket</h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 12px;">
                        <label style="font-weight: 600; margin-bottom: 4px; display: block;">Ticket #</label>
                        <input type="text" id="ticket-number" value="${escapeHtmlTickets(ticketNumber)}" readonly style="width: 100%; padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px; background: var(--gray-100); color: var(--gray-600);">
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label style="font-weight: 600; margin-bottom: 4px; display: block;">Title <span style="color: var(--danger);">*</span></label>
                        <input type="text" id="ticket-title" placeholder="Enter ticket title" maxlength="200" style="width: 100%; padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px;">
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label style="font-weight: 600; margin-bottom: 4px; display: block;">Description</label>
                        <textarea id="ticket-description" placeholder="Describe the task or issue..." rows="3" maxlength="2000" style="width: 100%; padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px; resize: vertical;"></textarea>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                        <div>
                            <label style="font-weight: 600; margin-bottom: 4px; display: block;">Assigned To</label>
                            <select id="ticket-assigned-to" style="width: 100%; padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px;">
                                <option value="">Unassigned</option>
                                ${userOptions}
                            </select>
                        </div>
                        <div>
                            <label style="font-weight: 600; margin-bottom: 4px; display: block;">Priority</label>
                            <select id="ticket-priority" style="width: 100%; padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px;">
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label style="font-weight: 600; margin-bottom: 4px; display: block;">Due Date</label>
                        <input type="date" id="ticket-due-date" style="width: 100%; padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px;">
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; padding: 16px;">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="createTicket()">
                        <i class="fas fa-plus" style="margin-right: 4px;"></i> Create Ticket
                    </button>
                </div>
            </div>
        </div>
    `;

    closeModal();
    document.getElementById('modals-container').innerHTML = modalHTML;
}

// Create ticket
async function createTicket() {
    const title = (document.getElementById('ticket-title')?.value || '').trim();
    const description = (document.getElementById('ticket-description')?.value || '').trim();
    const assignedTo = document.getElementById('ticket-assigned-to')?.value || '';
    const priority = document.getElementById('ticket-priority')?.value || 'medium';
    const dueDate = document.getElementById('ticket-due-date')?.value || null;
    const ticketNumber = document.getElementById('ticket-number')?.value || '';

    if (!title) {
        showNotification('Please enter a ticket title', 'error');
        return;
    }

    const currentUser = Auth?.user?.username || Auth?.user?.email || 'Unknown';

    const { data, error } = await supabase
        .from('tickets')
        .insert([{
            ticket_number: ticketNumber,
            title: title,
            description: description || null,
            assigned_to: assignedTo || null,
            priority: priority,
            status: 'open',
            created_by: currentUser,
            due_date: dueDate
        }])
        .select('*');

    if (error) {
        console.error('Create ticket error:', error);
        showNotification('Failed to create ticket: ' + (error.message || 'Unknown error'), 'error');
        return;
    }

    showNotification('Ticket created successfully', 'success');
    closeModal();
    loadTickets();
}

// Fetch comments for a ticket
async function fetchTicketComments(ticketId) {
    const { data, error } = await supabase
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Fetch comments error:', error);
        return [];
    }
    return data || [];
}

// Add a comment to a ticket
// Preview attachment before sending
function previewTicketAttachment(input) {
    const preview = document.getElementById('ticket-attachment-preview');
    const thumb = document.getElementById('ticket-attachment-thumb');
    const nameEl = document.getElementById('ticket-attachment-name');
    if (input.files && input.files[0]) {
        const file = input.files[0];
        // Limit to 20MB
        if (file.size > 20 * 1024 * 1024) {
            showNotification('File too large. Maximum size is 20MB.', 'error');
            input.value = '';
            return;
        }
        if (nameEl) nameEl.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            thumb.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
}

function clearTicketAttachment() {
    const input = document.getElementById('ticket-attachment-input');
    const preview = document.getElementById('ticket-attachment-preview');
    if (input) input.value = '';
    if (preview) preview.style.display = 'none';
}

// Upload attachment to Supabase Storage
async function uploadTicketAttachment(file) {
    // Enforce 20MB file size limit
    if (file.size > 20 * 1024 * 1024) {
        showNotification('File too large. Maximum size is 20MB.', 'error');
        return null;
    }
    const ext = file.name.split('.').pop().toLowerCase();
    const allowed = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];
    if (!allowed.includes(ext)) {
        showNotification('Only image files are allowed (PNG, JPG, GIF, WEBP)', 'error');
        return null;
    }
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const filePath = `comments/${fileName}`;

    const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) {
        console.error('Upload error:', error);
        showNotification('Failed to upload attachment: ' + (error.message || error.statusCode || 'Unknown error'), 'error');
        return null;
    }

    const { data: urlData } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(filePath);

    return urlData?.publicUrl || null;
}

async function addTicketComment(ticketId) {
    const input = document.getElementById('ticket-comment-input');
    const fileInput = document.getElementById('ticket-attachment-input');
    const comment = (input?.value || '').trim();
    const file = fileInput?.files?.[0] || null;

    if (!comment && !file) {
        showNotification('Please enter a comment or attach a screenshot', 'error');
        return;
    }

    // Upload attachment if present
    let attachmentUrl = null;
    if (file) {
        showNotification('Uploading screenshot...', 'info');
        attachmentUrl = await uploadTicketAttachment(file);
        if (!attachmentUrl) return; // upload failed, error already shown
        console.log('Attachment uploaded:', attachmentUrl);
        showNotification('Screenshot uploaded successfully', 'success');
    }

    const currentUser = Auth?.user?.username || Auth?.user?.email || 'Unknown';
    const currentUserId = Auth?.user?.id || '';

    const insertData = {
        ticket_id: ticketId,
        comment: comment || (attachmentUrl ? '' : ''),
        created_by: currentUser,
        created_by_id: currentUserId || null,
        attachment_url: attachmentUrl || null
    };

    console.log('Inserting comment:', JSON.stringify(insertData));

    const { data: insertedData, error } = await supabase
        .from('ticket_comments')
        .insert([insertData])
        .select('*');

    if (error) {
        console.error('Add comment error:', error);
        showNotification('Failed to add comment: ' + (error.message || 'Unknown error'), 'error');
        return;
    }

    console.log('Comment inserted:', insertedData);

    // Also update ticket's updated_at
    await supabase.from('tickets').update({ updated_at: new Date().toISOString() }).eq('id', ticketId);

    // Refresh comments in the modal
    await refreshTicketComments(ticketId);
    if (input) input.value = '';
    clearTicketAttachment();
}

// Refresh just the comments section inside the modal
async function refreshTicketComments(ticketId) {
    const comments = await fetchTicketComments(ticketId);
    const commentsContainer = document.getElementById('ticket-comments-list');
    if (commentsContainer) {
        commentsContainer.innerHTML = renderCommentsHTML(comments);
        commentsContainer.scrollTop = commentsContainer.scrollHeight;
    }
}

// Render comments HTML
function renderCommentsHTML(comments) {
    if (!comments || comments.length === 0) {
        return '<p style="text-align: center; color: var(--gray-400); padding: 16px; font-size: 13px;">No comments yet. Be the first to comment.</p>';
    }

    const currentUser = Auth?.user?.username || Auth?.user?.email || '';

    const currentUserId = Auth?.user?.id || '';

    return comments.map(c => {
        const isSystem = c.created_by === 'System';
        const isOwn = c.created_by_id ? (c.created_by_id === currentUserId) : (c.created_by === currentUser);
        const time = c.created_at ? new Date(c.created_at).toLocaleString() : '';
        const userLabel = c.created_by_id ? `${c.created_by} (${c.created_by_id.substring(0, 8)})` : c.created_by;

        if (isSystem) {
            return `
                <div style="text-align: center; padding: 6px 0;">
                    <span style="background: var(--gray-100); color: var(--gray-500); padding: 4px 12px; border-radius: 12px; font-size: 12px; font-style: italic;">
                        <i class="fas fa-info-circle" style="margin-right: 4px;"></i>${escapeHtmlTickets(c.comment)}
                        <span style="margin-left: 6px; font-size: 11px;">${escapeHtmlTickets(time)}</span>
                    </span>
                </div>
            `;
        }

        return `
            <div style="display: flex; flex-direction: column; ${isOwn ? 'align-items: flex-end;' : 'align-items: flex-start;'} margin-bottom: 10px;">
                <div style="max-width: 85%; background: ${isOwn ? '#e3f2fd' : 'var(--gray-50)'}; border-radius: 10px; padding: 10px 14px; border: 1px solid ${isOwn ? '#bbdefb' : 'var(--gray-200)'};">
                    <div style="font-weight: 600; font-size: 12px; color: ${isOwn ? '#1976d2' : 'var(--gray-700)'}; margin-bottom: 4px;">
                        ${escapeHtmlTickets(userLabel)}
                    </div>
                    ${c.attachment_url ? `<div style="margin-bottom: 6px;"><a href="${escapeHtmlTickets(c.attachment_url)}" target="_blank" rel="noopener noreferrer"><img src="${escapeHtmlTickets(c.attachment_url)}" style="max-width: 200px; max-height: 150px; border-radius: 6px; border: 1px solid var(--gray-300); cursor: pointer;" alt="attachment" /></a></div>` : ''}
                    <div style="font-size: 14px; color: var(--gray-800); white-space: pre-wrap; word-break: break-word;">${escapeHtmlTickets(c.comment)}</div>
                    <div style="font-size: 11px; color: var(--gray-400); margin-top: 4px; text-align: right;">${escapeHtmlTickets(time)}</div>
                </div>
            </div>
        `;
    }).join('');
}

// View ticket detail with comments
async function viewTicketDetail(ticketId) {
    const tickets = window._allTickets || [];
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    // Mark this ticket as viewed now
    setTicketLastViewed(ticketId);

    const statusCfg = TICKET_STATUSES[ticket.status] || TICKET_STATUSES.open;
    const priorityCfg = TICKET_PRIORITIES[ticket.priority] || TICKET_PRIORITIES.medium;
    const dueDate = ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : '-';
    const createdDate = ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '-';
    const updatedDate = ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : '-';

    const comments = await fetchTicketComments(ticketId);
    const commentsHTML = renderCommentsHTML(comments);

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 620px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden;">
                <div class="modal-header" style="flex-shrink: 0;">
                    <h3><i class="fas fa-ticket-alt" style="margin-right: 8px;"></i>${escapeHtmlTickets(ticket.ticket_number)}</h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body" style="padding-bottom: 0; overflow-y: auto; flex: 1; min-height: 0;">
                    <h4 style="margin-bottom: 12px;">${escapeHtmlTickets(ticket.title)}</h4>
                    ${ticket.description ? `<p style="color: var(--gray-600); margin-bottom: 16px; white-space: pre-wrap;">${escapeHtmlTickets(ticket.description)}</p>` : ''}
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                        <div>
                            <small style="color: var(--gray-500);">Status</small>
                            <div><span style="background: ${statusCfg.bg}; color: ${statusCfg.color}; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 13px;"><i class="fas ${statusCfg.icon}" style="margin-right: 4px;"></i>${escapeHtmlTickets(statusCfg.label)}</span></div>
                        </div>
                        <div>
                            <small style="color: var(--gray-500);">Priority</small>
                            <div><span style="background: ${priorityCfg.bg}; color: ${priorityCfg.color}; padding: 4px 10px; border-radius: 4px; font-weight: 600; font-size: 13px;">${escapeHtmlTickets(priorityCfg.label)}</span></div>
                        </div>
                        <div>
                            <small style="color: var(--gray-500);">Assigned To</small>
                            <div style="font-weight: 600;">${escapeHtmlTickets(ticket.assigned_to || 'Unassigned')}</div>
                        </div>
                        <div>
                            <small style="color: var(--gray-500);">Created By</small>
                            <div style="font-weight: 600;">${escapeHtmlTickets(ticket.created_by)}</div>
                        </div>
                        <div>
                            <small style="color: var(--gray-500);">Due Date</small>
                            <div style="font-weight: 600;">${escapeHtmlTickets(dueDate)}</div>
                        </div>
                        <div>
                            <small style="color: var(--gray-500);">Created</small>
                            <div style="font-weight: 600;">${escapeHtmlTickets(createdDate)}</div>
                        </div>
                    </div>

                    <!-- Comments Section -->
                    <div style="border-top: 1px solid var(--gray-200); padding-top: 14px;">
                        <h4 style="margin-bottom: 10px; font-size: 15px;"><i class="fas fa-comments" style="margin-right: 6px; color: var(--gray-500);"></i>Comments</h4>
                        <div id="ticket-comments-list" style="max-height: 250px; overflow-y: auto; margin-bottom: 12px; padding: 4px;">
                            ${commentsHTML}
                        </div>
                        <div id="ticket-attachment-preview" style="display: none; margin-bottom: 8px; background: var(--gray-50); border: 1px solid var(--gray-300); border-radius: 8px; padding: 8px; width: fit-content;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <img id="ticket-attachment-thumb" src="" style="max-width: 120px; max-height: 80px; border-radius: 6px; object-fit: cover;" />
                                <div style="display: flex; flex-direction: column; gap: 4px;">
                                    <span id="ticket-attachment-name" style="font-size: 12px; color: var(--gray-600);"></span>
                                    <button onclick="clearTicketAttachment()" style="background: var(--danger); color: white; border: none; border-radius: 4px; padding: 2px 8px; font-size: 12px; cursor: pointer; width: fit-content;">
                                        <i class="fas fa-times" style="margin-right: 4px;"></i>Remove
                                    </button>
                                </div>
                            </div>
                        </div>
                        <input type="file" id="ticket-attachment-input" accept="image/*" style="display: none;" onchange="previewTicketAttachment(this)" />
                        <div style="display: flex; gap: 8px; padding-bottom: 4px;">
                            <button class="btn btn-secondary" onclick="document.getElementById('ticket-attachment-input').click()" style="align-self: flex-end; height: 38px; padding: 0 10px;" title="Attach screenshot">
                                <i class="fas fa-paperclip"></i>
                            </button>
                            <textarea id="ticket-comment-input" placeholder="Write a comment..." rows="2" maxlength="2000"
                                style="flex: 1; padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px; resize: none; font-size: 14px;"
                                onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();addTicketComment('${escapeHtmlTickets(ticket.id)}');}"></textarea>
                            <button class="btn btn-primary" onclick="addTicketComment('${escapeHtmlTickets(ticket.id)}')" style="align-self: flex-end; height: 38px;">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    closeModal();
    document.getElementById('modals-container').innerHTML = modalHTML;

    // Auto-scroll to bottom of comments
    const commentsList = document.getElementById('ticket-comments-list');
    if (commentsList) commentsList.scrollTop = commentsList.scrollHeight;
}

// Update Status Modal
async function showUpdateTicketStatusModal(ticketId) {
    const tickets = window._allTickets || [];
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const users = await fetchUsersForTickets();
    const userOptions = users.map(u => {
        const selected = u.username === ticket.assigned_to ? 'selected' : '';
        return `<option value="${escapeHtmlTickets(u.username)}" ${selected}>${escapeHtmlTickets(u.fullname || u.username)}</option>`;
    }).join('');

    const statusOptions = Object.entries(TICKET_STATUSES).map(([key, cfg]) => {
        const selected = key === ticket.status ? 'selected' : '';
        return `<option value="${key}" ${selected}>${cfg.label}</option>`;
    }).join('');

    const priorityOptions = Object.entries(TICKET_PRIORITIES).map(([key, cfg]) => {
        const selected = key === ticket.priority ? 'selected' : '';
        return `<option value="${key}" ${selected}>${cfg.label}</option>`;
    }).join('');

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 500px;">
                <div class="modal-header">
                    <h3><i class="fas fa-edit" style="margin-right: 8px;"></i>Update ${escapeHtmlTickets(ticket.ticket_number)}</h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <div style="margin-bottom: 12px;">
                        <label style="font-weight: 600; margin-bottom: 4px; display: block;">Title</label>
                        <input type="text" id="update-ticket-title" value="${escapeHtmlTickets(ticket.title)}" maxlength="200" style="width: 100%; padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px;">
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label style="font-weight: 600; margin-bottom: 4px; display: block;">Description</label>
                        <textarea id="update-ticket-description" rows="3" maxlength="2000" style="width: 100%; padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px; resize: vertical;">${escapeHtmlTickets(ticket.description || '')}</textarea>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                        <div>
                            <label style="font-weight: 600; margin-bottom: 4px; display: block;">Status</label>
                            <select id="update-ticket-status" style="width: 100%; padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px;">
                                ${statusOptions}
                            </select>
                        </div>
                        <div>
                            <label style="font-weight: 600; margin-bottom: 4px; display: block;">Priority</label>
                            <select id="update-ticket-priority" style="width: 100%; padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px;">
                                ${priorityOptions}
                            </select>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
                        <div>
                            <label style="font-weight: 600; margin-bottom: 4px; display: block;">Assigned To</label>
                            <select id="update-ticket-assigned" style="width: 100%; padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px;">
                                <option value="">Unassigned</option>
                                ${userOptions}
                            </select>
                        </div>
                        <div>
                            <label style="font-weight: 600; margin-bottom: 4px; display: block;">Due Date</label>
                            <input type="date" id="update-ticket-due-date" value="${escapeHtmlTickets(ticket.due_date || '')}" style="width: 100%; padding: 8px 12px; border: 1px solid var(--gray-300); border-radius: 6px;">
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; padding: 16px;">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="updateTicket('${escapeHtmlTickets(ticket.id)}')">
                        <i class="fas fa-save" style="margin-right: 4px;"></i> Save Changes
                    </button>
                </div>
            </div>
        </div>
    `;

    closeModal();
    document.getElementById('modals-container').innerHTML = modalHTML;
}

// Update ticket
async function updateTicket(ticketId) {
    const title = (document.getElementById('update-ticket-title')?.value || '').trim();
    const description = (document.getElementById('update-ticket-description')?.value || '').trim();
    const status = document.getElementById('update-ticket-status')?.value || 'open';
    const priority = document.getElementById('update-ticket-priority')?.value || 'medium';
    const assignedTo = document.getElementById('update-ticket-assigned')?.value || '';
    const dueDate = document.getElementById('update-ticket-due-date')?.value || null;

    if (!title) {
        showNotification('Title is required', 'error');
        return;
    }

    // Find old ticket to detect changes
    const oldTicket = (window._allTickets || []).find(t => t.id === ticketId);
    const currentUser = Auth?.user?.username || Auth?.user?.email || 'Unknown';

    const { error } = await supabase
        .from('tickets')
        .update({
            title: title,
            description: description || null,
            status: status,
            priority: priority,
            assigned_to: assignedTo || null,
            due_date: dueDate,
            updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);

    if (error) {
        console.error('Update ticket error:', error);
        showNotification('Failed to update ticket: ' + (error.message || 'Unknown error'), 'error');
        return;
    }

    // Log system comments for changes
    const changes = [];
    if (oldTicket) {
        if (oldTicket.status !== status) {
            const oldLabel = TICKET_STATUSES[oldTicket.status]?.label || oldTicket.status;
            const newLabel = TICKET_STATUSES[status]?.label || status;
            changes.push(`Status changed from ${oldLabel} to ${newLabel} by ${currentUser}`);
        }
        if (oldTicket.priority !== priority) {
            const oldLabel = TICKET_PRIORITIES[oldTicket.priority]?.label || oldTicket.priority;
            const newLabel = TICKET_PRIORITIES[priority]?.label || priority;
            changes.push(`Priority changed from ${oldLabel} to ${newLabel} by ${currentUser}`);
        }
        if ((oldTicket.assigned_to || '') !== (assignedTo || '')) {
            const oldAssign = oldTicket.assigned_to || 'Unassigned';
            const newAssign = assignedTo || 'Unassigned';
            changes.push(`Assigned to changed from ${oldAssign} to ${newAssign} by ${currentUser}`);
        }
    }

    // Insert system comments for each change
    if (changes.length > 0) {
        const systemComments = changes.map(c => ({
            ticket_id: ticketId,
            comment: c,
            created_by: 'System'
        }));
        await supabase.from('ticket_comments').insert(systemComments);
    }

    const statusLabel = TICKET_STATUSES[status]?.label || status;
    showNotification(`Ticket updated — Status: ${statusLabel}`, 'success');
    closeModal();
    loadTickets();
}

// --- Ticket Badge Notification ---
const TICKETS_LAST_SEEN_KEY = 'vts_tickets_last_seen';

function getTicketsLastSeen() {
    return localStorage.getItem(TICKETS_LAST_SEEN_KEY) || '1970-01-01T00:00:00Z';
}

function markTicketsSeen() {
    localStorage.setItem(TICKETS_LAST_SEEN_KEY, new Date().toISOString());
    updateTicketsBadge(0);
}

function updateTicketsBadge(count) {
    const badge = document.getElementById('tickets-badge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.display = '';
    } else {
        badge.style.display = 'none';
    }
}

async function checkTicketUpdates() {
    try {
        const lastSeen = getTicketsLastSeen();

        // Count tickets updated since last seen
        const { count: ticketCount, error: ticketErr } = await supabase
            .from('tickets')
            .select('id', { count: 'exact', head: true })
            .gt('updated_at', lastSeen);

        // Count new comments since last seen
        const { count: commentCount, error: commentErr } = await supabase
            .from('ticket_comments')
            .select('id', { count: 'exact', head: true })
            .gt('created_at', lastSeen);

        const total = (ticketErr ? 0 : (ticketCount || 0)) + (commentErr ? 0 : (commentCount || 0));
        updateTicketsBadge(total);
    } catch (e) {
        // silently ignore
    }
}

// Check for ticket updates every 15 seconds
setInterval(() => {
    if (Auth?.isLoggedIn?.()) {
        // Skip if user is currently on tickets page (they see updates live)
        const activeNav = document.querySelector('.nav-item.active');
        const isOnTicketsPage = activeNav && activeNav.textContent.includes('Tickets');
        if (!isOnTicketsPage) checkTicketUpdates();
    }
}, 15000);

// Initial check after page load
setTimeout(() => {
    if (Auth?.isLoggedIn?.()) checkTicketUpdates();
}, 2000);

// Auto-refresh tickets page every 5 seconds if on Tickets tab
setInterval(() => {
    const activeNav = document.querySelector('.nav-item.active');
    const isOnTicketsPage = activeNav && activeNav.textContent.includes('Tickets');
    if (isOnTicketsPage && typeof loadTickets === 'function') {
        loadTickets();
    }
}, 5000);

// --- Smooth Ticket Table Update ---
async function smoothUpdateTicketsTable() {
    const latestTickets = await fetchTickets();
    if (!Array.isArray(latestTickets)) return;
    // Compare with current DOM rows
    const table = document.querySelector('#tickets-table-container table.data-table');
    if (!table) {
        renderTicketsTable(latestTickets);
        return;
    }
    const tbody = table.querySelector('tbody');
    if (!tbody) {
        renderTicketsTable(latestTickets);
        return;
    }
    // Build a map of ticketId to ticket for quick lookup
    const ticketMap = {};
    latestTickets.forEach(t => { ticketMap[t.id] = t; });
    // Update or add rows
    Array.from(tbody.rows).forEach(row => {
        const viewBtn = row.querySelector('button[onclick^="viewTicketDetail("]');
        const ticketId = viewBtn?.getAttribute('onclick')?.match(/viewTicketDetail\('([^']+)'\)/)?.[1];
        if (!ticketId || !ticketMap[ticketId]) return;
        const ticket = ticketMap[ticketId];
        // Determine latest activity (ticket update or latest comment)
        let latestActivity = ticket.updated_at;
        if (ticket.comments && ticket.comments.length > 0) {
            const lastComment = ticket.comments.reduce((latest, c) => {
                if (!latest) return c;
                return new Date(c.created_at) > new Date(latest.created_at) ? c : latest;
            }, null);
            if (lastComment && new Date(lastComment.created_at) > new Date(latestActivity)) {
                latestActivity = lastComment.created_at;
            }
        }
        const lastViewed = getTicketLastViewed(ticket.id);
        const hasNew = new Date(latestActivity) > new Date(lastViewed);
        // Update only the red dot span
        const titleCell = row.cells[1];
        if (titleCell) {
            // Find or create the red dot span
            let dotSpan = titleCell.querySelector('.ticket-red-dot');
            if (hasNew && !dotSpan) {
                dotSpan = document.createElement('span');
                dotSpan.className = 'ticket-red-dot';
                dotSpan.title = 'New activity';
                dotSpan.style.cssText = 'color: #d32f2f; margin-left: 6px; transition: opacity 0.3s;';
                dotSpan.innerHTML = '<i class="fas fa-circle" style="font-size: 10px;"></i>';
                titleCell.appendChild(dotSpan);
            } else if (!hasNew && dotSpan) {
                dotSpan.style.opacity = '0';
                setTimeout(() => { if (dotSpan && dotSpan.parentNode) dotSpan.remove(); }, 300);
            }
            // Always update the title text (but not the whole cell)
            const baseTitle = escapeHtmlTickets(ticket.title);
            if (titleCell.childNodes[0].nodeType === Node.TEXT_NODE) {
                titleCell.childNodes[0].textContent = baseTitle;
            } else {
                titleCell.insertBefore(document.createTextNode(baseTitle), titleCell.firstChild);
            }
        }
    });
    // If ticket count changed, re-render
    if (tbody.rows.length !== latestTickets.length) {
        renderTicketsTable(latestTickets);
    }
}

// Replace smooth update interval to use granular update
if (window._smoothTicketsInterval) clearInterval(window._smoothTicketsInterval);
window._smoothTicketsInterval = setInterval(() => {
    const activeNav = document.querySelector('.nav-item.active');
    const isOnTicketsPage = activeNav && activeNav.textContent.includes('Tickets');
    if (isOnTicketsPage) ultraGranularUpdateTicketsTable();
}, 30000);

// Expose globally
window.loadTickets = loadTickets;
window.showCreateTicketModal = showCreateTicketModal;
window.createTicket = createTicket;
window.viewTicketDetail = viewTicketDetail;
window.showUpdateTicketStatusModal = showUpdateTicketStatusModal;
window.updateTicket = updateTicket;
window.filterTickets = filterTickets;
window.addTicketComment = addTicketComment;
window.checkTicketUpdates = checkTicketUpdates;
window.previewTicketAttachment = previewTicketAttachment;
window.clearTicketAttachment = clearTicketAttachment;

// Patch: Refresh ticket list after closing modal to update red dot
const _originalCloseModal = window.closeModal || function() {
    // Default closeModal logic if not defined
    const overlays = document.querySelectorAll('.modal-overlay');
    overlays.forEach(o => o.remove());
};
window.closeModal = function() {
    _originalCloseModal();
    // If on tickets page, refresh ticket list to update red dot
    const activeNav = document.querySelector('.nav-item.active');
    const isOnTicketsPage = activeNav && activeNav.textContent.includes('Tickets');
    if (isOnTicketsPage && typeof loadTickets === 'function') {
        setTimeout(() => loadTickets(), 200); // slight delay to allow modal to close
    }
};

// --- Restore and Sync Sidebar Badge ---
// Run checkTicketUpdates every 5 seconds regardless of page, so badge always updates
if (window._sidebarBadgeInterval) clearInterval(window._sidebarBadgeInterval);
window._sidebarBadgeInterval = setInterval(() => {
    if (Auth?.isLoggedIn?.()) checkTicketUpdates();
}, 5000);
// Also run once on page load
if (Auth?.isLoggedIn?.()) checkTicketUpdates();
