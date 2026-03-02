// Main Application Controller
document.addEventListener('DOMContentLoaded', async () => {

    if (typeof runOneTimeDataReset === 'function') {
        runOneTimeDataReset();
    }

    await Auth.init();

    if (Auth.isLoggedIn()) {
        initializeApp();
        handleHashRouting();
    } else {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('login-page').classList.remove('hidden');
    }

    const sidebarState = localStorage.getItem(STORAGE_KEYS.SIDEBAR_STATE);
    if (sidebarState === 'true') {
        document.getElementById('sidebar').classList.add('collapsed');
    }

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashRouting);
    window.addEventListener('pageshow', handleHashRouting);
});

function getPageFromHash() {
    const hash = window.location.hash || '';
    if (!hash.startsWith('#/')) {
        return 'dashboard';
    }

    const route = hash
        .replace(/^#\//, '')
        .split('?')[0]
        .replace(/^\/+|\/+$/g, '')
        .trim()
        .toLowerCase();

    return route || 'dashboard';
}

function handleHashRouting() {
    const page = getPageFromHash();
    // Only load if logged in and main layout is visible
    if (Auth.isLoggedIn() && document.getElementById('main-layout') && !document.getElementById('main-layout').classList.contains('hidden')) {
        window.loadPage(page);
    }
}

function initializeApp() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('main-layout').classList.remove('hidden');
    document.getElementById('loading-screen').classList.add('hidden');
    
    updateUserInfo();
    renderSidebar();
    const page = getPageFromHash();
    loadPage(page);
}

// Global functions
window.logout = logout;
window.toggleSidebar = toggleSidebar;