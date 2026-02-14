// API Service
class APIService {
    constructor() {
        this.baseURL = CONFIG.API_BASE_URL;
        this.token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            ...options,
            headers,
            credentials: 'include'
        };

        try {
            const response = await fetch(url, config);
            
            // Handle 401 Unauthorized
            if (response.status === 401) {
                this.clearToken();
                Auth.clearAuth();
                // Show error message and redirect to login
                document.getElementById('loading-screen')?.classList.add('hidden');
                document.getElementById('login-page')?.classList.remove('hidden');
                document.getElementById('main-layout')?.classList.add('hidden');
                const errorEl = document.getElementById('login-error');
                if (errorEl) {
                    errorEl.textContent = ERROR_MESSAGES.UNAUTHORIZED;
                    errorEl.classList.remove('hidden');
                }
                throw new Error(ERROR_MESSAGES.UNAUTHORIZED);
            }

            // Handle 403 Forbidden
            if (response.status === 403) {
                throw new Error(ERROR_MESSAGES.FORBIDDEN);
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || ERROR_MESSAGES.SERVER);
            }

            return data;
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // Auth APIs
    async login(username, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (response.token) {
            this.setToken(response.token);
        }
        
        return response;
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } finally {
            this.clearToken();
        }
    }

    async getCurrentUser() {
        return this.request('/auth/me');
    }

    async changePassword(currentPassword, newPassword) {
        return this.request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }

    // User Management APIs
    async getUsers() {
        return this.request('/users');
    }

    async getUser(id) {
        return this.request(`/users/${id}`);
    }

    async createUser(userData) {
        return this.request('/users', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async updateUser(id, userData) {
        return this.request(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    async deleteUser(id) {
        return this.request(`/users/${id}`, {
            method: 'DELETE'
        });
    }

    // Client APIs
    async getClients(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/clients?${queryString}`);
    }

    async getClient(id) {
        return this.request(`/clients/${id}`);
    }

    async createClient(clientData) {
        return this.request('/clients', {
            method: 'POST',
            body: JSON.stringify(clientData)
        });
    }

    async updateClient(id, clientData) {
        return this.request(`/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(clientData)
        });
    }

    async deleteClient(id) {
        return this.request(`/clients/${id}`, {
            method: 'DELETE'
        });
    }

    async getClientLedger(id) {
        return this.request(`/clients/${id}/ledger`);
    }

    // Vehicle APIs
    async getVehicles(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/vehicles?${queryString}`);
    }

    async getVehicle(id) {
        return this.request(`/vehicles/${id}`);
    }

    async getClientVehicles(clientId) {
        return this.request(`/clients/${clientId}/vehicles`);
    }

    async createVehicle(vehicleData) {
        return this.request('/vehicles', {
            method: 'POST',
            body: JSON.stringify(vehicleData)
        });
    }

    async updateVehicle(id, vehicleData) {
        return this.request(`/vehicles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(vehicleData)
        });
    }

    async deleteVehicle(id) {
        return this.request(`/vehicles/${id}`, {
            method: 'DELETE'
        });
    }

    // Invoice APIs
    async getInvoices(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/invoices?${queryString}`);
    }

    async getInvoice(id) {
        return this.request(`/invoices/${id}`);
    }

    async createInvoice(invoiceData) {
        return this.request('/invoices', {
            method: 'POST',
            body: JSON.stringify(invoiceData)
        });
    }

    async updateInvoice(id, invoiceData) {
        return this.request(`/invoices/${id}`, {
            method: 'PUT',
            body: JSON.stringify(invoiceData)
        });
    }

    async getPendingInvoices(clientId) {
        return this.request(`/invoices/pending?clientId=${clientId}`);
    }

    async generateInvoicePDF(id) {
        return this.request(`/invoices/${id}/pdf`);
    }

    // Payment APIs
    async getPayments(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/payments?${queryString}`);
    }

    async getPayment(id) {
        return this.request(`/payments/${id}`);
    }

    async createPayment(paymentData) {
        return this.request('/payments', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }

    async getClientPayments(clientId) {
        return this.request(`/clients/${clientId}/payments`);
    }

    async generateReceipt(id) {
        return this.request(`/payments/${id}/receipt`);
    }

    // Report APIs
    async getDashboardMetrics() {
        return this.request('/reports/dashboard');
    }

    async getMonthlySummary(year) {
        return this.request(`/reports/monthly-summary?year=${year}`);
    }

    async getTopClients(limit = 5) {
        return this.request(`/reports/top-clients?limit=${limit}`);
    }

    async getCategoryAnalysis() {
        return this.request('/reports/category-analysis');
    }

    async getHeatmapData() {
        return this.request('/reports/heatmap');
    }

    // Audit APIs
    async getAuditLogs(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/audit?${queryString}`);
    }

    // Utility Functions
    async exportData(type, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        return this.request(`/export/${type}?${queryString}`);
    }

    async getNextInvoiceNumber() {
        return this.request('/utilities/next-invoice-number');
    }

    async getCompanyConfig() {
        return this.request('/config/company');
    }

    async updateCompanyConfig(config) {
        return this.request('/config/company', {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    }
}

// Create global API instance
const API = new APIService();