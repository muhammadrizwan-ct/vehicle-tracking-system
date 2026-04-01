// --- Supabase Integration ---
var supabase = window.supabaseClient;

function escapeHtmlUsers(value) {
    if (typeof window.escapeHtml === 'function') {
        return window.escapeHtml(value);
    }

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeJsSingleQuote(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function hashPasswordSecure(password) {
    const text = String(password || '');

    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
        const digest = await window.crypto.subtle.digest('SHA-256', new window.TextEncoder().encode(text));
        const hash = Array.from(new Uint8Array(digest))
            .map((byte) => byte.toString(16).padStart(2, '0'))
            .join('');
        return `sha256:${hash}`;
    }

    return `weak:${window.btoa(unescape(encodeURIComponent(text)))}`;
}

// Ensure permissions field is always an object (Supabase may return it as a JSON string)
function parsePermissions(perms) {
    if (!perms) return {};
    if (typeof perms === 'string') {
        try { return JSON.parse(perms); } catch (e) { return {}; }
    }
    return perms;
}

// Fetch all users from Supabase
async function fetchUsersFromSupabase() {
    const { data, error } = await supabase
        .from('users')
        .select('*');
    if (error) {
        console.error('Supabase fetch error:', error);
        return [];
    }
    // Debug: log raw permissions from Supabase
    (data || []).forEach(u => {
        console.log('[fetchUsers] user:', u.username, 'raw permissions type:', typeof u.permissions, 'value:', u.permissions);
    });
    // Normalize permissions to always be an object
    return (data || []).map(u => ({
        ...u,
        permissions: parsePermissions(u.permissions)
    }));
}

// Save (insert) a new user to Supabase
async function saveUserToSupabase(user) {
    const { data, error } = await supabase
        .from('users')
        .insert([user])
        .select('*');
    if (error) {
        console.error('Supabase insert error:', error);
        return { error };
    }
    return data && data[0] ? data[0] : { success: true };
}

// Update an existing user in Supabase by username
async function updateUserInSupabase(username, updates) {
    console.log('[updateUserInSupabase] username:', username, 'updates:', JSON.stringify(updates));
    const { data, error, count } = await supabase
        .from('users')
        .update(updates)
        .eq('username', username)
        .select('*');
    console.log('[updateUserInSupabase] response data:', data, 'error:', error);
    if (error) {
        console.error('Supabase update error:', error);
        return { error };
    }
    if (!data || data.length === 0) {
        console.warn('[updateUserInSupabase] No rows updated — RLS may be blocking or username not found');
        return { error: { message: 'No rows updated. You may not have permission (RLS) or user not found.' } };
    }
    return data[0];
}

// Delete a user from Supabase by username
async function deleteUserFromSupabase(username) {
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('username', username);
    if (error) {
        console.error('Supabase delete error:', error);
        return { error };
    }
    return { success: true };
}
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
            <div style="margin-bottom: 24px;">
                <button class="btn btn-primary" onclick="openCreateIDPage()">
                    <i class="fas fa-id-badge"></i>
                    Create New ID
                </button>
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

    await displayUsersList();
}

function openCreateIDPage() {
    const contentEl = document.getElementById('content-body');
    contentEl.innerHTML = `
        <div style="max-width: 520px; margin: 0 auto;">
            <div style="margin-bottom: 20px;">
                <button class="btn btn-sm btn-secondary" onclick="loadUsers()">
                    <i class="fas fa-arrow-left"></i> Back to Users
                </button>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3>Create New ID</h3>
                </div>
                <div class="card-body">
                    <div style="display: grid; gap: 16px;">
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Full Name *</label>
                            <input type="text" id="account-fullname" placeholder="Enter full name" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 6px; box-sizing: border-box;">
                        </div>
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Username *</label>
                            <input type="text" id="account-username" placeholder="Enter username" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 6px; box-sizing: border-box;">
                        </div>
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Email *</label>
                            <input type="email" id="account-email" placeholder="Enter email address" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 6px; box-sizing: border-box;">
                        </div>
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">Password *</label>
                            <input type="password" id="account-password" placeholder="Minimum 6 characters" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 6px; box-sizing: border-box;">
                        </div>
                        <div class="form-group">
                            <label style="display: block; margin-bottom: 6px; font-weight: 600;">ID Type</label>
                            <select id="account-role" style="width: 100%; padding: 10px; border: 1px solid var(--gray-300); border-radius: 6px; box-sizing: border-box;">
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <button class="btn btn-primary" onclick="createAccountID()" style="width: 100%; padding: 12px; font-size: 15px; margin-top: 4px;">
                            <i class="fas fa-id-badge"></i>
                            Create ID
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    applyInputConstraints({
        'account-username': 'username',
        'account-email': 'email',
        'account-password': 'password',
        'account-fullname': 'name'
    });
}

async function createAccountID() {
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

    const users = await fetchUsersFromSupabase();
    if (users.some((u) => String(u.username || '').toLowerCase() === username.toLowerCase())) {
        alert('Username already exists');
        return;
    }

    // Step 1: Register in Supabase Auth so the user can log in
    const supabaseClient = window.supabaseClient;
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                username,
                fullname,
                role
            }
        }
    });

    if (authError) {
        alert(`Failed to create auth account: ${authError.message}`);
        return;
    }

    // Step 2: Insert into users table
    const permissions = getDefaultUserPermissions(role);
    const now = new Date().toISOString();
    const authUserId = authData?.user?.id || null;

    const candidatePayloads = [
        {
            ...(authUserId ? { auth_user_id: authUserId } : {}),
            username,
            email,
            password: await hashPasswordSecure(password),
            fullname,
            role,
            permissions,
            created_at: now,
            status: 'active'
        },
        {
            ...(authUserId ? { auth_user_id: authUserId } : {}),
            username,
            email,
            password: await hashPasswordSecure(password),
            fullname,
            role,
            permissions,
            createdAt: now,
            status: 'active'
        }
    ];

    let savedUser = null;
    let lastError = null;

    for (const payload of candidatePayloads) {
        const result = await saveUserToSupabase(payload);
        if (result && !result.error) {
            savedUser = result;
            break;
        }
        lastError = result?.error;

        // If error is about a missing column, try removing it
        const msg = String(lastError?.message || '');
        const colMatch = msg.match(/Could not find the '([^']+)' column/i) ||
                         msg.match(/column "([^"]+)" .* does not exist/i);
        if (colMatch) {
            const badCol = colMatch[1];
            const retryPayload = { ...payload };
            delete retryPayload[badCol];
            const retryResult = await saveUserToSupabase(retryPayload);
            if (retryResult && !retryResult.error) {
                savedUser = retryResult;
                break;
            }
            lastError = retryResult?.error;
        }
    }

    if (!savedUser) {
        const errMsg = lastError?.message || 'Unknown error';
        alert(`Failed to create user: ${errMsg}`);
        return;
    }

    const savedId = savedUser?.id || authUserId || '';

    const idType = role === 'admin' ? 'Admin ID' : 'User ID';
    logAuditAction('CREATE', idType, savedId, username, `Created ${role} user: ${fullname}`);

    document.getElementById('account-username').value = '';
    document.getElementById('account-email').value = '';
    document.getElementById('account-password').value = '';
    document.getElementById('account-fullname').value = '';
    document.getElementById('account-role').value = 'user';

    alert(`${role.toUpperCase()} ID created successfully!\nUsername: ${username}`);
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

async function filterUsers() {
    await displayUsersList();
}

async function displayUsersList() {
    const container = document.getElementById('users-list-container');
    const roleFilter = document.getElementById('user-role-filter')?.value || '';
    const canEditUsers = Auth.hasFeaturePermission('users', 'edit');
    const canDeleteUsers = Auth.hasFeaturePermission('users', 'delete');
    
    let users = await fetchUsersFromSupabase();
    // Also sync to localStorage so other functions can access
    localStorage.setItem('USERS_LIST', JSON.stringify(users));

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
        const rawDate = user.createdAt || user.created_at || '';
        const createdDate = rawDate ? new Date(rawDate).toLocaleDateString() : '-';
        const roleClass = user.role === 'admin' ? 'background: #e3f2fd; color: #1976d2;' : 'background: #f3e5f5; color: #7b1fa2;';
        const statusClass = user.status === 'active' ? 'color: var(--success);' : 'color: var(--danger);';
        const safeUsername = escapeHtmlUsers(user.username);
        const safeUsernameJs = escapeJsSingleQuote(user.username);
        const safeFullname = escapeHtmlUsers(user.fullname);
        const safeEmail = escapeHtmlUsers(user.email);
        const safeId = escapeHtmlUsers(user.id);
        const safeRole = escapeHtmlUsers(String(user.role || '').toUpperCase());
        const safeStatus = escapeHtmlUsers(String(user.status || '').toUpperCase());
        const safeCreatedDate = escapeHtmlUsers(createdDate);

        html += '<tr>';
        html += `<td><small style="color: var(--gray-600);">${safeId}</small></td>`;
        html += `<td><strong>${safeUsername}</strong></td>`;
        html += `<td>${safeFullname}</td>`;
        html += `<td>${safeEmail}</td>`;
        html += `<td><span style="${roleClass}; padding: 4px 8px; border-radius: 4px; font-weight: 600;">${safeRole}</span></td>`;
        html += `<td style="${statusClass}; font-weight: 600;">${safeStatus}</td>`;
        html += `<td>${safeCreatedDate}</td>`;
        html += `<td style="white-space: nowrap;">
            <div style="display: inline-flex; align-items: center; gap: 6px;">`;
        html += `<button class="btn btn-sm btn-secondary" onclick="viewUserPermissions('${safeUsernameJs}')" title="View Permissions" style="width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                    <i class="fas fa-eye"></i>
                </button>`;
        if (canEditUsers) {
            html += `<button class="btn btn-sm btn-primary" onclick="editUserPermissions('${safeUsernameJs}')" title="Edit Permissions" style="width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                        <i class="fas fa-user-shield"></i>
                    </button>`;
            html += `<button class="btn btn-sm btn-warning" onclick="toggleUserStatus('${safeUsernameJs}')" title="Toggle Status" style="width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
                        <i class="fas fa-power-off"></i>
                    </button>`;
        }
        if (canDeleteUsers) {
            html += `<button class="btn btn-sm btn-danger" onclick="deleteUserID('${safeUsernameJs}')" title="Delete User" style="width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center;">
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
        ...parsePermissions(user.permissions)
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
                    <h3>User Permissions: ${escapeHtmlUsers(user.fullname)}</h3>
                    <button class="modal-close" onclick="closeModal()">×</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 16px; color: var(--gray-600);">
                        <strong>Username:</strong> ${escapeHtmlUsers(user.username)} | 
                        <strong>Role:</strong> ${escapeHtmlUsers(String(user.role || '').toUpperCase())} |
                        <strong>Status:</strong> ${escapeHtmlUsers(String(user.status || '').toUpperCase())}
                    </p>
                    <h4>Permissions:</h4>
                    ${permsList}
                </div>
                <div class="modal-footer">
                    ${Auth.hasFeaturePermission('users', 'edit') ? `<button class="btn btn-secondary" onclick="editUserPermissions('${escapeJsSingleQuote(user.username)}')">Edit Permissions</button>` : ''}
                    <button class="btn btn-primary" onclick="closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById('modals-container').innerHTML = modalHTML;
}

async function editUserPermissions(username) {
    if (!ensureFeaturePermission('users', 'edit')) {
        return;
    }

    // Fetch fresh from Supabase instead of localStorage
    const allUsers = await fetchUsersFromSupabase();
    const user = allUsers.find(u => u.username === username);

    if (!user) {
        alert('User not found in database');
        return;
    }

    const userPerms = parsePermissions(user.permissions);
    const defaults = getDefaultUserPermissions(user.role);
    const mergedPermissions = {
        ...defaults,
        ...userPerms
    };
    console.log('[editUserPermissions] user:', username, 'role:', user.role);
    console.log('[editUserPermissions] userPerms from Supabase:', JSON.stringify(userPerms));
    console.log('[editUserPermissions] merged:', JSON.stringify(mergedPermissions));

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

var _savingPermissions = false;

async function saveUserPermissions(username) {
    // Guard against double-fire (button click fires twice, second call finds no checkboxes)
    if (_savingPermissions) {
        console.log('[saveUserPermissions] Already saving, skipping duplicate call');
        return;
    }
    _savingPermissions = true;

    try {
        const users = JSON.parse(localStorage.getItem('USERS_LIST') || '[]');
        const userIndex = users.findIndex(u => u.username === username);

        if (userIndex === -1) { _savingPermissions = false; return; }

        const checkboxes = document.querySelectorAll('#edit-permissions-list .permission-checkbox');
        if (checkboxes.length === 0) {
            console.warn('[saveUserPermissions] No checkboxes found — modal already closed, aborting');
            _savingPermissions = false;
            return;
        }

        const updatedPermissions = {};
        checkboxes.forEach((checkbox) => {
            const permissionKey = checkbox.getAttribute('data-permission');
            updatedPermissions[permissionKey] = checkbox.checked;
        });

        // Save to Supabase
        console.log('[saveUserPermissions] Saving for:', username, 'permissions:', JSON.stringify(updatedPermissions));
        const result = await updateUserInSupabase(username, { permissions: updatedPermissions });
        console.log('[saveUserPermissions] Update result:', result);
        if (result?.error) {
            alert(`Failed to save permissions: ${result.error.message}`);
            _savingPermissions = false;
            return;
        }

        // Also update localStorage
        users[userIndex].permissions = updatedPermissions;
        localStorage.setItem('USERS_LIST', JSON.stringify(users));

        syncLoggedInUserPermissions(users[userIndex]);

        logAuditAction('UPDATE', 'User Permissions', users[userIndex].id, username, 'Updated user access permissions');
        closeModal();
        alert('User permissions updated successfully');
        await loadUsers();
    } finally {
        _savingPermissions = false;
    }
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

async function toggleUserStatus(username) {
    if (!ensureFeaturePermission('users', 'edit')) {
        return;
    }

    const users = JSON.parse(localStorage.getItem('USERS_LIST') || '[]');
    const userIndex = users.findIndex(u => u.username === username);

    if (userIndex === -1) return;

    const oldStatus = users[userIndex].status;
    const newStatus = oldStatus === 'active' ? 'inactive' : 'active';

    // Save to Supabase
    const result = await updateUserInSupabase(username, { status: newStatus });
    if (result?.error) {
        alert(`Failed to update status: ${result.error.message}`);
        return;
    }

    users[userIndex].status = newStatus;
    localStorage.setItem('USERS_LIST', JSON.stringify(users));

    logAuditAction('UPDATE', 'User Status', users[userIndex].id, username, `Status changed from ${oldStatus} to ${newStatus}`);

    alert(`User status changed to: ${newStatus.toUpperCase()}`);
    loadUsers();
}

async function deleteUserID(username) {
    if (!ensureFeaturePermission('users', 'delete')) {
        return;
    }

    if (!confirm(`Are you sure you want to delete user: ${username}?`)) return;

    let users = JSON.parse(localStorage.getItem('USERS_LIST') || '[]');
    const userToDelete = users.find(u => u.username === username);

    // Delete from Supabase
    const result = await deleteUserFromSupabase(username);
    if (result?.error) {
        alert(`Failed to delete user: ${result.error.message}`);
        return;
    }

    users = users.filter(u => u.username !== username);
    localStorage.setItem('USERS_LIST', JSON.stringify(users));

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
                        ${escapeHtmlUsers(entry.action)}
                    </span>
                    <small style="color: var(--gray-500);">${escapeHtmlUsers(timeStr)}</small>
                </div>
                <p style="margin: 4px 0; font-size: 12px; color: var(--gray-700);">
                    <strong>${escapeHtmlUsers(entry.type)}:</strong> ${escapeHtmlUsers(entry.targetUsername)}
                </p>
                <small style="color: var(--gray-600); display: block; margin: 4px 0;">
                    By: <strong>${escapeHtmlUsers(entry.performedBy)}</strong> (${escapeHtmlUsers(entry.performedByRole)})
                </small>
                <small style="color: var(--gray-500); display: block; margin-top: 4px;">
                    ${escapeHtmlUsers(entry.details)}
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
window.openCreateIDPage = openCreateIDPage;
window.createAccountID = createAccountID;
window.filterUsers = filterUsers;
window.viewUserPermissions = viewUserPermissions;
window.editUserPermissions = editUserPermissions;
window.saveUserPermissions = saveUserPermissions;
window.showAuditLogModal = showAuditLogModal;
window.toggleUserStatus = toggleUserStatus;
window.deleteUserID = deleteUserID;
window.logAuditAction = logAuditAction;
window.clearAuditLog = clearAuditLog;
