// Users Management Module
async function loadUsers() {
    document.getElementById('header-actions').innerHTML = '';
    const canCreateUsers = Auth.hasFeaturePermission('users', 'add');
    const canViewAudit = Auth.hasPermission('canViewAudit');

    const contentEl = document.getElementById('content-body');
    contentEl.innerHTML = `
        <div style="margin-bottom: 24px;">
            <h3>Users Management</h3>
        </div>

        ${canCreateUsers ? `
            <div class="card" style="margin-bottom: 24px;">
                <div class="card-header">
                    <h3>Create New ID</h3>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; align-items: end;">
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Username</label>
                            <input type="text" id="account-username" placeholder="Enter username" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Email</label>
                            <input type="email" id="account-email" placeholder="Enter email" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Password</label>
                            <input type="password" id="account-password" placeholder="Enter password" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Full Name</label>
                            <input type="text" id="account-fullname" placeholder="Enter full name" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        </div>
                        <div>
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">ID Type</label>
                            <select id="account-role" style="width: 100%; padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px; margin-bottom: 8px;">
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                            <button class="btn btn-primary" onclick="createAccountID()" style="width: 100%;">
                                <i class="fas fa-id-badge"></i>
                                Create ID
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        ` : ''}

        <div class="card">
            <div class="card-header">
                <h3>User Accounts</h3>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <select id="user-role-filter" onchange="filterUsers()" style="padding: 8px; border: 1px solid var(--gray-300); border-radius: 4px;">
                        <option value="">All Roles</option>
                        <option value="admin">Admin Only</option>
                        <option value="user">User Only</option>
                    </select>
                    ${canViewAudit ? `<button class="btn btn-sm btn-secondary" onclick="showAuditLogModal()">
                        <i class="fas fa-clipboard-list"></i>
                        Audit Log
                    </button>` : ''}
                </div>
            </div>
            <div class="card-body">
                <div id="users-list-container"></div>
            </div>
        </div>
    `;

    displayUsersList();
}

function createAccountID() {
    if (!ensureFeaturePermission('users', 'create')) {
        return;
    }

    const username = document.getElementById('account-username')?.value.trim() || '';
    const email = document.getElementById('account-email')?.value.trim() || '';
    const password = document.getElementById('account-password')?.value || '';
    const fullname = document.getElementById('account-fullname')?.value.trim() || '';
    const role = document.getElementById('account-role')?.value === 'admin' ? 'admin' : 'user';

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

    const permissions = getDefaultUserPermissions(role);

    const newAccount = {
        id: generateAccountID(),
        username,
        email,
        password,
        fullname,
        role,
        permissions,
        createdAt: new Date().toISOString(),
        status: 'active'
    };

    users.push(newAccount);
    localStorage.setItem('USERS_LIST', JSON.stringify(users));

    // Log audit action
    const idType = role === 'admin' ? 'Admin ID' : 'User ID';
    logAuditAction('CREATE', idType, newAccount.id, newAccount.username, `Created ${role} user: ${fullname}`);

    // Clear form
    document.getElementById('account-username').value = '';
    document.getElementById('account-email').value = '';
    document.getElementById('account-password').value = '';
    document.getElementById('account-fullname').value = '';
    document.getElementById('account-role').value = 'user';

    alert(`${role.toUpperCase()} ID created successfully!\nID: ${newAccount.id}\nUsername: ${username}`);
    loadUsers();
}

function getDefaultUserPermissions(role) {
    if ((role || '').toLowerCase() === 'admin') {
        return {
            canViewDashboard: true,
            canManageClients: true,
            canCreateClients: true,
            canManageVehicles: true,
            canCreateVehicles: true,
            canEditVehicles: true,
            canDeleteVehicles: true,
            canManageInvoices: true,
            canManagePayments: true,
            canViewReports: true,
            canViewLedger: true,
            canViewReportsSection: true,
            canManageUsers: true,
            canCreateUsers: true,
            canEditUsers: true,
            canDeleteUsers: true,
            canViewAudit: true,
            canConfigure: true,
            canCreateInvoices: true,
            canEditInvoices: true,
            canGenerateInvoices: true,
            canDownloadInvoicePDF: true,
            canDeleteInvoices: true,
            canEditClients: true,
            canDeleteClients: true,
            canEditData: true,
            canDeleteData: true
        };
    }

    return {
        canViewDashboard: true,
        canManageClients: true,
        canCreateClients: true,
        canManageVehicles: true,
        canCreateVehicles: true,
        canEditVehicles: true,
        canDeleteVehicles: false,
        canManageInvoices: true,
        canManagePayments: true,
        canViewReports: true,
        canViewLedger: true,
        canViewReportsSection: true,
        canViewAudit: false,
        canManageUsers: false,
        canCreateUsers: false,
        canEditUsers: false,
        canDeleteUsers: false,
        canConfigure: false,
        canCreateInvoices: true,
        canEditInvoices: true,
        canGenerateInvoices: true,
        canDownloadInvoicePDF: true,
        canDeleteInvoices: false,
        canEditClients: true,
        canDeleteClients: false,
        canEditData: true,
        canDeleteData: false
    };
}

function generateID(prefix) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

function generateAccountID() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ID-${timestamp}-${random}`;
}

function filterUsers() {
    displayUsersList();
}

function displayUsersList() {
    const container = document.getElementById('users-list-container');
    const roleFilter = document.getElementById('user-role-filter')?.value || '';
    const canEditUsers = Auth.hasFeaturePermission('users', 'edit');
    const canDeleteUsers = Auth.hasFeaturePermission('users', 'delete');
    
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
        html += `<td style="white-space: nowrap;">
            <div style="display: inline-flex; align-items: center; gap: 6px;">`;
        html += `<button class="btn btn-sm btn-secondary" onclick="viewUserPermissions('${user.username}')" title="View Permissions" style="width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                    <i class="fas fa-eye"></i>
                </button>`;
        if (canEditUsers) {
            html += `<button class="btn btn-sm btn-primary" onclick="editUserPermissions('${user.username}')" title="Edit Permissions" style="width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                        <i class="fas fa-user-shield"></i>
                    </button>`;
            html += `<button class="btn btn-sm btn-warning" onclick="toggleUserStatus('${user.username}')" title="Toggle Status" style="width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                        <i class="fas fa-power-off"></i>
                    </button>`;
        }
        if (canDeleteUsers) {
            html += `<button class="btn btn-sm btn-danger" onclick="deleteUserID('${user.username}')" title="Delete User" style="width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                        <i class="fas fa-trash"></i>
                    </button>`;
        }
        html += `</div></td>`;
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
        canCreateClients: 'Clients: Add',
        canEditClients: 'Clients: Edit/Create',
        canDeleteClients: 'Clients: Delete',
        canManageVehicles: 'Manage Vehicles',
        canCreateVehicles: 'Vehicles: Add',
        canEditVehicles: 'Vehicles: Edit',
        canDeleteVehicles: 'Vehicles: Delete',
        canManageInvoices: 'Manage Invoices',
        canCreateInvoices: 'Invoices: Add',
        canEditInvoices: 'Invoices: Edit',
        canGenerateInvoices: 'Invoices: Generate',
        canDownloadInvoicePDF: 'Invoices: Download PDF',
        canDeleteInvoices: 'Invoices: Delete',
        canManagePayments: 'Manage Payments',
        canViewLedger: 'Ledger: View',
        canViewReportsSection: 'Reports: View',
        canViewReports: 'View Reports (Legacy)',
        canViewAudit: 'View Audit',
        canManageUsers: 'Manage Users',
        canCreateUsers: 'Users: Add',
        canEditUsers: 'Users: Edit',
        canDeleteUsers: 'Users: Delete',
        canConfigure: 'Configure System',
        canEditData: 'Edit Data',
        canDeleteData: 'Delete Data'
    };

    const resolvedPermissions = {
        ...getDefaultUserPermissions(user.role),
        ...(user.permissions || {})
    };

    Object.entries(resolvedPermissions).forEach(([key, value]) => {
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
                    ${Auth.hasFeaturePermission('users', 'edit') ? `<button class="btn btn-secondary" onclick="editUserPermissions('${user.username}')">Edit Permissions</button>` : ''}
                    <button class="btn btn-primary" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modals-container').innerHTML = modalHTML;
}

function editUserPermissions(username) {
    if (!ensureFeaturePermission('users', 'edit')) {
        return;
    }

    const users = JSON.parse(localStorage.getItem('USERS_LIST') || '[]');
    const user = users.find(u => u.username === username);

    if (!user) return;

    const defaults = getDefaultUserPermissions(user.role);
    const mergedPermissions = {
        ...defaults,
        ...(user.permissions || {})
    };

    const featureGroups = [
        {
            id: 'dashboard',
            featureKey: 'canViewDashboard',
            featureLabel: 'Dashboard',
            actions: [
                { key: 'canViewDashboard', label: 'View' }
            ]
        },
        {
            id: 'clients',
            featureKey: 'canManageClients',
            featureLabel: 'Clients / Vendors',
            actions: [
                { key: 'canCreateClients', label: 'Add' },
                { key: 'canEditClients', label: 'Edit' },
                { key: 'canDeleteClients', label: 'Delete' }
            ]
        },
        {
            id: 'vehicles',
            featureKey: 'canManageVehicles',
            featureLabel: 'Vehicles',
            actions: [
                { key: 'canCreateVehicles', label: 'Add' },
                { key: 'canEditVehicles', label: 'Edit' },
                { key: 'canDeleteVehicles', label: 'Delete' }
            ]
        },
        {
            id: 'invoices',
            featureKey: 'canManageInvoices',
            featureLabel: 'Invoices',
            actions: [
                { key: 'canCreateInvoices', label: 'Add' },
                { key: 'canEditInvoices', label: 'Edit' },
                { key: 'canDeleteInvoices', label: 'Delete' }
            ]
        },
        {
            id: 'ledger',
            featureKey: 'canViewLedger',
            featureLabel: 'Ledger',
            actions: [
                { key: 'canViewLedger', label: 'View' }
            ]
        },
        {
            id: 'reports',
            featureKey: 'canViewReportsSection',
            featureLabel: 'Reports',
            actions: [
                { key: 'canViewReportsSection', label: 'View' }
            ]
        },
        {
            id: 'users',
            featureKey: 'canManageUsers',
            featureLabel: 'Users',
            actions: [
                { key: 'canCreateUsers', label: 'Add' },
                { key: 'canEditUsers', label: 'Edit' },
                { key: 'canDeleteUsers', label: 'Delete' }
            ]
        },
        {
            id: 'admin',
            featureKey: 'canConfigure',
            featureLabel: 'Admin',
            actions: [
                { key: 'canConfigure', label: 'View' }
            ]
        }
    ];

    const generalPermissionLabels = {
        canManagePayments: 'Manage Payments',
        canGenerateInvoices: 'Invoices: Generate',
        canDownloadInvoicePDF: 'Invoices: Download PDF',
        canViewReports: 'View Reports (Legacy)',
        canViewAudit: 'View Audit',
        canConfigure: 'Configure System',
        canEditData: 'Global Edit Data',
        canDeleteData: 'Global Delete Data'
    };

    let groupedPermissionsHTML = '';
    featureGroups.forEach((group) => {
        const featureChecked = mergedPermissions[group.featureKey] ? 'checked' : '';
        const actionsVisible = mergedPermissions[group.featureKey] ? 'block' : 'none';
        const isSingleActionFeature = group.actions.length === 1 && group.actions[0].key === group.featureKey;

        groupedPermissionsHTML += `
            <div style="border: 1px solid var(--gray-200); border-radius: 6px; margin-bottom: 10px; overflow: hidden;">
                <label style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--gray-50); cursor: pointer; font-weight: 600;">
                    <input type="checkbox" class="permission-checkbox feature-permission-checkbox" data-permission="${group.featureKey}" data-group="${group.id}" ${featureChecked}>
                    <span>${group.featureLabel}</span>
                </label>
                <div id="permission-actions-${group.id}" style="display: ${actionsVisible}; padding: 8px 12px; border-top: 1px solid var(--gray-200); background: white; ${isSingleActionFeature ? 'padding-top: 2px;' : ''}">
                    ${group.actions.map((action) => {
                        const checked = mergedPermissions[action.key] ? 'checked' : '';
                        const isFeatureAction = action.key === group.featureKey;
                        return `
                            <label style="display: flex; align-items: center; gap: 10px; padding: 6px 0; cursor: pointer;">
                                <input type="checkbox" class="permission-checkbox action-permission-checkbox" data-permission="${action.key}" data-parent-group="${group.id}" data-is-feature-action="${isFeatureAction ? '1' : '0'}" ${checked}>
                                <span>${action.label}</span>
                            </label>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    let generalPermissionsHTML = '';
    Object.entries(generalPermissionLabels).forEach(([key, label]) => {
        const checked = mergedPermissions[key] ? 'checked' : '';
        generalPermissionsHTML += `
            <label style="display: flex; align-items: center; gap: 10px; padding: 8px; border-bottom: 1px solid var(--gray-200); cursor: pointer;">
                <input type="checkbox" class="permission-checkbox" data-permission="${key}" ${checked}>
                <span>${label}</span>
            </label>
        `;
    });

    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>Edit Permissions: ${user.fullname}</h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 16px; color: var(--gray-600);">
                        <strong>Username:</strong> ${user.username} |
                        <strong>Role:</strong> ${user.role.toUpperCase()}
                    </p>
                    <div id="edit-permissions-list" style="max-height: 420px; overflow-y: auto;">
                        <h4 style="margin: 0 0 10px 0; font-size: 14px; color: var(--gray-700);">Feature Permissions</h4>
                        ${groupedPermissionsHTML}
                        <h4 style="margin: 14px 0 10px 0; font-size: 14px; color: var(--gray-700);">General Permissions</h4>
                        <div style="border: 1px solid var(--gray-200); border-radius: 6px; overflow: hidden;">
                            ${generalPermissionsHTML}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                    <button class="btn btn-primary" onclick="saveUserPermissions('${user.username}')">Save Permissions</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modals-container').innerHTML = modalHTML;
    initializePermissionGroupToggles();
}

function initializePermissionGroupToggles() {
    const groupToggles = document.querySelectorAll('#edit-permissions-list .feature-permission-checkbox');
    groupToggles.forEach((toggle) => {
        toggle.addEventListener('change', () => {
            const groupId = toggle.getAttribute('data-group');
            const actionsContainer = document.getElementById(`permission-actions-${groupId}`);
            if (!actionsContainer) return;

            if (toggle.checked) {
                actionsContainer.style.display = 'block';
            } else {
                actionsContainer.style.display = 'none';
                actionsContainer.querySelectorAll('.action-permission-checkbox').forEach((actionCheckbox) => {
                    if (actionCheckbox.getAttribute('data-is-feature-action') === '1') {
                        return;
                    }
                    actionCheckbox.checked = false;
                });
            }
        });
    });

    const actionToggles = document.querySelectorAll('#edit-permissions-list .action-permission-checkbox');
    actionToggles.forEach((actionToggle) => {
        actionToggle.addEventListener('change', () => {
            if (!actionToggle.checked) return;

            const parentGroup = actionToggle.getAttribute('data-parent-group');
            const parentToggle = document.querySelector(`#edit-permissions-list .feature-permission-checkbox[data-group="${parentGroup}"]`);
            const actionsContainer = document.getElementById(`permission-actions-${parentGroup}`);

            if (parentToggle) {
                parentToggle.checked = true;
            }
            if (actionsContainer) {
                actionsContainer.style.display = 'block';
            }
        });
    });
}

function saveUserPermissions(username) {
    const users = JSON.parse(localStorage.getItem('USERS_LIST') || '[]');
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) return;

    const updatedPermissions = {};
    document.querySelectorAll('#edit-permissions-list .permission-checkbox').forEach((checkbox) => {
        const permissionKey = checkbox.getAttribute('data-permission');
        updatedPermissions[permissionKey] = checkbox.checked;
    });

    users[userIndex].permissions = updatedPermissions;
    localStorage.setItem('USERS_LIST', JSON.stringify(users));

    syncLoggedInUserPermissions(users[userIndex]);

    logAuditAction('UPDATE', 'User Permissions', users[userIndex].id, username, 'Updated user access permissions');
    closeModal();
    loadUsers();
    showNotification('User permissions updated successfully', 'success');
}

function syncLoggedInUserPermissions(updatedUser) {
    if (!updatedUser) return;

    const currentUser = Auth.getCurrentUser();
    if (!currentUser || currentUser.username !== updatedUser.username) {
        return;
    }

    Auth.user = {
        ...currentUser,
        role: updatedUser.role || currentUser.role,
        permissions: {
            ...(currentUser.permissions || {}),
            ...(updatedUser.permissions || {})
        }
    };
    Auth.applyUserPermissions();
    Auth.saveUser();
    renderSidebar();
}

function toggleUserStatus(username) {
    if (!ensureFeaturePermission('users', 'edit')) {
        return;
    }

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
    if (!ensureFeaturePermission('users', 'delete')) {
        return;
    }

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

function displayAuditLog(containerId = 'audit-log-container') {
    const container = document.getElementById(containerId);
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

function showAuditLogModal() {
    const modalHTML = `
        <div class="modal-overlay" onclick="closeModal()">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width: 900px;">
                <div class="modal-header">
                    <h3>Audit Log</h3>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-sm btn-secondary" onclick="clearAuditLog('audit-log-modal-container')" title="Clear Audit Log">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="modal-close" onclick="closeModal()">×</button>
                    </div>
                </div>
                <div class="modal-body" style="max-height: 65vh; overflow-y: auto;">
                    <div id="audit-log-modal-container"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modals-container').innerHTML = modalHTML;
    displayAuditLog('audit-log-modal-container');
}

function clearAuditLog(containerId = 'audit-log-container') {
    if (!confirm('Are you sure you want to clear the audit log? This cannot be undone.')) return;
    
    localStorage.removeItem('AUDIT_LOG');
    alert('Audit log cleared');
    displayAuditLog(containerId);
}

window.loadUsers = loadUsers;
window.createAccountID = createAccountID;
window.filterUsers = filterUsers;
window.viewUserPermissions = viewUserPermissions;
window.editUserPermissions = editUserPermissions;
window.showAuditLogModal = showAuditLogModal;
window.toggleUserStatus = toggleUserStatus;
window.deleteUserID = deleteUserID;
window.logAuditAction = logAuditAction;
window.clearAuditLog = clearAuditLog;
