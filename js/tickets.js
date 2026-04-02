// Tickets Module
var supabase = window.supabaseClient;

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
            <button class="btn btn-primary" onclick="showCreateTicketModal()">
                <i class="fas fa-plus"></i> New Ticket
            </button>
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

        html += '<tr>';
        html += `<td><strong>${escapeHtmlTickets(ticket.ticket_number)}</strong></td>`;
        html += `<td>${escapeHtmlTickets(ticket.title)}</td>`;
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
    document.body.insertAdjacentHTML('beforeend', modalHTML);
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

// View ticket detail
function viewTicketDetail(ticketId) {
    const tickets = window._allTickets || [];
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const statusCfg = TICKET_STATUSES[ticket.status] || TICKET_STATUSES.open;
    const priorityCfg = TICKET_PRIORITIES[ticket.priority] || TICKET_PRIORITIES.medium;
    const dueDate = ticket.due_date ? new Date(ticket.due_date).toLocaleDateString() : '-';
    const createdDate = ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '-';
    const updatedDate = ticket.updated_at ? new Date(ticket.updated_at).toLocaleString() : '-';

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 560px;">
                <div class="modal-header">
                    <h3><i class="fas fa-ticket-alt" style="margin-right: 8px;"></i>${escapeHtmlTickets(ticket.ticket_number)}</h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <h4 style="margin-bottom: 12px;">${escapeHtmlTickets(ticket.title)}</h4>
                    ${ticket.description ? `<p style="color: var(--gray-600); margin-bottom: 16px; white-space: pre-wrap;">${escapeHtmlTickets(ticket.description)}</p>` : ''}
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
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
                        <div style="grid-column: span 2;">
                            <small style="color: var(--gray-500);">Last Updated</small>
                            <div style="font-weight: 600;">${escapeHtmlTickets(updatedDate)}</div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; padding: 16px;">
                    <button class="btn btn-secondary" onclick="closeModal()">Close</button>
                    <button class="btn btn-primary" onclick="showUpdateTicketStatusModal('${escapeHtmlTickets(ticket.id)}')">
                        <i class="fas fa-edit" style="margin-right: 4px;"></i> Update Status
                    </button>
                </div>
            </div>
        </div>
    `;

    closeModal();
    document.body.insertAdjacentHTML('beforeend', modalHTML);
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
    document.body.insertAdjacentHTML('beforeend', modalHTML);
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

    const statusLabel = TICKET_STATUSES[status]?.label || status;
    showNotification(`Ticket updated — Status: ${statusLabel}`, 'success');
    closeModal();
    loadTickets();
}

// Close modal helper
function closeModal() {
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) overlay.remove();
}

// Expose globally
window.loadTickets = loadTickets;
window.showCreateTicketModal = showCreateTicketModal;
window.createTicket = createTicket;
window.viewTicketDetail = viewTicketDetail;
window.showUpdateTicketStatusModal = showUpdateTicketStatusModal;
window.updateTicket = updateTicket;
window.filterTickets = filterTickets;
