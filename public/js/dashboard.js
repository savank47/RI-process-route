// Dashboard Module

class DashboardManager {
    static async render() {
        await this.renderStatusChart();
        await this.renderDefectReport();
        await this.renderRecentActivity();
        await this.renderTopItems();
    }

    static async renderStatusChart() {
        const batches = await api.getBatches();
        
        const active = batches.filter(b => !b.completedAt).length;
        const completed = batches.filter(b => b.completedAt).length;
        const total = batches.length || 1;
        
        document.getElementById('statusChart').innerHTML = `
            <div class="text-center">
                <div class="relative w-48 h-48 mx-auto">
                    <svg class="w-full h-full transform -rotate-90">
                        <circle cx="96" cy="96" r="88" stroke="#e5e7eb" stroke-width="20" fill="none"/>
                        <circle cx="96" cy="96" r="88" stroke="#3b82f6" stroke-width="20" fill="none"
                            stroke-dasharray="${(active/total) * 553} 553" stroke-linecap="round"/>
                        <circle cx="96" cy="96" r="88" stroke="#10b981" stroke-width="20" fill="none"
                            stroke-dasharray="${(completed/total) * 553} 553" stroke-dashoffset="${-(active/total) * 553}" stroke-linecap="round"/>
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center flex-col">
                        <span class="text-3xl font-bold text-gray-800">${total}</span>
                        <span class="text-sm text-gray-500">Total Batches</span>
                    </div>
                </div>
                <div class="flex justify-center gap-6 mt-4">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span class="text-sm">Active (${active})</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span class="text-sm">Completed (${completed})</span>
                    </div>
                </div>
            </div>
        `;
    }

    static async renderDefectReport() {
        const batches = await api.getBatches();
        const defects = [];
        
        batches.forEach(batch => {
            batch.processes.forEach(proc => {
                if (proc.status === 'defect') {
                    defects.push({ 
                        batch: batch.batchNumber, 
                        process: proc.name, 
                        item: batch.itemName 
                    });
                }
            });
        });

        if (defects.length === 0) {
            document.getElementById('defectReport').innerHTML = '<p class="text-green-600 text-center py-8"><i class="fas fa-check-circle mr-2"></i>No defects reported!</p>';
        } else {
            document.getElementById('defectReport').innerHTML = defects.map(d => `
                <div class="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                        <span class="font-medium">${d.batch}</span>
                        <span class="text-gray-600 mx-2">-</span>
                        <span class="text-sm">${d.process}</span>
                    </div>
                    <span class="text-sm text-gray-500">${d.item}</span>
                </div>
            `).join('');
        }
    }

    static async renderRecentActivity() {
        const batches = await api.getBatches();
        const recentBatches = [...batches]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        
        if (recentBatches.length === 0) {
            document.getElementById('recentActivity').innerHTML = '<p class="text-gray-500 text-center py-4">No recent activity</p>';
        } else {
            document.getElementById('recentActivity').innerHTML = recentBatches.map(batch => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-box text-blue-600"></i>
                        </div>
                        <div>
                            <p class="font-medium">${batch.batchNumber}</p>
                            <p class="text-sm text-gray-500">${batch.itemName} - Qty: ${batch.quantity}</p>
                        </div>
                    </div>
                    <span class="text-sm text-gray-400">${new Date(batch.createdAt).toLocaleDateString()}</span>
                </div>
            `).join('');
        }
    }

    static async renderTopItems() {
        const batches = await api.getBatches();
        const itemStats = {};
        
        batches.forEach(batch => {
            if (!itemStats[batch.itemName]) {
                itemStats[batch.itemName] = { count: 0, qty: 0 };
            }
            itemStats[batch.itemName].count++;
            itemStats[batch.itemName].qty += batch.quantity;
        });

        const topItems = Object.entries(itemStats)
            .sort((a, b) => b[1].qty - a[1].qty)
            .slice(0, 3);

        if (topItems.length === 0) {
            document.getElementById('topItems').innerHTML = '<p class="text-gray-500 text-center py-4 col-span-3">No data yet</p>';
        } else {
            document.getElementById('topItems').innerHTML = topItems.map(([name, stats], i) => `
                <div class="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-2xl">${['🥇', '🥈', '🥉'][i]}</span>
                        <h4 class="font-bold">${name}</h4>
                    </div>
                    <p class="text-sm text-gray-600">${stats.count} batches | ${stats.qty} total units</p>
                </div>
            `).join('');
        }
    }
}

// Make globally accessible
window.DashboardManager = DashboardManager;
window.renderDashboard = () => DashboardManager.render();
