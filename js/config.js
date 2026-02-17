// Configuration
const CONFIG = {
    // If running from file:// or no hostname, treat as local development
    API_BASE_URL: (window.location.protocol === 'file:' || window.location.hostname === '' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:3000/api'
        : 'https://your-backend-api.com/api',
    TAX_RATE: 0.195,
    INVOICE_PREFIX: "CT",
    CURRENCY: "PKR ",
    COMPANY_NAME: "Connectia Technologies Pvt Ltd",
    PAYMENT_TERMS_DAYS: 20,
    VEHICLE_CATEGORIES: ['Sedan', 'SUV', 'Hatchback', 'Truck', 'Bus', 'Motorcycle', 'Van', 'Pickup', 'Trailer', 'Other'],
    ROLES: ['Admin', 'Manager', 'Accountant', 'Sales', 'Viewer'],
    DATE_FORMAT: 'dd-MM-yyyy',
    TIME_FORMAT: 'HH:mm:ss',
    ITEMS_PER_PAGE: 20
};

// Local Storage Keys
const STORAGE_KEYS = {
    AUTH_TOKEN: 'vts_auth_token',
    USER: 'vts_user',
    THEME: 'vts_theme',
    SIDEBAR_STATE: 'vts_sidebar',
    CLIENTS: 'vts_clients',
    VEHICLES: 'vts_vehicles',
    INVOICES: 'vts_invoices',
    PAYMENTS: 'vts_payments',
    ARCHIVED_VEHICLES: 'vts_archived_vehicles'
};

// Error Messages
const ERROR_MESSAGES = {
    NETWORK: 'Network error. Please check your connection.',
    UNAUTHORIZED: 'Session expired. Please login again.',
    FORBIDDEN: 'You do not have permission to perform this action.',
    NOT_FOUND: 'Resource not found.',
    VALIDATION: 'Please check your input and try again.',
    SERVER: 'Server error. Please try again later.'
};

// Success Messages
const SUCCESS_MESSAGES = {
    LOGIN: 'Login successful!',
    LOGOUT: 'Logout successful!',
    CREATE: 'Created successfully!',
    UPDATE: 'Updated successfully!',
    DELETE: 'Deleted successfully!',
    SAVE: 'Saved successfully!'
};
