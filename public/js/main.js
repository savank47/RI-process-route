// Main Application Initialization

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Auto Parts Production Tracker Pro - Loading...');
    
    // Update time every second
    UI.updateTime();
    setInterval(UI.updateTime, 1000);
    
    // Check API status
    const apiOnline = await UI.checkAPIStatus();
    if (apiOnline) {
        console.log('✅ API Online - Connected to cloud database');
    } else {
        console.log('⚠️ API Offline - Using localStorage');
    }
    
    // Load initial data
    await UI.updateStats();
    await ProcessManager.render();
    
    console.log('✅ Application loaded successfully!');
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    // Don't show toast for extension errors
    if (!event.message.includes('message channel')) {
        UI.showToast('An error occurred. Check console for details.', 'error');
    }
});

// Prevent accidental page navigation
window.addEventListener('beforeunload', (event) => {
    // Only warn if there's unsaved data
    if (STATE.selectedProcessesForRoute.length > 0 || STATE.itemDimensions.length > 0) {
        event.preventDefault();
        event.returnValue = '';
    }
});

console.log('📦 All modules loaded successfully!');
