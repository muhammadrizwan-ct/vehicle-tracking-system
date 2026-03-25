// Authentication Service
class AuthService {
    constructor() {
        this.user = null;
        this.permissions = null;
    }

    async init() {
        try {
            const supabase = window.supabaseClient;
            if (!supabase?.auth) {
                this.clearAuth();
                return;
            }

            const { data, error } = await supabase.auth.getSession();
            if (error || !data?.session?.access_token) {
                this.clearAuth();
                return;
            }

            API.setToken(data.session.access_token);
            this.user = await this.resolveSessionUser(data.session);
            this.applyUserPermissions();
            this.saveUser();
        } catch (error) {
            console.error('Auth init failed:', error);
            this.clearAuth();
        }
    }

    normalizeLoginEmail(loginId) {
        const normalized = String(loginId || '').trim().toLowerCase();
        const masterAlias = String(CONFIG?.MASTER_LOGIN_ALIAS || 'master').trim().toLowerCase();
        const masterEmail = String(CONFIG?.MASTER_LOGIN_EMAIL || '').trim().toLowerCase();

        if (!normalized) {
            return { email: '', message: 'Please enter your email address.' };
        }

        if (normalized.includes('@')) {
            return { email: normalized, message: '' };
        }

        if (normalized === masterAlias && masterEmail.includes('@')) {
            return { email: masterEmail, message: '' };
        }

        return { email: '', message: 'Use your email address to continue.' };
    }

    async login(username, password) {
        try {
            const loginId = String(username || '').trim();
            const pwd = String(password || '');

            if (!loginId || !pwd) {
                return { success: false, message: 'Please enter email/username and password.' };
            }

            const normalizedLogin = this.normalizeLoginEmail(loginId);
            if (!normalizedLogin.email) {
                return { success: false, message: normalizedLogin.message || 'Use your email address to sign in.' };
            }

            const supabase = window.supabaseClient;
            if (!supabase?.auth) {
                return { success: false, message: 'Authentication service unavailable. Please try again.' };
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email: normalizedLogin.email,
                password: pwd
            });

            if (error || !data?.session?.access_token) {
                return { success: false, message: error?.message || 'Invalid credentials' };
            }

            API.setToken(data.session.access_token);
            this.user = await this.resolveSessionUser(data.session);

            const status = String(this.user?.status || 'active').toLowerCase();
            if (status !== 'active') {
                await supabase.auth.signOut();
                this.clearAuth();
                return { success: false, message: 'Your account is inactive. Please contact admin.' };
            }

            this.applyUserPermissions();
            this.saveUser();
            return { success: true, user: this.user };
        } catch (error) {
            return { success: false, message: 'Authentication service unavailable. Please try again.' };
        }
    }

    async sendPasswordResetOtp(loginId) {
        try {
            const normalizedLogin = this.normalizeLoginEmail(loginId);
            if (!normalizedLogin.email) {
                return { success: false, message: normalizedLogin.message || 'Please enter a valid email.' };
            }

            const supabase = window.supabaseClient;
            if (!supabase?.auth) {
                return { success: false, message: 'Authentication service unavailable. Please try again.' };
            }

            const redirectTo = `${window.location.origin}${window.location.pathname}`;
            const { error } = await supabase.auth.resetPasswordForEmail(normalizedLogin.email, { redirectTo });

            if (error) {
                return { success: false, message: error.message || 'Unable to send OTP. Please try again.' };
            }

            return {
                success: true,
                message: 'If this email is registered, an OTP has been sent. Check your inbox and spam folder.'
            };
        } catch (error) {
            return { success: false, message: 'Unable to send OTP right now. Please try again.' };
        }
    }

    async completePasswordReset(loginId, otp, newPassword) {
        try {
            const normalizedLogin = this.normalizeLoginEmail(loginId);
            const token = String(otp || '').trim();
            const updatedPassword = String(newPassword || '');

            if (!normalizedLogin.email) {
                return { success: false, message: normalizedLogin.message || 'Please enter a valid email.' };
            }

            if (!token) {
                return { success: false, message: 'Please enter OTP code from your email.' };
            }

            if (updatedPassword.length < 8) {
                return { success: false, message: 'New password must be at least 8 characters.' };
            }

            const supabase = window.supabaseClient;
            if (!supabase?.auth) {
                return { success: false, message: 'Authentication service unavailable. Please try again.' };
            }

            const { error: otpError } = await supabase.auth.verifyOtp({
                email: normalizedLogin.email,
                token,
                type: 'recovery'
            });

            if (otpError) {
                return { success: false, message: otpError.message || 'Invalid or expired OTP code.' };
            }

            const { error: passwordError } = await supabase.auth.updateUser({
                password: updatedPassword
            });

            if (passwordError) {
                return { success: false, message: passwordError.message || 'Failed to update password.' };
            }

            await supabase.auth.signOut();
            this.clearAuth();

            return {
                success: true,
                message: 'Password updated successfully. Please log in with your new password.'
            };
        } catch (error) {
            return { success: false, message: 'Could not reset password. Please request a new OTP.' };
        }
    }

    async logout() {
        try {
            if (window.supabaseClient?.auth) {
                await window.supabaseClient.auth.signOut();
            }
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
        API.clearToken();
        localStorage.removeItem(STORAGE_KEYS.USER);
    }

    async resolveSessionUser(session) {
        const baseUser = {
            id: session?.user?.id,
            username: session?.user?.email || 'user',
            email: session?.user?.email || '',
            role: 'viewer',
            fullname: session?.user?.user_metadata?.full_name || session?.user?.email || 'User',
            name: session?.user?.user_metadata?.full_name || session?.user?.email || 'User',
            status: 'active',
            permissions: {}
        };

        try {
            const supabase = window.supabaseClient;
            const email = String(session?.user?.email || '').trim().toLowerCase();
            const authUserId = session?.user?.id || null;

            if (!supabase || (!email && !authUserId)) {
                return baseUser;
            }

            let query = supabase
                .from('users')
                .select('id, username, email, role, fullname, status, permissions, auth_user_id')
                .limit(1);

            if (authUserId) {
                query = query.eq('auth_user_id', authUserId);
            } else {
                query = query.ilike('email', email);
            }

            let { data: profile, error } = await query.maybeSingle();

            if ((!profile || error) && email) {
                const fallback = await supabase
                    .from('users')
                    .select('id, username, email, role, fullname, status, permissions, auth_user_id')
                    .ilike('email', email)
                    .limit(1)
                    .maybeSingle();
                profile = fallback.data || profile;
                error = fallback.error || error;
            }

            if (error || !profile) {
                return baseUser;
            }

            if (!profile.auth_user_id && authUserId) {
                await supabase
                    .from('users')
                    .update({ auth_user_id: authUserId })
                    .eq('id', profile.id);
            }

            return {
                id: profile.id || baseUser.id,
                username: profile.username || profile.email || baseUser.username,
                email: profile.email || baseUser.email,
                role: profile.role || baseUser.role,
                fullname: profile.fullname || profile.username || baseUser.fullname,
                name: profile.fullname || profile.username || baseUser.name,
                status: profile.status || baseUser.status,
                permissions: profile.permissions && typeof profile.permissions === 'object'
                    ? profile.permissions
                    : {}
            };
        } catch (error) {
            console.error('Failed to resolve user profile:', error);
            return baseUser;
        }
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
        return !!this.user && !!API.token;
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
            if (!window.supabaseClient?.auth) {
                throw new Error('Authentication service unavailable');
            }

            const { error } = await window.supabaseClient.auth.updateUser({
                password: String(newPassword || '')
            });

            if (error) {
                throw error;
            }

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
        errorEl.textContent = 'Please enter email and password';
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

function setResetPasswordMessage(message, type = 'error') {
    const messageEl = document.getElementById('reset-password-message');
    if (!messageEl) return;

    if (!message) {
        messageEl.textContent = '';
        messageEl.classList.add('hidden');
        messageEl.classList.remove('success-message');
        return;
    }

    messageEl.textContent = String(message);
    messageEl.classList.remove('hidden');
    messageEl.classList.toggle('success-message', type === 'success');
}

function toggleForgotPasswordPanel() {
    const panel = document.getElementById('forgot-password-panel');
    const usernameInput = document.getElementById('username');
    const resetEmailInput = document.getElementById('reset-email');
    if (!panel || !resetEmailInput) return;

    const willOpen = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');

    if (willOpen) {
        const normalizedLogin = Auth.normalizeLoginEmail(usernameInput?.value || '');
        if (normalizedLogin.email && !String(resetEmailInput.value || '').trim()) {
            resetEmailInput.value = normalizedLogin.email;
        }
    }

    setResetPasswordMessage('');
}

async function sendPasswordResetOtp() {
    const emailInput = document.getElementById('reset-email');
    const sendOtpBtn = document.getElementById('send-otp-btn');
    const email = String(emailInput?.value || '').trim();

    if (!email) {
        setResetPasswordMessage('Please enter your email address.');
        return;
    }

    if (sendOtpBtn) sendOtpBtn.disabled = true;
    const result = await Auth.sendPasswordResetOtp(email);
    setResetPasswordMessage(result.message, result.success ? 'success' : 'error');

    if (result.success) {
        showNotification('OTP sent. Check your email inbox.', 'info');
    } else {
        if (sendOtpBtn) sendOtpBtn.disabled = false;
    }
}

async function completePasswordReset() {
    const email = String(document.getElementById('reset-email')?.value || '').trim();
    const otp = String(document.getElementById('reset-otp')?.value || '').trim();
    const newPassword = String(document.getElementById('reset-new-password')?.value || '');
    const confirmPassword = String(document.getElementById('reset-confirm-password')?.value || '');

    if (!email || !otp || !newPassword || !confirmPassword) {
        setResetPasswordMessage('Please fill all reset fields.');
        return;
    }

    if (newPassword !== confirmPassword) {
        setResetPasswordMessage('New password and confirm password do not match.');
        return;
    }

    const result = await Auth.completePasswordReset(email, otp, newPassword);
    setResetPasswordMessage(result.message, result.success ? 'success' : 'error');

    if (result.success) {
        document.getElementById('password').value = '';
        showNotification('Password reset successful. Sign in with your new password.', 'success');
        const panel = document.getElementById('forgot-password-panel');
        if (panel) {
            panel.classList.add('hidden');
        }
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
window.navigateToPage = navigateToPage;
window.toggleForgotPasswordPanel = toggleForgotPasswordPanel;
window.sendPasswordResetOtp = sendPasswordResetOtp;
window.completePasswordReset = completePasswordReset;

// Update user info in sidebar
function updateUserInfo() {
    const user = Auth.getCurrentUser();
    const userInfoEl = document.getElementById('user-info');
    
    if (user) {
        const displayName = user.name || user.fullname || user.username || 'User';
        const displayRole = user.role || 'User';
        userInfoEl.innerHTML = `
            <div class="user-avatar">${escapeHtml(displayName.charAt(0))}</div>
            <div class="user-details">
                <h4>${escapeHtml(displayName)}</h4>
                <p>${escapeHtml(displayRole)}</p>
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
                            <div class="nav-item nav-subitem" data-page="${child.page}" onclick="event.stopPropagation(); navigateToPage('${child.page}')">
                                <i class="fas ${child.icon}"></i>
                                <span>${child.text}</span>
                            </div>
                        `).join('')}
                    </div>
                `;
                return;
            }

            html += `
                <div class="nav-item" data-page="${item.page}" onclick="navigateToPage('${item.page}')">
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
        navigateToPage(defaultPage);
    }
}

function navigateToPage(page) {
    const normalizedPage = String(page || 'dashboard').trim().toLowerCase();
    const nextHash = `#/${normalizedPage}`;

    if (window.location.hash !== nextHash) {
        window.location.hash = nextHash;
        return;
    }

    loadPage(normalizedPage);
}

// Load page content
async function loadPage(page, options = {}) {
    // Expose loadPage globally for SPA routing
    window.loadPage = loadPage;
    const forceReload = Boolean(options?.forceReload);
    const normalizedPage = String(page || 'dashboard').trim().toLowerCase();

    if (!forceReload && window.__pageLoadInFlight && window.__pageLoadInFlightPage === normalizedPage) {
        return;
    }

    const currentPage = sessionStorage.getItem('currentPage') || '';
    if (!forceReload && currentPage === normalizedPage && window.__pageLoadedOnce) {
        return;
    }

    const loadToken = (window.__pageLoadToken || 0) + 1;
    window.__pageLoadToken = loadToken;
    window.__pageLoadInFlight = true;
    window.__pageLoadInFlightPage = normalizedPage;

    sessionStorage.setItem('currentPage', normalizedPage);
    setActiveNavItem(normalizedPage);
    
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
    const pageTitle = pageTitleMap[normalizedPage] || capitalizeFirst(normalizedPage);
    document.getElementById('page-title').innerHTML = `<h2>${escapeHtml(pageTitle)}</h2>`;

    const resolveLoader = (name) => {
        const fromWindow = window[name];
        if (typeof fromWindow === 'function') {
            return fromWindow;
        }
        return null;
    };

    const invokeLoader = async (name, ...args) => {
        const loader = resolveLoader(name);
        if (!loader) {
            throw new Error(`${name} is not defined`);
        }
        await loader(...args);
    };

    try {
        switch(normalizedPage) {
            case 'dashboard':
                await invokeLoader('loadDashboard');
                break;
            case 'clients':
                await invokeLoader('loadClients');
                break;
            case 'vehicles':
                await invokeLoader('loadVehicles');
                break;
            case 'invoices':
                await invokeLoader('loadInvoices', 'client');
                break;
            case 'invoices-client':
                await invokeLoader('loadInvoices', 'client');
                break;
            case 'invoices-vendor':
                await invokeLoader('loadInvoices', 'vendor');
                break;
            case 'payments':
                await invokeLoader('loadPayments', 'client');
                break;
            case 'payments-client':
                await invokeLoader('loadPayments', 'client');
                break;
            case 'payments-vendor':
                await invokeLoader('loadPayments', 'vendor');
                break;
            case 'payments-expenses':
                await invokeLoader('loadPayments', 'expenses');
                break;
            case 'ledger':
                await invokeLoader('loadLedger', 'client');
                break;
            case 'ledger-client':
                await invokeLoader('loadLedger', 'client');
                break;
            case 'ledger-vendor':
                await invokeLoader('loadLedger', 'vendor');
                break;
            case 'ledger-bank':
                await invokeLoader('loadLedger', 'bank');
                break;
            case 'reports':
                await invokeLoader('loadReports');
                break;
            case 'users':
                if (!Auth.hasPermission('canManageUsers')) {
                    showNotification('You do not have permission to access Users', 'error');
                    return;
                }
                await invokeLoader('loadUsers');
                break;
            case 'admin':
                if (!Auth.hasPermission('canConfigure')) {
                    showNotification('You do not have permission to access Admin', 'error');
                    return;
                }
                await invokeLoader('loadAdmin');
                break;
            default:
                await invokeLoader('loadDashboard');
                break;
        }

        if (window.__pageLoadToken === loadToken) {
            window.__pageLoadedOnce = true;
        }
    } catch (error) {
        console.error(`Error loading page '${normalizedPage}':`, error);
        showNotification(`Could not load ${pageTitle}.`, 'error');
        const contentEl = document.getElementById('content-body');
        if (contentEl) {
            contentEl.innerHTML = `
                <div class="card">
                    <div class="card-body" style="padding: 28px; color: var(--gray-600);">
                        <h3 style="margin-bottom: 8px;">Unable to load ${pageTitle}</h3>
                        <p style="margin: 0;">Please refresh and try again.</p>
                    </div>
                </div>
            `;
        }
    } finally {
        if (window.__pageLoadToken === loadToken) {
            window.__pageLoadInFlight = false;
            window.__pageLoadInFlightPage = '';
        }
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
        <span>${escapeHtml(message)}</span>
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
                    <p>${escapeHtml(message)}</p>
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
                <h3>${escapeHtml(title)}</h3>
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

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

window.escapeHtml = escapeHtml;

// Toggle sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    localStorage.setItem(STORAGE_KEYS.SIDEBAR_STATE, sidebar.classList.contains('collapsed'));
}
