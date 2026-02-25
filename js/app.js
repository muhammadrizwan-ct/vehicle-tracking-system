// Main Application Controller
document.addEventListener('DOMContentLoaded', async () => {

    await Auth.init();

    if (Auth.isLoggedIn()) {
        initializeApp();
        // On initial load, check hash and load correct page
        handleHashRouting();
    } else {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('login-page').classList.remove('hidden');
    }

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashRouting);
});

function handleHashRouting() {
    // Get page from hash, e.g. #/vehicles
    let hash = window.location.hash;
    let page = 'dashboard';
    if (hash && hash.startsWith('#/')) {
        page = hash.replace('#/', '').split('?')[0];
    }
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
    // If hash exists, load that page, else dashboard
    let hash = window.location.hash;
    let page = 'dashboard';
    if (hash && hash.startsWith('#/')) {
        page = hash.replace('#/', '').split('?')[0];
    }
    loadPage(page);
}

// Global functions
window.logout = logout;
window.toggleSidebar = toggleSidebar;