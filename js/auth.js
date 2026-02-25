// Authentication Service
class AuthService {
    constructor() {
        this.user = null;
        this.permissions = null;
    }

    async init() {
        const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
        
        if (token && savedUser) {
            try {
                this.user = JSON.parse(savedUser);
                this.applyUserPermissions();
                
                // Verify token with backend (with timeout)
                try {
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('API timeout')), 3000)
                    );
                    const response = await Promise.race([API.getCurrentUser(), timeoutPromise]);
                    if (response.user) {
                        this.user = response.user;
                        this.applyUserPermissions();
                        this.saveUser();
                    }
                } catch (apiError) {
                    // Backend not available, continue with saved user
                    console.warn('API verification failed:', apiError.message);
                }
            } catch (error) {
                this.logout();
            }
        }
    }

    async login(username, password) {
        try {
            try {
                // Try API login with timeout
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('API timeout')), 3000)
                );
                const response = await Promise.race([API.login(username, password), timeoutPromise]);
                this.user = response.user;
                this.applyUserPermissions();
                this.saveUser();
                return { success: true, user: this.user };
            } catch (apiError) {
                // Backend not available - allow demo login
                console.warn('API login failed, using demo mode:', apiError.message);

                const storedAccount = this.getStoredUserByCredentials(username, password);
                if (storedAccount) {
                    const status = String(storedAccount.status || 'active').toLowerCase();
                    if (status !== 'active') {
                        throw new Error('Your account is inactive. Please contact admin.');
                    }

                    this.user = this.buildSessionUserFromStoredAccount(storedAccount);
                    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'local-token-' + Date.now());
                    this.applyUserPermissions();
                    this.saveUser();
                    return { success: true, user: this.user };
                }

                if (username.toLowerCase() === 'demo' && password === 'demo') {
                    this.user = {
                        id: 1,
                        username: 'demo',
                        email: 'demo@example.com',
                        role: 'Admin',
                        name: 'Demo User',
                        permissions: {
                            canGenerateInvoices: true,
                            canDownloadInvoicePDF: true,
                            canDeleteInvoices: true,
                            canEditClients: true,
                            canDeleteClients: true,
                            canEditData: true,
                            canDeleteData: true
                        }
                    };
                    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'demo-token-' + Date.now());
                    this.applyUserPermissions();
                    this.saveUser();
                    return { success: true, user: this.user };
                }
                throw new Error('Invalid credentials');
            }
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async logout() {
        try {
            await API.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
            window.location.href = 'index.html';
        }
    }

    saveUser() {
        if (this.user) {
            localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(this.user));
        }
    }

    clearAuth() {
        this.user = null;
        this.permissions = null;
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
    }

    getStoredUserAccount(username) {
        if (!username) return null;

        try {
            const users = JSON.parse(localStorage.getItem('USERS_LIST') || '[]');
            return users.find((item) => String(item.username || '').toLowerCase() === String(username).toLowerCase()) || null;
        } catch (error) {
            return null;
        }
    }

    getStoredUserByCredentials(loginId, password) {
        if (!loginId || !password) return null;

        try {
            const users = JSON.parse(localStorage.getItem('USERS_LIST') || '[]');
            const normalizedLoginId = String(loginId).trim().toLowerCase();

            return users.find((item) => {
                const usernameMatch = String(item.username || '').toLowerCase() === normalizedLoginId;
                const emailMatch = String(item.email || '').toLowerCase() === normalizedLoginId;
                const passwordMatch = String(item.password || '') === String(password);
                return (usernameMatch || emailMatch) && passwordMatch;
            }) || null;
        } catch (error) {
            return null;
        }
    }

    buildSessionUserFromStoredAccount(storedAccount) {
        if (!storedAccount) return null;

        return {
            id: storedAccount.id,
            username: storedAccount.username,
            email: storedAccount.email,
            role: storedAccount.role,
            fullname: storedAccount.fullname,
            name: storedAccount.fullname || storedAccount.username,
            status: storedAccount.status,
            permissions: {
                ...(storedAccount.permissions || {})
            }
        };
    }

    applyUserPermissions() {
        if (!this.user) return;

        const storedAccount = this.getStoredUserAccount(this.user.username);
        if (storedAccount) {
            this.user = {
                ...this.user,
                role: storedAccount.role || this.user.role,
                permissions: {
                    ...(this.user.permissions || {}),
                    ...(storedAccount.permissions || {})
                }
            };
        }

        this.setPermissions(this.user.role, this.user.permissions);
    }

    getDefaultPermissions(role) {
        const normalizedRole = (role || '').toString().toLowerCase();

        switch(normalizedRole) {
            case 'admin':
                return {
                    canManageUsers: true,
                    canManageClients: true,
                    canManageVehicles: true,
                    canManageInvoices: true,
                    canManagePayments: true,
                    canViewReports: true,
                    canViewLedger: true,
                    canViewReportsSection: true,
                    canViewDashboard: true,
                    canViewAudit: true,
                    canConfigure: true,
                    canCreateUsers: true,
                    canEditUsers: true,
                    canDeleteUsers: true,
                    canGenerateInvoices: true,
                    canCreateInvoices: true,
                    canEditInvoices: true,
                    canDownloadInvoicePDF: true,
                    canDeleteInvoices: true,
                    canCreateVehicles: true,
                    canEditVehicles: true,
                    canDeleteVehicles: true,
                    canCreateClients: true,
                    canEditClients: true,
                    canDeleteClients: true,
                    canEditData: true,
                    canDeleteData: true
                };
            case 'manager':
                return {
                    canManageUsers: false,
                    canManageClients: true,
                    canManageVehicles: true,
                    canManageInvoices: true,
                    canManagePayments: true,
                    canViewReports: true,
                    canViewLedger: true,
                    canViewReportsSection: true,
                    canViewDashboard: true,
                    canViewAudit: false,
                    canConfigure: false,
                    canCreateUsers: false,
                    canEditUsers: false,
                    canDeleteUsers: false,
                    canGenerateInvoices: true,
                    canCreateInvoices: true,
                    canEditInvoices: true,
                    canDownloadInvoicePDF: true,
                    canDeleteInvoices: false,
                    canCreateVehicles: true,
                    canEditVehicles: true,
                    canDeleteVehicles: false,
                    canCreateClients: true,
                    canEditClients: true,
                    canDeleteClients: false,
                    canEditData: true,
                    canDeleteData: false
                };
            case 'accountant':
                return {
                    canManageUsers: false,
                    canManageClients: false,
                    canManageVehicles: false,
                    canManageInvoices: true,
                    canManagePayments: true,
                    canViewReports: true,
                    canViewLedger: true,
                    canViewReportsSection: true,
                    canViewDashboard: true,
                    canViewAudit: false,
                    canConfigure: false,
                    canCreateUsers: false,
                    canEditUsers: false,
                    canDeleteUsers: false,
                    canGenerateInvoices: true,
                    canCreateInvoices: true,
                    canEditInvoices: true,
                    canDownloadInvoicePDF: true,
                    canDeleteInvoices: false,
                    canCreateVehicles: false,
                    canEditVehicles: false,
                    canDeleteVehicles: false,
                    canCreateClients: false,
                    canEditClients: false,
                    canDeleteClients: false,
                    canEditData: true,
                    canDeleteData: false
                };
            case 'sales':
                return {
                    canManageUsers: false,
                    canManageClients: true,
                    canManageVehicles: true,
                    canManageInvoices: false,
                    canManagePayments: false,
                    canViewReports: true,
                    canViewLedger: true,
                    canViewReportsSection: true,
                    canViewDashboard: true,
                    canViewAudit: false,
                    canConfigure: false,
                    canCreateUsers: false,
                    canEditUsers: false,
                    canDeleteUsers: false,
                    canGenerateInvoices: false,
                    canCreateInvoices: false,
                    canEditInvoices: false,
                    canDownloadInvoicePDF: false,
                    canDeleteInvoices: false,
                    canCreateVehicles: true,
                    canEditVehicles: true,
                    canDeleteVehicles: false,
                    canCreateClients: true,
                    canEditClients: true,
                    canDeleteClients: false,
                    canEditData: true,
                    canDeleteData: false
                };
            case 'viewer':
            case 'user':
                return {
                    canManageUsers: false,
                    canManageClients: false,
                    canManageVehicles: false,
                    canManageInvoices: false,
                    canManagePayments: false,
                    canViewReports: true,
                    canViewLedger: true,
                    canViewReportsSection: true,
                    canViewDashboard: true,
                    canViewAudit: false,
                    canConfigure: false,
                    canCreateUsers: false,
                    canEditUsers: false,
                    canDeleteUsers: false,
                    canGenerateInvoices: false,
                    canCreateInvoices: false,
                    canEditInvoices: false,
                    canDownloadInvoicePDF: false,
                    canDeleteInvoices: false,
                    canCreateVehicles: false,
                    canEditVehicles: false,
                    canDeleteVehicles: false,
                    canCreateClients: false,
                    canEditClients: false,
                    canDeleteClients: false,
                    canEditData: false,
                    canDeleteData: false
                };
            default:
                return {};
        }
    }

    setPermissions(role, customPermissions = null) {
        const defaults = this.getDefaultPermissions(role);
        const custom = customPermissions && typeof customPermissions === 'object' ? customPermissions : {};
        this.permissions = {
            ...defaults,
            ...custom
        };

        if (typeof this.permissions.canCreateInvoices !== 'boolean') {
            this.permissions.canCreateInvoices = this.permissions.canGenerateInvoices === true;
        }
        if (typeof this.permissions.canGenerateInvoices !== 'boolean') {
            this.permissions.canGenerateInvoices = this.permissions.canCreateInvoices === true;
        }
        if (typeof this.permissions.canCreateClients !== 'boolean') {
            this.permissions.canCreateClients = this.permissions.canEditClients === true;
        }

        if (typeof this.permissions.canViewLedger !== 'boolean') {
            this.permissions.canViewLedger = this.permissions.canViewReports === true;
        }
        if (typeof this.permissions.canViewReportsSection !== 'boolean') {
            this.permissions.canViewReportsSection = this.permissions.canViewReports === true;
        }
    }

    isLoggedIn() {
        return !!this.user && !!localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    }

    hasPermission(permission) {
        return this.permissions && this.permissions[permission] === true;
    }

    hasDataActionPermission(actionType) {
        const permissionKey = actionType === 'delete' ? 'canDeleteData' : 'canEditData';
        return this.hasPermission(permissionKey);
    }

    getFeaturePermissionKey(feature, actionType) {
        const featureKey = (feature || '').toLowerCase();
        const actionKey = (actionType || '').toLowerCase();

        const scopedMap = {
            dashboard: {
                view: 'canViewDashboard'
            },
            invoices: {
                add: 'canCreateInvoices',
                generate: 'canGenerateInvoices',
                edit: 'canEditInvoices',
                download: 'canDownloadInvoicePDF',
                delete: 'canDeleteInvoices'
            },
            clients: {
                add: 'canCreateClients',
                create: 'canCreateClients',
                edit: 'canEditClients',
                delete: 'canDeleteClients'
            },
            vehicles: {
                add: 'canCreateVehicles',
                create: 'canCreateVehicles',
                edit: 'canEditVehicles',
                delete: 'canDeleteVehicles'
            },
            ledger: {
                view: 'canViewLedger'
            },
            reports: {
                view: 'canViewReportsSection'
            },
            users: {
                add: 'canCreateUsers',
                create: 'canCreateUsers',
                edit: 'canEditUsers',
                delete: 'canDeleteUsers'
            },
            admin: {
                view: 'canConfigure'
            }
        };

        return scopedMap[featureKey]?.[actionKey] || null;
    }

    hasFeaturePermission(feature, actionType = 'edit') {
        const scopedPermission = this.getFeaturePermissionKey(feature, actionType);
        if (scopedPermission) {
            return this.hasPermission(scopedPermission);
        }

        if ((actionType || '').toLowerCase() === 'delete') {
            return this.hasDataActionPermission('delete');
        }

        return this.hasDataActionPermission('edit');
    }

    getCurrentUser() {
        return this.user;
    }

    async changePassword(currentPassword, newPassword) {
        try {
            await API.changePassword(currentPassword, newPassword);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

function ensureDataActionPermission(actionType = 'edit') {
    if (Auth.hasDataActionPermission(actionType)) {
        return true;
    }

    const actionLabel = actionType === 'delete' ? 'delete' : 'edit';
    showNotification(`You do not have permission to ${actionLabel} data`, 'error');
    return false;
}

function ensureFeaturePermission(feature, actionType = 'edit') {
    if (Auth.hasFeaturePermission(feature, actionType)) {
        return true;
    }

    const featureNameMap = {
        invoices: 'Invoices',
        clients: 'Clients'
    };
    const actionNameMap = {
        create: 'create',
        edit: 'edit',
        delete: 'delete',
        generate: 'generate',
        download: 'download'
    };

    const featureLabel = featureNameMap[(feature || '').toLowerCase()] || 'this feature';
    const actionLabel = actionNameMap[(actionType || '').toLowerCase()] || 'perform this action';
    showNotification(`You do not have permission to ${actionLabel} in ${featureLabel}`, 'error');
    return false;
}

// Create global auth instance
const Auth = new AuthService();

// Login function
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorEl = document.getElementById('login-error');

    if (!username || !password) {
        errorEl.textContent = 'Please enter username and password';
        errorEl.classList.remove('hidden');
        return;
    }

    errorEl.classList.add('hidden');
    
    const result = await Auth.login(username, password);
    
    if (result.success) {
        showNotification('Login successful!', 'success');
        initializeApp();
    } else {
        errorEl.textContent = result.message;
        errorEl.classList.remove('hidden');
    }
}

// Logout function
async function logout() {
    const confirm = await showConfirm('Are you sure you want to logout?');
    if (confirm) {
        await Auth.logout();
    }
}

window.ensureDataActionPermission = ensureDataActionPermission;
window.ensureFeaturePermission = ensureFeaturePermission;

// Initialize application after login
function initializeApp() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('main-layout').classList.remove('hidden');
    document.getElementById('loading-screen').classList.add('hidden');
    
    updateUserInfo();
    renderSidebar();
    loadPage('dashboard');
}

// Update user info in sidebar
function updateUserInfo() {
    const user = Auth.getCurrentUser();
    const userInfoEl = document.getElementById('user-info');
    
    if (user) {
        const displayName = user.name || user.fullname || user.username || 'User';
        const displayRole = user.role || 'User';
        userInfoEl.innerHTML = `
            <div class="user-avatar">${displayName.charAt(0)}</div>
            <div class="user-details">
                <h4>${displayName}</h4>
                <p>${displayRole}</p>
            </div>
        `;
    }
}

// Render sidebar navigation based on permissions
function renderSidebar() {
    const navEl = document.getElementById('sidebar-nav');
    const permissions = Auth.permissions;
    
    console.log('DEBUG renderSidebar - permissions:', permissions);
    console.log('DEBUG renderSidebar - Auth.user:', Auth.user);
    
    let navItems = [
        { icon: 'fa-chart-pie', text: 'Dashboard', page: 'dashboard', permission: 'canViewDashboard' },
        { icon: 'fa-users', text: 'Clients/Vendors', page: 'clients', permission: 'canManageClients' },
        { icon: 'fa-car', text: 'Vehicles', page: 'vehicles', permission: 'canManageVehicles' },
        {
            icon: 'fa-file-invoice',
            text: 'Invoices',
            page: 'invoices',
            permission: 'canManageInvoices',
            children: [
                { icon: 'fa-file-invoice', text: 'Client Invoices', page: 'invoices-client' },
                { icon: 'fa-truck', text: 'Vendor Invoices', page: 'invoices-vendor' }
            ]
        },
        {
            icon: 'fa-money-bill',
            text: 'Payments',
            page: 'payments',
            permission: 'canManagePayments',
            children: [
                { icon: 'fa-users', text: 'Client Payments', page: 'payments-client' },
                { icon: 'fa-truck', text: 'Vendor Payments', page: 'payments-vendor' },
                { icon: 'fa-receipt', text: 'Expenses', page: 'payments-expenses' }
            ]
        },
        {
            icon: 'fa-book',
            text: 'Ledger',
            page: 'ledger',
            permission: 'canViewLedger',
            children: [
                { icon: 'fa-users', text: 'Client Ledger', page: 'ledger-client' },
                { icon: 'fa-truck', text: 'Vendor Ledger', page: 'ledger-vendor' },
                { icon: 'fa-building-columns', text: 'Bank Ledger', page: 'ledger-bank' }
            ]
        },
        { icon: 'fa-chart-line', text: 'Reports', page: 'reports', permission: 'canViewReportsSection' },
        { icon: 'fa-user-gear', text: 'Users', page: 'users', permission: 'canManageUsers' }
    ];
    
    // Add admin items
    if (permissions && (permissions.canManageUsers || permissions.canViewAudit || permissions.canConfigure)) {
        navItems.push({ icon: 'fa-cog', text: 'Admin', page: 'admin', permission: 'canConfigure' });
    }
    
    let html = '';
    navItems.forEach(item => {
        if (permissions && (permissions[item.permission] || item.permission === 'canViewDashboard')) {
            if (item.children && item.children.length > 0) {
                html += `
                    <div class="nav-item nav-parent" data-page="${item.page}" onclick="toggleSidebarSubmenu('${item.page}', '${item.children[0].page}')">
                        <i class="fas ${item.icon}"></i>
                        <span>${item.text}</span>
                        <i class="fas fa-chevron-down nav-caret" id="${item.page}-caret"></i>
                    </div>
                    <div class="nav-submenu" id="${item.page}-submenu">
                        ${item.children.map(child => `
                            <div class="nav-item nav-subitem" data-page="${child.page}" onclick="event.stopPropagation(); window.location.hash = '#/${child.page}'">
                                <i class="fas ${child.icon}"></i>
                                <span>${child.text}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
                return;
            }

            html += `
                <div class="nav-item" data-page="${item.page}" onclick="window.location.hash = '#/${item.page}'">
                    <i class="fas ${item.icon}"></i>
                    <span>${item.text}</span>
                </div>
            `;
        }
    });
    
    navEl.innerHTML = html;
    
    // Set active state
    const currentPage = sessionStorage.getItem('currentPage') || 'dashboard';
    setActiveNavItem(currentPage);
}

// Set active navigation item
function setActiveNavItem(page) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });

    const parentPages = ['invoices', 'payments', 'ledger'];
    parentPages.forEach((parentPage) => {
        const submenu = document.getElementById(`${parentPage}-submenu`);
        const caret = document.getElementById(`${parentPage}-caret`);
        const isInGroup = page === parentPage || page.startsWith(`${parentPage}-`);
        if (submenu) {
            submenu.classList.toggle('open', isInGroup);
        }
        if (caret) {
            caret.classList.toggle('open', isInGroup);
        }
    });

    navItems.forEach(item => {
        const itemPage = item.getAttribute('data-page');
        if (itemPage === page) {
            item.classList.add('active');
        }
    });

    parentPages.forEach((parentPage) => {
        const isInGroup = page === parentPage || page.startsWith(`${parentPage}-`);
        if (!isInGroup) return;

        const parentEl = document.querySelector(`.nav-item.nav-parent[data-page="${parentPage}"]`);
        if (parentEl) {
            parentEl.classList.add('active');
        }

        if (page === parentPage) {
            const defaultSubItem = document.querySelector(`.nav-item.nav-subitem[data-page="${parentPage}-client"]`);
            if (defaultSubItem) {
                defaultSubItem.classList.add('active');
            }
        }
    });
}

function toggleSidebarSubmenu(parentPage, defaultPage) {
    const currentPage = sessionStorage.getItem('currentPage') || 'dashboard';
    const submenu = document.getElementById(`${parentPage}-submenu`);
    const caret = document.getElementById(`${parentPage}-caret`);

    if (!submenu) return;

    const isOpen = submenu.classList.contains('open');
    submenu.classList.toggle('open', !isOpen);
    if (caret) {
        caret.classList.toggle('open', !isOpen);
    }

    if (!isOpen && !(currentPage === parentPage || currentPage.startsWith(`${parentPage}-`))) {
        loadPage(defaultPage);
    }
}

// Load page content
async function loadPage(page) {
    // Expose loadPage globally for SPA routing
    window.loadPage = loadPage;
    sessionStorage.setItem('currentPage', page);
    setActiveNavItem(page);
    
    const pageTitleMap = {
        clients: 'Clients/Vendors',
        'invoices-client': 'Client Invoices',
        'invoices-vendor': 'Vendor Invoices',
        'payments-client': 'Client Payments',
        'payments-vendor': 'Vendor Payments',
        'payments-expenses': 'Expenses',
        'ledger-client': 'Client Ledger',
        'ledger-vendor': 'Vendor Ledger',
        'ledger-bank': 'Bank Ledger'
    };
    const pageTitle = pageTitleMap[page] || capitalizeFirst(page);
    document.getElementById('page-title').innerHTML = `<h2>${pageTitle}</h2>`;
    
    switch(page) {
        case 'dashboard':
            await loadDashboard();
            break;
        case 'clients':
            await loadClients();
            break;
        case 'vehicles':
            await loadVehicles();
            break;
        case 'invoices':
            await loadInvoices('client');
            break;
        case 'invoices-client':
            await loadInvoices('client');
            break;
        case 'invoices-vendor':
            await loadInvoices('vendor');
            break;
        case 'payments':
            await loadPayments('client');
            break;
        case 'payments-client':
            await loadPayments('client');
            break;
        case 'payments-vendor':
            await loadPayments('vendor');
            break;
        case 'payments-expenses':
            await loadPayments('expenses');
            break;
        case 'ledger':
            await loadLedger('client');
            break;
        case 'ledger-client':
            await loadLedger('client');
            break;
        case 'ledger-vendor':
            await loadLedger('vendor');
            break;
        case 'ledger-bank':
            await loadLedger('bank');
            break;
        case 'reports':
            await loadReports();
            break;
        case 'users':
            if (!Auth.hasPermission('canManageUsers')) {
                showNotification('You do not have permission to access Users', 'error');
                return;
            }
            await loadUsers();
            break;
        case 'admin':
            if (!Auth.hasPermission('canConfigure')) {
                showNotification('You do not have permission to access Admin', 'error');
                return;
            }
            await loadAdmin();
            break;
    }
}

// Utility functions
function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

async function showConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>Confirm Action</h3>
                    <span class="close-btn" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="this.closest('.modal').dataset.confirm = 'true'">Confirm</button>
                </div>
            </div>
        `;
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                resolve(false);
            }
        });
        
        modal.querySelector('.btn-primary').addEventListener('click', () => {
            modal.remove();
            resolve(true);
        });
        
        modal.querySelector('.btn-secondary').addEventListener('click', () => {
            modal.remove();
            resolve(false);
        });
        
        document.getElementById('modals-container').appendChild(modal);
    });
}

function showModal(title, content, onSave = null) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    let footerHtml = '';
    if (onSave) {
        footerHtml = `
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                <button class="btn btn-primary" id="save-modal-btn">Save</button>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <span class="close-btn" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            ${footerHtml}
        </div>
    `;
    
    if (onSave) {
        modal.querySelector('#save-modal-btn').addEventListener('click', async () => {
            await onSave(modal);
            modal.remove();
        });
    }
    
    document.getElementById('modals-container').appendChild(modal);
}

function formatPKR(amount) {
    return CONFIG.CURRENCY + (parseFloat(amount) || 0).toLocaleString('en-PK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-PK', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('en-PK', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_STATE, sidebar.classList.contains('collapsed'));
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    if (typeof runOneTimeDataReset === 'function') {
        runOneTimeDataReset();
    }

    await Auth.init();
    
    if (Auth.isLoggedIn()) {
        initializeApp();
    } else {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('login-page').classList.remove('hidden');
    }
    
    // Restore sidebar state
    const sidebarState = localStorage.getItem(STORAGE_KEYS.SIDEBAR_STATE);
    if (sidebarState === 'true') {
        document.getElementById('sidebar').classList.add('collapsed');
    }
});