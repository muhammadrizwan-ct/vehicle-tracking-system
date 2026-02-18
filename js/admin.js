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
            // Use demo data
            displayUsersTable([
                {
                    id: 1,
                    username: 'admin',
                    email: 'admin@vts.com',
                    role: 'Admin',
                    status: 'Active',
                    lastLogin: '2026-02-12 10:30 AM'
                },
                {
                    id: 2,
                    username: 'manager1',
                    email: 'manager@vts.com',
                    role: 'Manager',
                    status: 'Active',
                    lastLogin: '2026-02-12 09:15 AM'
                },
                {
                    id: 3,
                    username: 'accountant1',
                    email: 'accountant@vts.com',
                    role: 'Accountant',
                    status: 'Active',
                    lastLogin: '2026-02-11 03:45 PM'
                },
                {
                    id: 4,
                    username: 'sales1',
                    email: 'sales@vts.com',
                    role: 'Sales',
                    status: 'Active',
                    lastLogin: '2026-02-10 02:20 PM'
                },
                {
                    id: 5,
                    username: 'viewer1',
                    email: 'viewer@vts.com',
                    role: 'Viewer',
                    status: 'Inactive',
                    lastLogin: '2026-01-15 11:00 AM'
                }
            ]);
        }
        
        // Display sample logs
        displaySystemLogs([
            { timestamp: '2026-02-12 10:45 AM', action: 'User Login', user: 'admin', details: 'Successful login from 192.168.1.1' },
            { timestamp: '2026-02-12 10:30 AM', action: 'Invoice Created', user: 'sales1', details: 'Invoice CT001 created for Connectia Tech' },
            { timestamp: '2026-02-12 09:15 AM', action: 'Payment Recorded', user: 'accountant1', details: 'Payment of PKR 150,000 recorded' },
            { timestamp: '2026-02-12 08:00 AM', action: 'User Login', user: 'manager1', details: 'Successful login from 192.168.1.5' },
            { timestamp: '2026-02-11 05:30 PM', action: 'Report Generated', user: 'viewer1', details: 'Monthly revenue report generated' }
        ]);
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
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
            <button class="btn btn-sm btn-primary" onclick="editUser(${user.id})" style="margin-right: 4px;">Edit</button>
            <button class="btn btn-sm" style="background: var(--gray-200);" onclick="resetUserPassword(${user.id})">Reset PWD</button>
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
