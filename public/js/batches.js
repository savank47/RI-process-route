// ========================================
// FRONTEND JAVASCRIPT MODULE
// File: js/batches.js
// Purpose: Production Batches UI and logic
// Runs on: Browser (Client-side)
// ========================================

class BatchManager {
    static async updateItemSelect() {
        const select = document.getElementById('batchItemSelect');
        const items = await api.getItems();
        select.innerHTML = '<option value="">-- Select Item --</option>' + 
            items.map(item => `<option value="${item._id}">${item.name} (${item.code})</option>`).join('');
    }

    static async previewProcessRoute() {
        const itemId = document.getElementById('batchItemSelect').value;
        const preview = document.getElementById('processRoutePreview');
        const routeSteps = document.getElementById('routePreviewSteps');

        if (!itemId) {
            preview.classList.add('hidden');
            return;
        }

        const items = await api.getItems();
        const item = items.find(i => i._id === itemId);
        
        if (!item || item.processRoute.length === 0) {
            preview.classList.add('hidden');
            return;
        }

        preview.classList.remove('hidden');
        
        const colorClasses = {
            gray: 'border-l-gray-400 bg-gray-50',
            red: 'border-l-red-400 bg-red-50',
            orange: 'border-l-orange-400 bg-orange-50',
            amber: 'border-l-amber-400 bg-amber-50',
            green: 'border-l-green-400 bg-green-50',
            teal: 'border-l-teal-400 bg-teal-50',
            blue: 'border-l-blue-400 bg-blue-50',
            indigo: 'border-l-indigo-400 bg-indigo-50',
            purple: 'border-l-purple-400 bg-purple-50',
            pink: 'border-l-pink-400 bg-pink-50'
        };

        routeSteps.innerHTML = `
            <div class="flex items-center gap-2 flex-wrap">
                ${item.processRoute.map((proc, i) => `
                    <div class="flex items-center">
                        <div class="border-l-4 ${colorClasses[proc.color]} rounded-r-lg px-3 py-2">
                            <span class="font-semibold text-sm">${proc.name}</span>
                        </div>
                        ${i < item.processRoute.length - 1 ? '<i class="fas fa-chevron-right text-gray-400 mx-1"></i>' : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }

    static async create() {
        const batchNumber = document.getElementById('batchNumber').value.trim();
        const quantity = parseInt(document.getElementById('batchQuantity').value);
        const itemId = document.getElementById('batchItemSelect').value;
        const priority = document.getElementById('batchPriority').value;
        const targetDate = document.getElementById('batchTargetDate').value;
        const customer = document.getElementById('batchCustomer').value.trim();
        const rawMaterialBatchNo = document.getElementById('batchRawMaterialBatch')?.value.trim() || null;


        if (!batchNumber || !quantity || !itemId) {
            UI.showToast('Please fill all required batch details', 'error');
            return;
        }

        const items = await api.getItems();
        const item = items.find(i => i._id === itemId);

        const batch = {
            batchNumber,
            quantity,
            priority,
            targetDate,
            customer,
            itemId,
            itemName: item.name,
            itemCode: item.code,
            
            // 🔽 copied from item master
            material: item.material || null,
            // 🔽 NEW (optional)
            rawMaterialBatchNo,
            
            itemDimensions: item.dimensions || [],
            processes: item.processRoute.map(proc => ({
                ...proc,
                status: 'pending',
                startTime: null,
                endTime: null,
                notes: ''
            })),
            inspections: []
        };

        await api.addBatch(batch);
        this.clearForm();
        await this.render();
        await UI.updateStats();
        UI.showToast(`Batch "${batchNumber}" created!`);
    }

    static clearForm() {
        document.getElementById('batchNumber').value = '';
        document.getElementById('batchQuantity').value = '';
        document.getElementById('batchItemSelect').value = '';
        document.getElementById('batchPriority').value = 'normal';
        document.getElementById('batchTargetDate').value = '';
        document.getElementById('batchCustomer').value = '';
        document.getElementById('processRoutePreview').classList.add('hidden');
    }

    static async delete(batchId) {
        if (!confirm('Delete this batch?')) return;
        
        await api.deleteBatch(batchId);
        await this.render();
        await TrackingManager.updateBatchSelect();
        await UI.updateStats();
        UI.showToast('Batch deleted');
    }

    static async filter() {
        await this.render();
    }

    static async render() {
        const container = document.getElementById('batchesList');
        const filter = document.getElementById('batchFilter').value;
        const batches = await api.getBatches();
        
        let filteredBatches = [...batches];
        if (filter === 'active') filteredBatches = filteredBatches.filter(b => !b.completedAt);
        if (filter === 'completed') filteredBatches = filteredBatches.filter(b => b.completedAt);

        if (filteredBatches.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8 col-span-3">No batches found.</p>';
            return;
        }

        container.innerHTML = filteredBatches.map(batch => {
            const completed = batch.processes.filter(p => p.status === 'completed').length;
            const total = batch.processes.length;
            const progress = Math.round((completed / total) * 100);
            const isComplete = batch.completedAt !== null;

            return `
                <div class="batch-card border border-gray-200 rounded-lg p-4 ${isComplete ? 'bg-green-50' : 'bg-white'}">
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="font-bold text-gray-800">${batch.batchNumber}</h3>
                        
                        <div>
                            <span class="text-xs px-2 py-1 rounded ${CONFIG.PRIORITY_COLORS[batch.priority]}">${batch.priority}</span>
                      
                        
                            <button>
                              class="text-xs text-blue-600 hover:underline"
                              onclick="BatchManager.editRawMaterialBatch('${batch._id}')">
                              Edit RM Batch
                            </button>
                        </div>

                        
                    </div>
                    <p class="text-sm text-gray-600">${batch.itemName} (${batch.itemCode})</p>
                    ${batch.rawMaterialBatchNo ? `
                          <div class="text-sm text-gray-600">
                            <strong>Raw Material Batch:</strong> ${batch.rawMaterialBatchNo}
                          </div>
                        ` : `
                          <div class="text-sm text-gray-400 italic">
                            Raw Material Batch: —
                          </div>
                        `}
                    <p class="text-sm font-medium text-blue-600 mt-1">Qty: ${batch.quantity}</p>
                    ${batch.customer ? `<p class="text-xs text-gray-500 mt-1"><i class="fas fa-user mr-1"></i>${batch.customer}</p>` : ''}
                    ${batch.itemDimensions && batch.itemDimensions.length > 0 ? `<p class="text-xs text-purple-600 mt-1"><i class="fas fa-ruler-combined mr-1"></i>${batch.itemDimensions.length} dimensions defined</p>` : ''}
                    <div class="mt-3">
                        <div class="flex justify-between text-xs text-gray-600 mb-1">
                            <span>Progress</span>
                            <span>${completed}/${total} steps (${progress}%)</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2">
                            <div class="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all" style="width: ${progress}%"></div>
                        </div>
                    </div>
                    <div class="mt-3 flex gap-2">
                        <button onclick="TrackingManager.trackBatch('${batch._id}')" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition">
                            <i class="fas fa-tasks mr-1"></i>Track
                        </button>
                        <button onclick="BatchManager.delete('${batch._id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm transition">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

BatchManager.editRawMaterialBatch = async function (batchId) {
    const batches = await api.getBatches();
    const batch = batches.find(b => b._id === batchId);

    if (!batch) {
        UI.showToast('Batch not found', 'error');
        return;
    }

    const newRM = prompt(
        'Enter Raw Material Batch No:',
        batch.rawMaterialBatchNo || ''
    );

    if (newRM === null) return; // user cancelled

    const updatedValue = newRM.trim() || null;

    await api.updateBatch(batchId, {
        rawMaterialBatchNo: updatedValue
    });

    UI.showToast('Raw Material Batch updated', 'success');

    // Re-render batch cards so UI updates immediately
    await this.render();
};


// Make globally accessible
window.BatchManager = BatchManager;
window.createBatch = () => BatchManager.create();
window.clearBatchForm = () => BatchManager.clearForm();
window.previewBatchProcessRoute = () => BatchManager.previewProcessRoute();
window.filterBatches = () => BatchManager.filter();
