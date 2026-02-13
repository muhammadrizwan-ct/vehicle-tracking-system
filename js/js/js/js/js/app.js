// Main Application Controller
document.addEventListener('DOMContentLoaded', async () => {
    await Auth.init();
    
    if (Auth.isLoggedIn()) {
        initializeApp();
    } else {
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('login-page').classList.remove('hidden');
    }
});

function initializeApp() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('main-layout').classList.remove('hidden');
    document.getElementById('loading-screen').classList.add('hidden');
    
    updateUserInfo();
    renderSidebar();
    loadPage('dashboard');
}

// Global functions
window.loadPage = loadPage;
window.logout = logout;
window.toggleSidebar = toggleSidebar;