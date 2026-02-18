// Users Management Module
async function loadUsers() {
    document.getElementById('header-actions').innerHTML = '';

    const contentEl = document.getElementById('content-body');
    contentEl.innerHTML = `
        <div style="margin-bottom: 24px;">
            <h3>Users Management</h3>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
            <div class="card">
                <div class="card-header">
                    <h3>Create Admin ID</h3>
                </div>
                <div class="card-body">
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Username</label>
                            <input type="text" id="admin-username" placeholder="Enter admin username" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Email</label>
                            <input type="email" id="admin-email" placeholder="Enter admin email" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Password</label>
                            <input type="password" id="admin-password" placeholder="Enter password" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Full Name</label>
                            <input type="text" id="admin-fullname" placeholder="Enter full name" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <button class="btn btn-primary" onclick="createAdminID()">
                            <i class="fas fa-user-shield"></i>
                            Create Admin ID
                        </button>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Create User ID</h3>
                </div>
                <div class="card-body">
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Username</label>
                            <input type="text" id="user-username" placeholder="Enter user username" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Email</label>
                            <input type="email" id="user-email" placeholder="Enter user email" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Password</label>
                            <input type="password" id="user-password" placeholder="Enter password" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Full Name</label>
                            <input type="text" id="user-fullname" placeholder="Enter full name" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <button class="btn btn-primary" onclick="showUserPermissionsModal()">
                            <i class="fas fa-user"></i>
                            Create User ID
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
            <div class="card">
                <div class="card-header">
                    <h3>User Accounts</h3>
                    <div style="display: flex; gap: 12px;">
                        <select id="user-role-filter" onchange="filterUsers()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                            <option value="">All Roles</option>
                            <option value="admin">Admin Only</option>
                            <option value="user">User Only</option>
                        </select>
                        <button class="btn btn-sm btn-secondary" onclick="loadUsers()">
                            <i class="fas fa-refresh"></i>
                            Refresh
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div id="users-list-container"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>Audit Log</h3>
                    <button class="btn btn-sm btn-secondary" onclick="clearAuditLog()" title="Clear Audit Log">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="card-body" style="max-height: 600px; overflow-y: auto;">
                    <div id="audit-log-container"></div>
                </div>
            </div>
        </div>
    `;

    displayUsersList();
    displayAuditLog();
}

function createAdminID() {
    const username = document.getElementById('admin-username')?.value.trim() || '';
    const email = document.getElementById('admin-email')?.value.trim() || '';
    const password = document.getElementById('admin-password')?.value || '';
    const fullname = document.getElementById('admin-fullname')?.value.trim() || '';

    if (!username || !email || !password || !fullname) {
        alert('Please fill in all fields');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    // Check if username already exists
    const users = JSON.parse(localStorage.getItem('USERS_LIST') || '[]');
    if (users.some(u => u.username === username)) {
        alert('Username already exists');
        return;
    }

    const newAdmin = {
        id: generateID('ADMIN'),
        username,
        email,
        password,
        fullname,
        role: 'admin',
        permissions: {
            canViewDashboard: true,
            canManageClients: true,
            canManageVehicles: true,
            canManageInvoices: true,
            canManagePayments: true,
            canViewReports: true,
            canManageUsers: true,
            canViewAudit: true,
            canConfigure: true
        },
        createdAt: new Date().toISOString(),
        status: 'active'
    };

    users.push(newAdmin);
    localStorage.setItem('USERS_LIST', JSON.stringify(users));

    // Log audit action
    logAuditAction('CREATE', 'Admin ID', newAdmin.id, newAdmin.username, `Created admin user: ${fullname}`);

    // Clear form
    document.getElementById('admin-username').value = '';
    document.getElementById('admin-email').value = '';
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-fullname').value = '';

    alert(`Admin ID created successfully!\nID: ${newAdmin.id}\nUsername: ${username}`);
    loadUsers();
}

function showUserPermissionsModal() {
    const username = document.getElementById('user-username')?.value.trim() || '';
    const email = document.getElementById('user-email')?.value.trim() || '';
    const password = document.getElementById('user-password')?.value || '';
    const fullname = document.getElementById('user-fullname')?.value.trim() || '';

    if (!username || !email || !password || !fullname) {
        alert('Please fill in all basic fields first');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    // Store temp user data
    window.tempUserData = { username, email, password, fullname };

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" style="max-height: 80vh; overflow-y: auto;" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>Select User Permissions</h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="perm-dashboard" checked>
                            <label for="perm-dashboard" style="margin: 0; font-weight: 600; cursor: pointer;">View Dashboard</label>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="perm-clients" checked>
                            <label for="perm-clients" style="margin: 0; font-weight: 600; cursor: pointer;">Manage Clients</label>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="perm-vehicles" checked>
                            <label for="perm-vehicles" style="margin: 0; font-weight: 600; cursor: pointer;">Manage Vehicles</label>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="perm-invoices" checked>
                            <label for="perm-invoices" style="margin: 0; font-weight: 600; cursor: pointer;">Manage Invoices</label>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="perm-payments" checked>
                            <label for="perm-payments" style="margin: 0; font-weight: 600; cursor: pointer;">Manage Payments</label>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="perm-reports" checked>
                            <label for="perm-reports" style="margin: 0; font-weight: 600; cursor: pointer;">View Reports</label>
                        </div>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="perm-ledger" checked>
                            <label for="perm-ledger" style="margin: 0; font-weight: 600; cursor: pointer;">View Ledger</label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="createUserIDWithPermissions()">Create User ID</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modals-container').innerHTML = modalHTML;
}

function createUserIDWithPermissions() {
    const tempData = window.tempUserData;
    
    // Get selected permissions
    const permissions = {
        canViewDashboard: document.getElementById('perm-dashboard')?.checked || false,
        canManageClients: document.getElementById('perm-clients')?.checked || false,
        canManageVehicles: document.getElementById('perm-vehicles')?.checked || false,
        canManageInvoices: document.getElementById('perm-invoices')?.checked || false,
        canManagePayments: document.getElementById('perm-payments')?.checked || false,
        canViewReports: document.getElementById('perm-reports')?.checked || false,
        canViewAudit: false,
        canManageUsers: false,
        canConfigure: false
    };

    // Check if username already exists
    const users = JSON.parse(localStorage.getItem('USERS_LIST') || '[]');
    if (users.some(u => u.username === tempData.username)) {
        alert('Username already exists');
        return;
    }

    const newUser = {
        id: generateID('USER'),
        username: tempData.username,
        email: tempData.email,
        password: tempData.password,
        fullname: tempData.fullname,
        role: 'user',
        permissions,
        createdAt: new Date().toISOString(),
        status: 'active'
    };

    users.push(newUser);
    localStorage.setItem('USERS_LIST', JSON.stringify(users));

    // Log audit action
    logAuditAction('CREATE', 'User ID', newUser.id, newUser.username, `Created user: ${tempData.fullname} with limited permissions`);

    // Clear form
    document.getElementById('user-username').value = '';
    document.getElementById('user-email').value = '';
    document.getElementById('user-password').value = '';
    document.getElementById('user-fullname').value = '';

    closeModal();
    alert(`User ID created successfully!\nID: ${newUser.id}\nUsername: ${tempData.username}`);
    loadUsers();
}

function generateID(prefix) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

function filterUsers() {
    displayUsersList();
}

function displayUsersList() {
    const container = document.getElementById('users-list-container');
    const roleFilter = document.getElementById('user-role-filter')?.value || '';
    
    let users = JSON.parse(localStorage.getItem('USERS_LIST') || '[]');

    if (roleFilter) {
        users = users.filter(u => u.role === roleFilter);
    }

    if (users.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: 20px;">No users found</p>';
        return;
    }

    let html = '<div class="table-responsive"><table class="data-table">';
    html += '<thead><tr>';
    html += '<th>User ID</th>';
    html += '<th>Username</th>';
    html += '<th>Full Name</th>';
    html += '<th>Email</th>';
    html += '<th>Role</th>';
    html += '<th>Status</th>';
    html += '<th>Created</th>';
    html += '<th>Actions</th>';
    html += '</tr></thead><tbody>';

    users.forEach(user => {
        const createdDate = new Date(user.createdAt).toLocaleDateString();
        const roleClass = user.role === 'admin' ? 'background: #e3f2fd; color: #1976d2;' : 'background: #f3e5f5; color: #7b1fa2;';
        const statusClass = user.status === 'active' ? 'color: var(--success);' : 'color: var(--danger);';

        html += '<tr>';
        html += `<td><small style="color: var(--gray-600);">${user.id}</small></td>`;
        html += `<td><strong>${user.username}</strong></td>`;
        html += `<td>${user.fullname}</td>`;
        html += `<td>${user.email}</td>`;
        html += `<td><span style="${roleClass}; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${user.role.toUpperCase()}</span></td>`;
        html += `<td style="${statusClass}; font-weight: 600;">${user.status.toUpperCase()}</td>`;
        html += `<td>${createdDate}</td>`;
        html += `<td>
                    <button class="btn btn-sm btn-secondary" onclick="viewUserPermissions('${user.username}')" title="View Permissions">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="toggleUserStatus('${user.username}')" title="Toggle Status">
                        <i class="fas fa-power-off"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUserID('${user.username}')" title="Delete User">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>`;
        html += '</tr>';
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function viewUserPermissions(username) {
    const users = JSON.parse(localStorage.getItem('USERS_LIST') || '[]');
    const user = users.find(u => u.username === username);

    if (!user) return;

    let permsList = '';
    const permissionLabels = {
        canViewDashboard: 'View Dashboard',
        canManageClients: 'Manage Clients',
        canManageVehicles: 'Manage Vehicles',
        canManageInvoices: 'Manage Invoices',
        canManagePayments: 'Manage Payments',
        canViewReports: 'View Reports',
        canViewAudit: 'View Audit',
        canManageUsers: 'Manage Users',
        canConfigure: 'Configure System'
    };

    Object.entries(user.permissions).forEach(([key, value]) => {
        const icon = value ? '<i class="fas fa-check" style="color: var(--success);"></i>' : '<i class="fas fa-times" style="color: var(--danger);"></i>';
        permsList += `<div style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid var(--gray-200);">
            ${icon}
            <span>${permissionLabels[key] || key}</span>
        </div>`;
    });

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>User Permissions: ${user.fullname}</h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 16px; color: var(--gray-600);">
                        <strong>Username:</strong> ${user.username} | 
                        <strong>Role:</strong> ${user.role.toUpperCase()} |
                        <strong>Status:</strong> ${user.status.toUpperCase()}
                    </p>
                    <h4>Permissions:</h4>
                    ${permsList}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modals-container').innerHTML = modalHTML;
}

function toggleUserStatus(username) {
    const users = JSON.parse(localStorage.getItem('USERS_LIST') || '[]');
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) return;

    const oldStatus = users[userIndex].status;
    users[userIndex].status = users[userIndex].status === 'active' ? 'inactive' : 'active';
    const newStatus = users[userIndex].status;
    
    localStorage.setItem('USERS_LIST', JSON.stringify(users));

    // Log audit action
    logAuditAction('UPDATE', 'User Status', users[userIndex].id, username, `Status changed from ${oldStatus} to ${newStatus}`);

    alert(`User status changed to: ${newStatus.toUpperCase()}`);
    loadUsers();
}

function deleteUserID(username) {
    if (!confirm(`Are you sure you want to delete user: ${username}?`)) return;

    let users = JSON.parse(localStorage.getItem('USERS_LIST') || '[]');
    const userToDelete = users.find(u => u.username === username);
    
    users = users.filter(u => u.username !== username);
    localStorage.setItem('USERS_LIST', JSON.stringify(users));

    // Log audit action
    if (userToDelete) {
        logAuditAction('DELETE', 'User ID', userToDelete.id, username, `Deleted user: ${userToDelete.fullname}`);
    }

    alert('User deleted successfully');
    loadUsers();
}

function closeModal() {
    document.getElementById('modals-container').innerHTML = '';
}

function logAuditAction(action, type, userId, username, details) {
    const auditLog = JSON.parse(localStorage.getItem('AUDIT_LOG') || '[]');
    
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || '{}');
    
    const auditEntry = {
        timestamp: new Date().toISOString(),
        action,
        type,
        targetUserId: userId,
        targetUsername: username,
        performedBy: currentUser.username || 'System',
        performedByRole: currentUser.role || 'Unknown',
        details,
        id: generateID('AUDIT')
    };
    
    auditLog.unshift(auditEntry);
    
    // Keep only last 100 audit logs
    if (auditLog.length > 100) {
        auditLog.pop();
    }
    
    localStorage.setItem('AUDIT_LOG', JSON.stringify(auditLog));
}

function displayAuditLog() {
    const container = document.getElementById('audit-log-container');
    if (!container) return;

    const auditLog = JSON.parse(localStorage.getItem('AUDIT_LOG') || '[]');

    if (auditLog.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-500); padding: 20px;">No audit logs yet</p>';
        return;
    }

    let html = '';
    auditLog.slice(0, 50).forEach(entry => {
        const date = new Date(entry.timestamp);
        const timeStr = date.toLocaleTimeString();
        const dateStr = date.toLocaleDateString();
        
        let actionBg = '#e3f2fd';
        let actionColor = '#2563eb';
        
        if (entry.action === 'DELETE') {
            actionBg = '#fee2e2';
            actionColor = '#dc2626';
        } else if (entry.action === 'UPDATE') {
            actionBg = '#fef3c7';
            actionColor = '#d97706';
        } else if (entry.action === 'CREATE') {
            actionBg = '#ecfdf5';
            actionColor = '#059669';
        }

        html += `
            <div style="background: #f9fafb; padding: 12px; border-radius: 6px; border-left: 3px solid ${actionColor}; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <span style="background: ${actionBg}; color: ${actionColor}; padding: 2px 8px; border-radius: 3px; font-weight: 600; font-size: 11px;">
                        ${entry.action}
                    </span>
                    <small style="color: var(--gray-500);">${timeStr}</small>
                </div>
                <p style="margin: 4px 0; font-size: 12px; color: var(--gray-700);">
                    <strong>${entry.type}:</strong> ${entry.targetUsername}
                </p>
                <small style="color: var(--gray-600); display: block; margin: 4px 0;">
                    By: <strong>${entry.performedBy}</strong> (${entry.performedByRole})
                </small>
                <small style="color: var(--gray-500); display: block; margin-top: 4px;">
                    ${entry.details}
                </small>
            </div>
        `;
    });

    container.innerHTML = html;
}

function clearAuditLog() {
    if (!confirm('Are you sure you want to clear the audit log? This cannot be undone.')) return;
    
    localStorage.removeItem('AUDIT_LOG');
    alert('Audit log cleared');
    displayAuditLog();
}

window.loadUsers = loadUsers;
window.createAdminID = createAdminID;
window.showUserPermissionsModal = showUserPermissionsModal;
window.createUserIDWithPermissions = createUserIDWithPermissions;
window.filterUsers = filterUsers;
window.viewUserPermissions = viewUserPermissions;
window.toggleUserStatus = toggleUserStatus;
window.deleteUserID = deleteUserID;
window.logAuditAction = logAuditAction;
window.clearAuditLog = clearAuditLog;
