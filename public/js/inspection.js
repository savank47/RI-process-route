// Inspection Reports Module - NEW FEATURE

class InspectionManager {
    static async generateReport() {
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

        if (!batch.itemDimensions || batch.itemDimensions.length === 0) {
            UI.showToast('No dimensions defined for this item', 'info');
            return;
        }

        this.showInspectionModal(batch);
    }

    static showInspectionModal(batch) {
        const modal = document.getElementById('inspectionModal');
        const dimensionsContainer = document.getElementById('inspectionDimensions');
        
        // Set batch info
        document.getElementById('inspectionBatchInfo').innerHTML = `
            <div class="flex items-center gap-3">
                <div>
                    <h3 class="font-bold text-lg">${batch.batchNumber}</h3>
                    <p class="text-sm text-gray-600">${batch.itemName} (${batch.itemCode})</p>
                </div>
            </div>
        `;

        // Render dimensions for inspection
        dimensionsContainer.innerHTML = batch.itemDimensions.map((dim, index) => `
            <div class="border border-gray-200 rounded-lg p-4 bg-white">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h4 class="font-bold text-gray-800">${dim.name}</h4>
                        <p class="text-sm text-gray-600">Target: ${dim.minValue} - ${dim.maxValue} ${dim.unit}</p>
                    </div>
                </div>
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-gray-700">Actual Measurement:</label>
                    <div class="flex gap-2 items-center">
                        <input type="number" 
                               step="0.01" 
                               id="actual-${index}" 
                               placeholder="Enter measured value" 
                               onchange="InspectionManager.checkTolerance(${index}, ${dim.minValue}, ${dim.maxValue})"
                               class="border border-gray-300 rounded px-3 py-2 text-sm flex-1">
                        <span class="text-sm text-gray-600">${dim.unit}</span>
                    </div>
                    <div id="result-${index}" class="text-sm font-semibold"></div>
                </div>
            </div>
        `).join('');

        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    static checkTolerance(index, minValue, maxValue) {
        const actualInput = document.getElementById(`actual-${index}`);
        const resultDiv = document.getElementById(`result-${index}`);
        const actual = parseFloat(actualInput.value);

        if (isNaN(actual)) {
            resultDiv.innerHTML = '';
            actualInput.parentElement.parentElement.parentElement.classList.remove('dimension-pass', 'dimension-fail', 'dimension-warning');
            return;
        }

        const tolerance = (maxValue - minValue) * 0.1; // 10% buffer for warning
        
        if (actual >= minValue && actual <= maxValue) {
            if (actual < minValue + tolerance || actual > maxValue - tolerance) {
                // Close to limits - warning
                resultDiv.innerHTML = '<span class="text-amber-600"><i class="fas fa-exclamation-triangle mr-1"></i>WARNING: Close to limit</span>';
                actualInput.parentElement.parentElement.parentElement.classList.remove('dimension-pass', 'dimension-fail');
                actualInput.parentElement.parentElement.parentElement.classList.add('dimension-warning');
            } else {
                // Within tolerance - pass
                resultDiv.innerHTML = '<span class="text-green-600"><i class="fas fa-check-circle mr-1"></i>PASS: Within tolerance</span>';
                actualInput.parentElement.parentElement.parentElement.classList.remove('dimension-fail', 'dimension-warning');
                actualInput.parentElement.parentElement.parentElement.classList.add('dimension-pass');
            }
        } else {
            // Out of tolerance - fail
            const deviation = actual < minValue ? (minValue - actual) : (actual - maxValue);
            resultDiv.innerHTML = `<span class="text-red-600"><i class="fas fa-times-circle mr-1"></i>FAIL: Out of tolerance by ${deviation.toFixed(3)}</span>`;
            actualInput.parentElement.parentElement.parentElement.classList.remove('dimension-pass', 'dimension-warning');
            actualInput.parentElement.parentElement.parentElement.classList.add('dimension-fail');
        }
    }

    static async saveInspection() {
        const batchId = document.getElementById('trackingBatchSelect').value;
        const batches = await api.getBatches();
        const batch = batches.find(b => b._id === batchId);
        
        if (!batch) return;

        const inspectorNotes = document.getElementById('inspectorNotes').value.trim();
        
        // Collect actual measurements
        const measurements = batch.itemDimensions.map((dim, index) => {
            const actualInput = document.getElementById(`actual-${index}`);
            const actual = parseFloat(actualInput.value);
            
            let status = 'not_measured';
            if (!isNaN(actual)) {
                if (actual >= dim.minValue && actual <= dim.maxValue) {
                    const tolerance = (dim.maxValue - dim.minValue) * 0.1;
                    if (actual < dim.minValue + tolerance || actual > dim.maxValue - tolerance) {
                        status = 'warning';
                    } else {
                        status = 'pass';
                    }
                } else {
                    status = 'fail';
                }
            }

            return {
                name: dim.name,
                target: `${dim.minValue} - ${dim.maxValue} ${dim.unit}`,
                actual: isNaN(actual) ? null : actual,
                unit: dim.unit,
                status: status
            };
        });

        const inspection = {
            timestamp: new Date().toISOString(),
            inspector: 'Current User', // In real app, get from auth
            measurements: measurements,
            notes: inspectorNotes,
            overallStatus: measurements.some(m => m.status === 'fail') ? 'rejected' : 
                          measurements.some(m => m.status === 'warning') ? 'conditional' : 'approved'
        };

        // Add inspection to batch
        if (!batch.inspections) batch.inspections = [];
        batch.inspections.push(inspection);

        try {
            await api.updateBatch(batchId, { inspections: batch.inspections });
            this.closeModal();
            UI.showToast(`Inspection saved: ${inspection.overallStatus.toUpperCase()}`, 
                        inspection.overallStatus === 'approved' ? 'success' : 'info');
            
            // Reload tracking to show inspection data
            await TrackingManager.load();
        } catch (error) {
            console.error('Failed to save inspection:', error);
            UI.showToast('Failed to save inspection', 'error');
        }
    }

    static closeModal() {
        const modal = document.getElementById('inspectionModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        document.getElementById('inspectorNotes').value = '';
    }

    static async showHistory() {
        const batchId = document.getElementById('trackingBatchSelect').value;
        if (!batchId) {
            UI.showToast('Please select a batch first', 'error');
            return;
        }

        const batches = await api.getBatches();
        const batch = batches.find(b => b._id === batchId);
        
        if (!batch || !batch.inspections || batch.inspections.length === 0) {
            UI.showToast('No inspection history for this batch', 'info');
            return;
        }

        const modal = document.getElementById('inspectionHistoryModal');
        const container = document.getElementById('inspectionHistoryList');
        
        container.innerHTML = batch.inspections.map((inspection, idx) => {
            const statusColors = {
                approved: 'bg-green-100 text-green-800',
                conditional: 'bg-amber-100 text-amber-800',
                rejected: 'bg-red-100 text-red-800'
            };

            return `
                <div class="border border-gray-200 rounded-lg p-4 bg-white">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h4 class="font-bold">Inspection #${idx + 1}</h4>
                            <p class="text-sm text-gray-600">${new Date(inspection.timestamp).toLocaleString()}</p>
                            <p class="text-sm text-gray-600">Inspector: ${inspection.inspector}</p>
                        </div>
                        <span class="px-3 py-1 rounded-full text-sm font-semibold ${statusColors[inspection.overallStatus]}">
                            ${inspection.overallStatus.toUpperCase()}
                        </span>
                    </div>
                    <div class="space-y-2">
                        ${inspection.measurements.map(m => {
                            const statusIcons = {
                                pass: '<i class="fas fa-check-circle text-green-600"></i>',
                                warning: '<i class="fas fa-exclamation-triangle text-amber-600"></i>',
                                fail: '<i class="fas fa-times-circle text-red-600"></i>',
                                not_measured: '<i class="fas fa-minus-circle text-gray-400"></i>'
                            };
                            return `
                                <div class="flex justify-between items-center text-sm">
                                    <span class="font-medium">${m.name}:</span>
                                    <span>${m.actual !== null ? m.actual + ' ' + m.unit : 'Not measured'} ${statusIcons[m.status]}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    ${inspection.notes ? `<p class="mt-3 text-sm text-gray-600 italic">"${inspection.notes}"</p>` : ''}
                </div>
            `;
        }).join('');

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    static closeHistoryModal() {
        const modal = document.getElementById('inspectionHistoryModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Make globally accessible
window.InspectionManager = InspectionManager;
window.generateInspectionReport = () => InspectionManager.generateReport();
window.saveInspection = () => InspectionManager.saveInspection();
window.closeInspectionModal = () => InspectionManager.closeModal();
window.showInspectionHistory = () => InspectionManager.showHistory();
window.closeInspectionHistoryModal = () => InspectionManager.closeHistoryModal();
