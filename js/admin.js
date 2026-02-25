// --- Supabase Integration ---
const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

// Fetch all users from Supabase
async function fetchUsersFromSupabase() {
    const { data, error } = await supabase
        .from('users')
        .select('*');
    if (error) {
        console.error('Supabase fetch error:', error);
        return [];
    }
    return data || [];
}

// Fetch all audit logs from Supabase
async function fetchAuditLogsFromSupabase() {
    const { data, error } = await supabase
        .from('audit_log')
        .select('*');
    if (error) {
        console.error('Supabase fetch error:', error);
        return [];
    }
    return data || [];
}
// Admin Module
async function loadAdmin() {
    // Clear header actions
    document.getElementById('header-actions').innerHTML = '';
    
    const contentEl = document.getElementById('content-body');
    
    contentEl.innerHTML = `
        <div style="margin-bottom: 24px;">
            <h3>Admin Settings</h3>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
            <div class="card">
                <div class="card-header">
                    <h3>System Users</h3>
                    <button class="btn btn-primary btn-sm" onclick="showAddUserModal()">
                        <i class="fas fa-plus"></i>
                        Add User
                    </button>
                </div>
                <div class="card-body">
                    <div id="users-table-container"></div>
                </div>
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h3>System Configuration</h3>
                </div>
                <div class="card-body">
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Company Name</label>
                            <input type="text" value="Connectia Technologies" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Tax Rate (%)</label>
                            <input type="number" value="19.5" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Currency</label>
                            <input type="text" value="PKR" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Invoice Prefix</label>
                            <input type="text" value="CT" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <button class="btn btn-primary" onclick="saveSysConfig()">Save Configuration</button>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card" style="margin-top: 24px;">
            <div class="card-header">
                <h3>System Logs</h3>
                <button class="btn btn-sm" style="background: var(--gray-200);" onclick="clearLogs()">Clear Logs</button>
            </div>
            <div class="card-body">
                <div id="logs-container"></div>
            </div>
        </div>
    `;
    
    try {
        try {
            const users = await Promise.race([
                API.getUsers(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
            ]);
            displayUsersTable(users);
        } catch (e) {
            displayUsersTable(loadAdminUsersFromStorage());
        }

        displaySystemLogs(loadAdminLogsFromStorage());
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}


// Supabase replaces localStorage for admin users
async function loadAdminUsersFromStorage() {
    const users = await fetchUsersFromSupabase();
    return users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: (user.role || 'User').toString().charAt(0).toUpperCase() + (user.role || 'User').toString().slice(1),
        status: (user.status || 'Inactive').toString().charAt(0).toUpperCase() + (user.status || 'Inactive').toString().slice(1),
        lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'
    }));
}


// Supabase replaces localStorage for admin logs
async function loadAdminLogsFromStorage() {
    const logs = await fetchAuditLogsFromSupabase();
    return logs.map((log) => ({
        timestamp: log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A',
        action: log.action || 'Activity',
        user: log.performedBy || 'System',
        details: log.details || ''
    }));
}

function displayUsersTable(users) {
    const container = document.getElementById('users-table-container');
    
    if (!users || users.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">No users found</p>';
        return;
    }
    
    let html = '<div class="table-responsive"><table class="data-table">';
    html += '<thead><tr>';
    html += '<th>Username</th>';
    html += '<th>Email</th>';
    html += '<th>Role</th>';
    html += '<th>Status</th>';
    html += '<th>Last Login</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';
    
    users.forEach(user => {
        const statusClass = `status-${user.status.toLowerCase()}`;
        
        html += '<tr>';
        html += `<td><strong>${user.username}</strong></td>`;
        html += `<td>${user.email}</td>`;
        html += `<td><span class="badge" style="background: #f3e5f5; color: #7b1fa2;">${user.role}</span></td>`;
        html += `<td><span class="status-badge ${statusClass}">${user.status}</span></td>`;
        html += `<td>${user.lastLogin}</td>`;
        html += `<td>
            <button class="btn btn-sm btn-primary" onclick="editUser('${user.id}')" title="Edit User" style="width: 28px; height: 28px; padding: 0; margin-right: 4px;"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm" style="background: var(--gray-200);" onclick="resetUserPassword('${user.id}')">Reset PWD</button>
        </td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function displaySystemLogs(logs) {
    const container = document.getElementById('logs-container');
    
    if (!logs || logs.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500);">No logs available</p>';
        return;
    }
    
    let html = '<div style="display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto;">';
    
    logs.forEach(log => {
        html += `
            <div style="padding: 12px; border-left: 4px solid #2563eb; background: var(--gray-50);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                    <strong>${log.action}</strong>
                    <small style="color: var(--gray-500);">${log.timestamp}</small>
                </div>
                <div style="font-size: 12px; color: var(--gray-600);">
                    User: <strong>${log.user}</strong> | ${log.details}
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function showAddUserModal() {
    alert('Add User feature - Coming Soon!');
}

function editUser(userId) {
    alert('Edit User ' + userId + ' - Coming Soon!');
}

function resetUserPassword(userId) {
    if (confirm('Are you sure you want to reset password for this user?')) {
        alert('Reset Password for User ' + userId + ' - Coming Soon!');
    }
}

function saveSysConfig() {
    alert('System Configuration saved - Coming Soon!');
}

function clearLogs() {
    if (confirm('Are you sure you want to clear all logs?')) {
        alert('Logs cleared - Coming Soon!');
    }
}
