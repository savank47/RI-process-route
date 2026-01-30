// ========================================
// FRONTEND JAVASCRIPT MODULE
// File: js/ui.js
// Purpose: UI helpers (toast, tabs, modals, etc.)
// Runs on: Browser (Client-side)
// ========================================

class UI {
    // Show toast notification
    static showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const icon = document.getElementById('toastIcon');
        const msg = document.getElementById('toastMessage');
        
        msg.textContent = message;
        icon.className = type === 'success' ? 'fas fa-check-circle text-green-500 text-xl' :
                         type === 'error' ? 'fas fa-exclamation-circle text-red-500 text-xl' :
                         'fas fa-info-circle text-blue-500 text-xl';
        
        toast.classList.remove('translate-y-20', 'opacity-0');
        setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
        }, 3000);
    }

    // Update time display
    static updateTime() {
        const now = new Date();
        document.getElementById('currentTime').textContent = now.toLocaleTimeString();
        document.getElementById('todayDate').textContent = now.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    // Update statistics
    static async updateStats() {
        try {
            const processes = await api.getProcesses();
            const items = await api.getItems();
            const batches = await api.getBatches();

            document.getElementById('statProcesses').textContent = processes.length;
            document.getElementById('statItems').textContent = items.length;
            document.getElementById('statActiveBatches').textContent = batches.filter(b => !b.completedAt).length;
            document.getElementById('statCompletedBatches').textContent = batches.filter(b => b.completedAt).length;
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    // Tab navigation
    static showTab(tabName) {
        const tabs = ['processes', 'items', 'batches', 'tracking', 'inspections', 'dashboard'];
        tabs.forEach(tab => {
            document.getElementById(`content-${tab}`).classList.add('hidden');
            document.getElementById(`tab-${tab}`).classList.remove('tab-active');
            document.getElementById(`tab-${tab}`).classList.add('text-gray-600');
        });
        document.getElementById(`content-${tabName}`).classList.remove('hidden');
        document.getElementById(`tab-${tabName}`).classList.add('tab-active');
        document.getElementById(`tab-${tabName}`).classList.remove('text-gray-600');

        // Load data when switching tabs
        if (tabName === 'processes') {
                if (window.ProcessManager) ProcessManager.render();
            } else if (tabName === 'items') {
                if (window.ItemManager) {
                    ItemManager.renderAvailableProcesses();
                    ItemManager.render();
                }
            } else if (tabName === 'batches') {
                if (window.BatchManager) {
                    BatchManager.updateItemSelect();
                    BatchManager.render();
                }
            } else if (tabName === 'tracking') {
                if (window.TrackingManager) {
                    TrackingManager.updateBatchSelect();
                    TrackingManager.renderSummary();
                }
            } else if (tabName === 'inspections') {
                // SAFETY CHECK: Ensure InspectionManager exists
                if (window.InspectionManager) {
                    InspectionManager.renderTab();
                } else {
                    console.error('InspectionManager not loaded yet');
                }
            } else if (tabName === 'dashboard') {
                if (window.DashboardManager) DashboardManager.render();
            }
    }

    // API Status Checker
    static async checkAPIStatus() {
        const statusEl = document.getElementById('apiStatus');
        const statusText = document.getElementById('apiStatusText');
        
        const isOnline = await api.checkStatus();
        
        if (isOnline) {
            statusEl.className = 'api-status';
            statusText.textContent = 'Connected';
            return true;
        } else {
            statusEl.className = 'api-status offline';
            statusText.textContent = 'Offline (Local Mode)';
            return false;
        }
    }

    // Color selection
    static selectColor(color) {
        STATE.selectedColor = color;
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.classList.remove('border-gray-800', 'ring-2', 'ring-offset-2');
            if (btn.dataset.color === color) {
                btn.classList.add('ring-2', 'ring-offset-2', 'ring-gray-800');
            }
        });
    }

    // Export data
    static async exportData() {
        const data = {
            processes: await api.getProcesses(),
            items: await api.getItems(),
            batches: await api.getBatches()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `auto-parts-pro-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        UI.showToast('Data exported successfully!');
    }

    // Import data
    static async importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (confirm('This will add data to your database. Continue?')) {
                    // Import processes
                    if (imported.processes) {
                        for (const proc of imported.processes) {
                            delete proc._id;
                            await api.addProcess(proc);
                        }
                    }
                    // Import items
                    if (imported.items) {
                        for (const item of imported.items) {
                            delete item._id;
                            await api.addItem(item);
                        }
                    }
                    // Import batches
                    if (imported.batches) {
                        for (const batch of imported.batches) {
                            delete batch._id;
                            await api.addBatch(batch);
                        }
                    }
                    
                    await ProcessManager.render();
                    await ItemManager.render();
                    await BatchManager.render();
                    await UI.updateStats();
                    UI.showToast('Data imported successfully!');
                }
            } catch (err) {
                UI.showToast('Invalid file format', 'error');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    // Modal helpers
    static openModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    static closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }


    static startHeartbeat() {
        // Refresh stats every 60 seconds
        setInterval(async () => {
            const statusText = document.getElementById('apiStatusText');
            if (statusText && statusText.textContent === 'Connected') {
                await UI.updateStats();
                console.log('📊 Stats auto-refreshed');
            }
        }, 60000);
    }
}

// Update main.js DomContentLoaded listener:
document.addEventListener('DOMContentLoaded', async () => {
    // ... existing init code ...
    
    UI.startHeartbeat(); // Start the background refresh
});

// Make functions globally accessible
window.showTab = (tab) => UI.showTab(tab);
window.selectColor = (color) => UI.selectColor(color);
window.exportData = () => UI.exportData();
window.importData = (e) => UI.importData(e);
