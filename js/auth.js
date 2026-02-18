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
                this.setPermissions(this.user.role);
                
                // Verify token with backend (with timeout)
                try {
                    const timeoutPromise = new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('API timeout')), 3000)
                    );
                    const response = await Promise.race([API.getCurrentUser(), timeoutPromise]);
                    if (response.user) {
                        this.user = response.user;
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
                this.saveUser();
                this.setPermissions(this.user.role);
                return { success: true, user: this.user };
            } catch (apiError) {
                // Backend not available - allow demo login
                console.warn('API login failed, using demo mode:', apiError.message);
                if (username.toLowerCase() === 'demo' && password === 'demo') {
                    this.user = {
                        id: 1,
                        username: 'demo',
                        email: 'demo@example.com',
                        role: 'Admin',
                        name: 'Demo User'
                    };
                    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'demo-token-' + Date.now());
                    this.saveUser();
                    this.setPermissions(this.user.role);
                    return { success: true, user: this.user };
                }
                throw new Error('Invalid credentials (Try demo/demo)');
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
            window.location.href = '/';
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

    setPermissions(role) {
        switch(role) {
            case 'Admin':
                this.permissions = {
                    canManageUsers: true,
                    canManageClients: true,
                    canManageVehicles: true,
                    canManageInvoices: true,
                    canManagePayments: true,
                    canViewReports: true,
                    canViewDashboard: true,
                    canViewAudit: true,
                    canConfigure: true
                };
                break;
            case 'Manager':
                this.permissions = {
                    canManageUsers: false,
                    canManageClients: true,
                    canManageVehicles: true,
                    canManageInvoices: true,
                    canManagePayments: true,
                    canViewReports: true,
                    canViewDashboard: true,
                    canViewAudit: false,
                    canConfigure: false
                };
                break;
            case 'Accountant':
                this.permissions = {
                    canManageUsers: false,
                    canManageClients: false,
                    canManageVehicles: false,
                    canManageInvoices: true,
                    canManagePayments: true,
                    canViewReports: true,
                    canViewDashboard: true,
                    canViewAudit: false,
                    canConfigure: false
                };
                break;
            case 'Sales':
                this.permissions = {
                    canManageUsers: false,
                    canManageClients: true,
                    canManageVehicles: true,
                    canManageInvoices: false,
                    canManagePayments: false,
                    canViewReports: true,
                    canViewDashboard: true,
                    canViewAudit: false,
                    canConfigure: false
                };
                break;
            case 'Viewer':
                this.permissions = {
                    canManageUsers: false,
                    canManageClients: false,
                    canManageVehicles: false,
                    canManageInvoices: false,
                    canManagePayments: false,
                    canViewReports: true,
                    canViewDashboard: true,
                    canViewAudit: false,
                    canConfigure: false
                };
                break;
            default:
                this.permissions = {};
        }
    }

    isLoggedIn() {
        return !!this.user && !!localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    }

    hasPermission(permission) {
        return this.permissions && this.permissions[permission] === true;
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
        userInfoEl.innerHTML = `
            <div class="user-avatar">${user.name.charAt(0)}</div>
            <div class="user-details">
                <h4>${user.name}</h4>
                <p>${user.role}</p>
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
        { icon: 'fa-users', text: 'Clients', page: 'clients', permission: 'canManageClients' },
        { icon: 'fa-car', text: 'Vehicles', page: 'vehicles', permission: 'canManageVehicles' },
        { icon: 'fa-file-invoice', text: 'Invoices', page: 'invoices', permission: 'canManageInvoices' },
        { icon: 'fa-money-bill', text: 'Payments', page: 'payments', permission: 'canManagePayments' },
        { icon: 'fa-book', text: 'Ledger', page: 'ledger', permission: 'canViewReports' },
        { icon: 'fa-chart-line', text: 'Reports', page: 'reports', permission: 'canViewReports' },
        { icon: 'fa-user-gear', text: 'Users', page: 'users', permission: 'canManageUsers' }
    ];
    
    // Add admin items
    if (permissions && (permissions.canManageUsers || permissions.canViewAudit || permissions.canConfigure)) {
        navItems.push({ icon: 'fa-cog', text: 'Admin', page: 'admin', permission: 'canManageUsers' });
    }
    
    let html = '';
    navItems.forEach(item => {
        if (permissions && (permissions[item.permission] || item.permission === 'canViewDashboard')) {
            html += `
                <div class="nav-item" onclick="loadPage('${item.page}')">
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
        const itemText = item.querySelector('span')?.textContent.toLowerCase();
        if (itemText === page) {
            item.classList.add('active');
        }
    });
}

// Load page content
async function loadPage(page) {
    sessionStorage.setItem('currentPage', page);
    setActiveNavItem(page);
    
    document.getElementById('page-title').innerHTML = `<h2>${capitalizeFirst(page)}</h2>`;
    
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
            await loadInvoices();
            break;
        case 'payments':
            await loadPayments();
            break;
        case 'ledger':
            await loadClientLedger();
            break;
        case 'reports':
            await loadReports();
            break;
        case 'users':
            await loadUsers();
            break;
        case 'admin':
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