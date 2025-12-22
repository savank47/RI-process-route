// Tracking Management Module

class TrackingManager {
    static async updateBatchSelect() {
        const select = document.getElementById('trackingBatchSelect');
        const batches = await api.getBatches();
        select.innerHTML = '<option value="">-- Select Batch --</option>' + 
            batches.map(batch => `<option value="${batch._id}">${batch.batchNumber} - ${batch.itemName}</option>`).join('');
    }

    static async load() {
        const batchId = document.getElementById('trackingBatchSelect').value;
        const display = document.getElementById('trackingDisplay');

        if (!batchId) {
            display.classList.add('hidden');
            return;
        }

        display.classList.remove('hidden');
        const batches = await api.getBatches();
        const batch = batches.find(b => b._id === batchId);

        if (!batch) {
            display.innerHTML = '<p class="text-red-500">Batch not found</p>';
            return;
        }

        // Batch info
        document.getElementById('batchInfo').innerHTML = `
            <div class="flex flex-wrap gap-4 items-center">
                <div class="text-2xl font-bold">${batch.batchNumber}</div>
                <span class="px-3 py-1 rounded ${CONFIG.PRIORITY_COLORS[batch.priority]} text-sm font-medium">${batch.priority} priority</span>
                <span class="text-sm text-gray-700">${batch.itemName} (${batch.itemCode})</span>
                <span class="text-sm text-gray-700">Qty: ${batch.quantity}</span>
                ${batch.customer ? `<span class="text-sm text-gray-700"><i class="fas fa-user mr-1"></i>${batch.customer}</span>` : ''}
            </div>
        `;

        // Progress
        const completed = batch.processes.filter(p => p.status === 'completed').length;
        const total = batch.processes.length;
        const progress = Math.round((completed / total) * 100);
        document.getElementById('overallProgressText').textContent = `${progress}%`;
        document.getElementById('overallProgressBar').style.width = `${progress}%`;

        // Process tracking
        const trackingContainer = document.getElementById('processTracking');
        trackingContainer.innerHTML = batch.processes.map((proc, index) => {
            const statusClass = `status-${proc.status}`;
            const statusIcon = proc.status === 'pending' ? 'fa-clock text-amber-500' :
                              proc.status === 'inprogress' ? 'fa-spinner fa-spin text-blue-500' :
                              proc.status === 'completed' ? 'fa-check-circle text-green-500' :
                              'fa-exclamation-circle text-red-500';
            const statusText = proc.status.charAt(0).toUpperCase() + proc.status.slice(1).replace('inprogress', 'In Progress');

            return `
                <div class="${statusClass} rounded-lg p-4 border-r-4">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex items-center gap-3">
                            <span class="bg-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-gray-800 shadow">${proc.order}</span>
                            <div>
                                <span class="font-bold text-gray-800 text-lg">${proc.name}</span>
                                ${proc.description ? `<p class="text-sm text-gray-600">${proc.description}</p>` : ''}
                            </div>
                        </div>
                        <span class="flex items-center gap-2 font-semibold text-sm px-3 py-1 rounded-full bg-white">
                            <i class="fas ${statusIcon}"></i>
                            ${statusText}
                        </span>
                    </div>
                    <div class="ml-13 space-y-3">
                        <div class="flex gap-2 flex-wrap">
                            <button type="button" onclick="handleStatusChange(event, '${batch._id}', ${index}, 'pending')" class="px-4 py-2 rounded text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 transition">
                                <i class="fas fa-clock mr-1"></i>Pending
                            </button>
                            <button type="button" onclick="handleStatusChange(event, '${batch._id}', ${index}, 'inprogress')" class="px-4 py-2 rounded text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 transition">
                                <i class="fas fa-play mr-1"></i>In Progress
                            </button>
                            <button type="button" onclick="handleStatusChange(event, '${batch._id}', ${index}, 'completed')" class="px-4 py-2 rounded text-sm bg-green-100 hover:bg-green-200 text-green-800 transition">
                                <i class="fas fa-check mr-1"></i>Completed
                            </button>
                            <button type="button" onclick="handleStatusChange(event, '${batch._id}', ${index}, 'defect')" class="px-4 py-2 rounded text-sm bg-red-100 hover:bg-red-200 text-red-800 transition">
                                <i class="fas fa-exclamation mr-1"></i>Defect
                            </button>
                        </div>
                        <input type="text" placeholder="Add notes..." value="${proc.notes || ''}" 
                            onchange="handleNotesChange(event, '${batch._id}', ${index}, this.value)"
                            class="border border-gray-300 rounded px-4 py-2 text-sm w-full" />
                        <div class="text-xs text-gray-500 flex gap-4">
                            ${proc.startTime ? `<span><i class="fas fa-play mr-1"></i>Started: ${new Date(proc.startTime).toLocaleString()}</span>` : ''}
                            ${proc.endTime ? `<span><i class="fas fa-check mr-1"></i>Ended: ${new Date(proc.endTime).toLocaleString()}</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Don't re-render summary - it causes tracking to close
    }

    static async updateProcessStatus(batchId, processIndex, status) {
        try {
            const batches = await api.getBatches();
            const batch = batches.find(b => b._id === batchId);
            
            if (!batch) {
                UI.showToast('Batch not found', 'error');
                return;
            }
            
            const proc = batch.processes[processIndex];

            const updates = {
                status: status,
                endTime: status === 'completed' ? new Date().toISOString() : (status === 'pending' ? null : proc.endTime),
                startTime: status === 'inprogress' ? (proc.startTime || new Date().toISOString()) : (status === 'pending' ? null : proc.startTime)
            };

            await api.updateBatchProcess(batchId, processIndex, updates);
            
            // Store current batch selection to restore it
            const currentBatchId = document.getElementById('trackingBatchSelect').value;
            
            // Update only the tracking display - DON'T call renderBatchSummary which closes it
            await this.load();
            await UI.updateStats();
            
            // Restore batch selection to keep the tracking display open
            document.getElementById('trackingBatchSelect').value = currentBatchId;
            
            UI.showToast('Process status updated', 'success');
        } catch (error) {
            console.error('Failed to update process status:', error);
            UI.showToast('Failed to update status', 'error');
        }
    }

    static async updateProcessNotes(batchId, processIndex, notes) {
        try {
            await api.updateBatchProcess(batchId, processIndex, { notes });
            UI.showToast('Notes saved', 'success');
        } catch (error) {
            console.error('Failed to update notes:', error);
        }
    }

    static async startFirstPendingProcess() {
        const batchId = document.getElementById('trackingBatchSelect').value;
        if (!batchId) {
            UI.showToast('Please select a batch first', 'error');
            return;
        }
        
        const batches = await api.getBatches();
        const batch = batches.find(b => b._id === batchId);
        
        if (!batch) {
            UI.showToast('Batch not found', 'error');
            return;
        }
        
        const pendingIndex = batch.processes.findIndex(p => p.status === 'pending');
        
        if (pendingIndex >= 0) {
            await this.updateProcessStatus(batchId, pendingIndex, 'inprogress');
        } else {
            UI.showToast('All processes are already started!', 'info');
        }
    }

    static async completeCurrentProcess() {
        const batchId = document.getElementById('trackingBatchSelect').value;
        if (!batchId) {
            UI.showToast('Please select a batch first', 'error');
            return;
        }
        
        const batches = await api.getBatches();
        const batch = batches.find(b => b._id === batchId);
        
        if (!batch) {
            UI.showToast('Batch not found', 'error');
            return;
        }
        
        const inProgressIndex = batch.processes.findIndex(p => p.status === 'inprogress');
        
        if (inProgressIndex >= 0) {
            await this.updateProcessStatus(batchId, inProgressIndex, 'completed');
            
            // Auto-start next process
            const nextIndex = batch.processes.findIndex((p, i) => i > inProgressIndex && p.status === 'pending');
            if (nextIndex >= 0) {
                setTimeout(async () => {
                    await this.updateProcessStatus(batchId, nextIndex, 'inprogress');
                }, 500);
            }
        } else {
            UI.showToast('No process in progress!', 'info');
        }
    }

    static async resetAllProcesses() {
        if (!confirm('Reset all processes to pending?')) return;
        
        const batchId = document.getElementById('trackingBatchSelect').value;
        if (!batchId) {
            UI.showToast('Please select a batch first', 'error');
            return;
        }
        
        const batches = await api.getBatches();
        const batch = batches.find(b => b._id === batchId);
        
        if (!batch) {
            UI.showToast('Batch not found', 'error');
            return;
        }
        
        for (let i = 0; i < batch.processes.length; i++) {
            await this.updateProcessStatus(batchId, i, 'pending');
        }
        
        await this.load();
        await BatchManager.render();
        UI.showToast('All processes reset');
    }

    static trackBatch(batchId) {
        UI.showTab('tracking');
        document.getElementById('trackingBatchSelect').value = batchId;
        this.load();
    }

    static async renderSummary() {
        const container = document.getElementById('batchSummary');
        const batches = await api.getBatches();
        
        if (batches.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No batches created yet.</p>';
            return;
        }

        container.innerHTML = batches.map(batch => {
            const completed = batch.processes.filter(p => p.status === 'completed').length;
            const total = batch.processes.length;
            const isComplete = batch.completedAt !== null;
            const hasDefects = batch.processes.some(p => p.status === 'defect');
            
            let statusClass, statusText;
            if (isComplete) { statusClass = 'bg-green-100 text-green-800'; statusText = 'Completed'; }
            else if (hasDefects) { statusClass = 'bg-red-100 text-red-800'; statusText = 'Has Defects'; }
            else { statusClass = 'bg-blue-100 text-blue-800'; statusText = 'In Progress'; }

            return `
                <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition cursor-pointer" onclick="TrackingManager.trackBatch('${batch._id}')">
                    <div class="flex justify-between items-center">
                        <div>
                            <h3 class="font-bold text-gray-800">${batch.batchNumber}</h3>
                            <p class="text-sm text-gray-600">${batch.itemName}</p>
                        </div>
                        <span class="px-3 py-1 rounded-full text-sm font-semibold ${statusClass}">${statusText}</span>
                    </div>
                    <div class="mt-2 text-sm text-gray-600">Qty: ${batch.quantity} | ${completed}/${total} steps</div>
                    <div class="text-xs text-gray-400 mt-1">Created: ${new Date(batch.createdAt).toLocaleDateString()}</div>
                </div>
            `;
        }).join('');
    }
}

// Wrapper functions to prevent page reload
function handleStatusChange(e, batchId, processIndex, status) {
    e.preventDefault();
    e.stopPropagation();
    TrackingManager.updateProcessStatus(batchId, processIndex, status);
    return false;
}

function handleQuickAction(e, action) {
    e.preventDefault();
    e.stopPropagation();
    
    switch(action) {
        case 'startNext':
            TrackingManager.startFirstPendingProcess();
            break;
        case 'completeCurrent':
            TrackingManager.completeCurrentProcess();
            break;
        case 'resetAll':
            TrackingManager.resetAllProcesses();
            break;
    }
    return false;
}

function handleNotesChange(e, batchId, processIndex, value) {
    e.preventDefault();
    TrackingManager.updateProcessNotes(batchId, processIndex, value);
    return false;
}

// Make globally accessible
window.TrackingManager = TrackingManager;
window.loadBatchTracking = () => TrackingManager.load();
window.updateProcessStatus = (bId, pIdx, status) => TrackingManager.updateProcessStatus(bId, pIdx, status);
window.updateProcessNotes = (bId, pIdx, notes) => TrackingManager.updateProcessNotes(bId, pIdx, notes);
window.startFirstPendingProcess = () => TrackingManager.startFirstPendingProcess();
window.completeCurrentProcess = () => TrackingManager.completeCurrentProcess();
window.resetAllProcesses = () => TrackingManager.resetAllProcesses();
window.trackBatch = (id) => TrackingManager.trackBatch(id);
window.handleStatusChange = handleStatusChange;
window.handleQuickAction = handleQuickAction;
window.handleNotesChange = handleNotesChange;
