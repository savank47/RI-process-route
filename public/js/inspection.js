// ========================================
// FRONTEND JAVASCRIPT MODULE
// File: js/inspection.js
// Purpose: Inspection reports with multi-sample support
// Runs on: Browser (Client-side)
// ========================================

class InspectionManager {
    // Multi-sample support
    static currentSampleSize = 1;
    static currentBatchForInspection = null;

    // NEW: Render Inspection Reports Tab
    static async renderTab() {
        await this.updateBatchSelect();
        await this.renderAllReports();
    }

    static async updateBatchSelect() {
        const select = document.getElementById('inspectionBatchSelect');
        const filterSelect = document.getElementById('inspectionFilterBatch');
        const batches = await api.getBatches();
        
        const options = '<option value="">-- Select Batch --</option>' + 
            batches.map(batch => `<option value="${batch._id}">${batch.batchNumber} - ${batch.itemName}</option>`).join('');
        
        select.innerHTML = options;
        
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="all">All Batches</option>' + 
                batches.map(batch => `<option value="${batch._id}">${batch.batchNumber}</option>`).join('');
        }
    }

    static setSampleSize(value) {
        if (value === 'custom') {
            const customSize = prompt('Enter number of samples to measure:', '5');
            if (customSize && !isNaN(customSize) && parseInt(customSize) > 0) {
                this.currentSampleSize = parseInt(customSize);
            } else {
                return; // Cancel if invalid
            }
        } else {
            this.currentSampleSize = parseInt(value) || 1;
        }
        
        // Refresh the form with new sample size
        const batchId = document.getElementById('inspectionBatchSelect').value;
        if (batchId) {
            this.previewDimensions();
        }
    }

    static async previewDimensions() {
        const batchId = document.getElementById('inspectionBatchSelect').value;
        const preview = document.getElementById('inspectionFormPreview');
        
        if (!batchId) {
            preview.classList.add('hidden');
            return;
        }

        const batches = await api.getBatches();
        const batch = batches.find(b => b._id === batchId);
        
        if (!batch || !batch.itemDimensions || batch.itemDimensions.length === 0) {
            UI.showToast('This batch has no dimensions defined', 'info');
            preview.classList.add('hidden');
            return;
        }

        this.currentBatchForInspection = batch;
        preview.classList.remove('hidden');
        
        // Batch info with sample size selector
        document.getElementById('inspectionFormBatchInfo').innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <p><strong>Batch:</strong> ${batch.batchNumber}</p>
                    <p><strong>Item:</strong> ${batch.itemName} (${batch.itemCode})</p>
                    <p><strong>Batch Quantity:</strong> ${batch.quantity} pieces</p>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Number of Samples to Measure:</label>
                    <select onchange="InspectionManager.setSampleSize(this.value)" class="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full">
                        <option value="1" ${this.currentSampleSize === 1 ? 'selected' : ''}>1 sample</option>
                        <option value="5" ${this.currentSampleSize === 5 ? 'selected' : ''}>5 samples</option>
                        <option value="10" ${this.currentSampleSize === 10 ? 'selected' : ''}>10 samples</option>
                        <option value="20" ${this.currentSampleSize === 20 ? 'selected' : ''}>20 samples</option>
                        <option value="custom">Custom number...</option>
                    </select>
                    <p class="text-xs text-gray-500 mt-1">Measuring ${this.currentSampleSize} of ${batch.quantity} pieces (${((this.currentSampleSize/batch.quantity)*100).toFixed(1)}% sampling)</p>
                </div>
            </div>
        `;

        // Dimension inputs with multiple samples
        const dimensionsContainer = document.getElementById('inspectionFormDimensions');
        dimensionsContainer.innerHTML = batch.itemDimensions.map((dim, dimIndex) => `
            <div class="border border-gray-200 rounded-lg p-4 bg-white mb-4">
                <div class="mb-3 pb-3 border-b bg-gradient-to-r from-blue-50 to-indigo-50 -m-4 p-4 rounded-t-lg">
                    <h5 class="font-bold text-gray-800 text-lg">${dim.name}</h5>
                    <p class="text-sm text-gray-600">Target Range: <span class="font-semibold text-green-700">${dim.minValue} - ${dim.maxValue} ${dim.unit}</span></p>
                    <p class="text-xs text-gray-500 mt-1">Tolerance: ±${((dim.maxValue - dim.minValue)/2).toFixed(3)} ${dim.unit}</p>
                </div>
                
                <div class="overflow-x-auto mt-4">
                    <table class="w-full text-sm border-collapse">
                        <thead>
                            <tr class="bg-gray-100">
                                <th class="px-3 py-2 text-left font-semibold border">Sample #</th>
                                <th class="px-3 py-2 text-left font-semibold border">Measurement (${dim.unit})</th>
                                <th class="px-3 py-2 text-center font-semibold border">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Array.from({length: this.currentSampleSize}, (_, sampleIndex) => `
                                <tr class="border-t hover:bg-gray-50">
                                    <td class="px-3 py-2 font-medium border">Sample ${sampleIndex + 1}</td>
                                    <td class="px-3 py-2 border">
                                        <input type="number" 
                                               step="0.001" 
                                               id="inspection-${dimIndex}-${sampleIndex}" 
                                               placeholder="Enter value" 
                                               onchange="InspectionManager.checkSampleTolerance(${dimIndex}, ${sampleIndex}, ${dim.minValue}, ${dim.maxValue})"
                                               class="border border-gray-300 rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500">
                                    </td>
                                    <td class="px-3 py-2 border text-center">
                                        <div id="inspection-result-${dimIndex}-${sampleIndex}" class="text-xs font-semibold"></div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <!-- Summary Stats -->
                <div id="inspection-summary-${dimIndex}" class="mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg hidden">
                    <h6 class="font-semibold text-gray-700 mb-2 text-sm">📊 Statistical Summary:</h6>
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div class="bg-white p-2 rounded shadow-sm">
                            <div class="text-xs text-gray-500">Minimum</div>
                            <div class="font-bold text-blue-700" id="min-${dimIndex}">-</div>
                        </div>
                        <div class="bg-white p-2 rounded shadow-sm">
                            <div class="text-xs text-gray-500">Maximum</div>
                            <div class="font-bold text-blue-700" id="max-${dimIndex}">-</div>
                        </div>
                        <div class="bg-white p-2 rounded shadow-sm">
                            <div class="text-xs text-gray-500">Average</div>
                            <div class="font-bold text-blue-700" id="avg-${dimIndex}">-</div>
                        </div>
                        <div class="bg-white p-2 rounded shadow-sm">
                            <div class="text-xs text-gray-500">Range</div>
                            <div class="font-bold text-blue-700" id="range-${dimIndex}">-</div>
                        </div>
                        <div class="bg-white p-2 rounded shadow-sm">
                            <div class="text-xs text-gray-500">Overall</div>
                            <div class="font-bold" id="status-${dimIndex}">-</div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    static checkSampleTolerance(dimIndex, sampleIndex, minValue, maxValue) {
        const actualInput = document.getElementById(`inspection-${dimIndex}-${sampleIndex}`);
        const resultDiv = document.getElementById(`inspection-result-${dimIndex}-${sampleIndex}`);
        const actual = parseFloat(actualInput.value);

        if (isNaN(actual)) {
            resultDiv.innerHTML = '';
            actualInput.classList.remove('bg-green-50', 'bg-red-50', 'bg-amber-50');
            return;
        }

        const tolerance = (maxValue - minValue) * 0.1;
        
        if (actual >= minValue && actual <= maxValue) {
            if (actual < minValue + tolerance || actual > maxValue - tolerance) {
                resultDiv.innerHTML = '<span class="text-amber-600"><i class="fas fa-exclamation-triangle"></i> WARN</span>';
                actualInput.classList.remove('bg-green-50', 'bg-red-50');
                actualInput.classList.add('bg-amber-50');
            } else {
                resultDiv.innerHTML = '<span class="text-green-600"><i class="fas fa-check-circle"></i> PASS</span>';
                actualInput.classList.remove('bg-red-50', 'bg-amber-50');
                actualInput.classList.add('bg-green-50');
            }
        } else {
            resultDiv.innerHTML = `<span class="text-red-600"><i class="fas fa-times-circle"></i> FAIL</span>`;
            actualInput.classList.remove('bg-green-50', 'bg-amber-50');
            actualInput.classList.add('bg-red-50');
        }
        
        // Update summary stats
        this.updateDimensionSummary(dimIndex, minValue, maxValue);
    }

    static updateDimensionSummary(dimIndex, minValue, maxValue) {
        const values = [];
        for (let i = 0; i < this.currentSampleSize; i++) {
            const input = document.getElementById(`inspection-${dimIndex}-${i}`);
            if (input) {
                const val = parseFloat(input.value);
                if (!isNaN(val)) values.push(val);
            }
        }
        
        if (values.length === 0) return;
        
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const range = max - min;
        
        const allPass = values.every(v => v >= minValue && v <= maxValue);
        const anyFail = values.some(v => v < minValue || v > maxValue);
        
        document.getElementById(`min-${dimIndex}`).textContent = min.toFixed(3);
        document.getElementById(`max-${dimIndex}`).textContent = max.toFixed(3);
        document.getElementById(`avg-${dimIndex}`).textContent = avg.toFixed(3);
        document.getElementById(`range-${dimIndex}`).textContent = range.toFixed(3);
        
        const statusSpan = document.getElementById(`status-${dimIndex}`);
        if (anyFail) {
            statusSpan.innerHTML = '<span class="text-red-600 font-bold">REJECT</span>';
        } else if (allPass) {
            statusSpan.innerHTML = '<span class="text-green-600 font-bold">ACCEPT</span>';
        } else {
            statusSpan.innerHTML = '<span class="text-amber-600 font-bold">PARTIAL</span>';
        }
        
        document.getElementById(`inspection-summary-${dimIndex}`).classList.remove('hidden');
    }

    static async saveFromTab() {
        const batchId = document.getElementById('inspectionBatchSelect').value;
        const inspectorName = document.getElementById('inspectorName').value.trim();
        const notes = document.getElementById('inspectionFormNotes').value.trim();
        
        if (!batchId) {
            UI.showToast('Please select a batch', 'error');
            return;
        }

        if (!inspectorName) {
            UI.showToast('Please enter inspector name', 'error');
            return;
        }

        const batch = this.currentBatchForInspection;
        if (!batch) {
            UI.showToast('Batch not found', 'error');
            return;
        }

        // Collect measurements for all samples
        const measurements = batch.itemDimensions.map((dim, dimIndex) => {
            const samples = [];
            for (let sampleIndex = 0; sampleIndex < this.currentSampleSize; sampleIndex++) {
                const actualInput = document.getElementById(`inspection-${dimIndex}-${sampleIndex}`);
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
                
                samples.push({
                    sampleNumber: sampleIndex + 1,
                    value: isNaN(actual) ? null : actual,
                    status: status
                });
            }
            
            // Calculate statistics
            const validSamples = samples.filter(s => s.value !== null).map(s => s.value);
            const stats = validSamples.length > 0 ? {
                min: Math.min(...validSamples),
                max: Math.max(...validSamples),
                avg: validSamples.reduce((a, b) => a + b, 0) / validSamples.length,
                count: validSamples.length
            } : null;
            
            return {
                name: dim.name,
                target: `${dim.minValue} - ${dim.maxValue} ${dim.unit}`,
                unit: dim.unit,
                samples: samples,
                statistics: stats,
                overallStatus: samples.some(s => s.status === 'fail') ? 'fail' : 
                              samples.some(s => s.status === 'warning') ? 'warning' : 'pass'
            };
        });

        const inspection = {
            timestamp: new Date().toISOString(),
            inspector: inspectorName,
            sampleSize: this.currentSampleSize,
            batchQuantity: batch.quantity,
            samplingPercentage: ((this.currentSampleSize / batch.quantity) * 100).toFixed(1),
            measurements: measurements,
            notes: notes,
            overallStatus: measurements.some(m => m.overallStatus === 'fail') ? 'rejected' : 
                          measurements.some(m => m.overallStatus === 'warning') ? 'conditional' : 'approved'
        };

        if (!batch.inspections) batch.inspections = [];
        batch.inspections.push(inspection);

        try {
            await api.updateBatch(batchId, { inspections: batch.inspections });
            this.clearForm();
            await this.renderAllReports();
            UI.showToast(`Inspection saved: ${inspection.overallStatus.toUpperCase()} (${this.currentSampleSize} samples)`, 
                        inspection.overallStatus === 'approved' ? 'success' : 'info');
        } catch (error) {
            console.error('Failed to save inspection:', error);
            UI.showToast('Failed to save inspection', 'error');
        }
    }

    static clearForm() {
        document.getElementById('inspectionBatchSelect').value = '';
        document.getElementById('inspectorName').value = '';
        document.getElementById('inspectionFormNotes').value = '';
        document.getElementById('inspectionFormPreview').classList.add('hidden');
        this.currentSampleSize = 1;
        this.currentBatchForInspection = null;
    }

    static async renderAllReports() {
        const container = document.getElementById('inspectionReportsList');
        const batchFilter = document.getElementById('inspectionFilterBatch').value;
        const statusFilter = document.getElementById('inspectionFilterStatus').value;
        
        const batches = await api.getBatches();
        let allInspections = [];
        
        batches.forEach(batch => {
            if (batch.inspections && batch.inspections.length > 0) {
                batch.inspections.forEach((inspection, idx) => {
                    allInspections.push({
                        ...inspection,
                        batchId: batch._id,
                        batchNumber: batch.batchNumber,
                        itemName: batch.itemName,
                        inspectionIndex: idx
                    });
                });
            }
        });

        // Apply filters
        if (batchFilter !== 'all') {
            allInspections = allInspections.filter(i => i.batchId === batchFilter);
        }
        if (statusFilter !== 'all') {
            allInspections = allInspections.filter(i => i.overallStatus === statusFilter);
        }

        // Sort by timestamp (newest first)
        allInspections.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (allInspections.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No inspection reports found.</p>';
            return;
        }

        const statusColors = {
            approved: 'bg-green-100 text-green-800 border-green-300',
            conditional: 'bg-amber-100 text-amber-800 border-amber-300',
            rejected: 'bg-red-100 text-red-800 border-red-300'
        };

        container.innerHTML = allInspections.map(inspection => `
            <div class="border-l-4 ${statusColors[inspection.overallStatus]} bg-white rounded-lg p-4 shadow-sm mb-4">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h4 class="font-bold text-gray-800">${inspection.batchNumber} - ${inspection.itemName}</h4>
                        <p class="text-sm text-gray-600">${new Date(inspection.timestamp).toLocaleString()}</p>
                        <p class="text-sm text-gray-600">Inspector: ${inspection.inspector}</p>
                        ${inspection.sampleSize ? `<p class="text-sm text-blue-600"><i class="fas fa-vial mr-1"></i>${inspection.sampleSize} samples measured (${inspection.samplingPercentage}% of batch)</p>` : ''}
                    </div>
                    <span class="px-3 py-1 rounded-full text-sm font-semibold ${statusColors[inspection.overallStatus]}">
                        ${inspection.overallStatus.toUpperCase()}
                    </span>
                </div>
                
                <div class="mb-3">
                    <h5 class="font-semibold text-gray-700 mb-2 text-sm">Measurements:</h5>
                    ${inspection.measurements.map(m => {
                        // Check if this is multi-sample or single sample
                        if (m.samples && m.samples.length > 1) {
                            // Multi-sample report
                            const statusIcons = {
                                pass: '<i class="fas fa-check-circle text-green-600"></i>',
                                warning: '<i class="fas fa-exclamation-triangle text-amber-600"></i>',
                                fail: '<i class="fas fa-times-circle text-red-600"></i>',
                                not_measured: '<i class="fas fa-minus-circle text-gray-400"></i>'
                            };
                            
                            return `
                                <div class="bg-gray-50 rounded p-3 mb-2">
                                    <div class="flex justify-between items-start mb-2">
                                        <span class="font-semibold text-gray-800">${m.name}:</span>
                                        <span class="text-sm font-semibold ${m.overallStatus === 'fail' ? 'text-red-600' : m.overallStatus === 'warning' ? 'text-amber-600' : 'text-green-600'}">
                                            ${m.overallStatus.toUpperCase()}
                                        </span>
                                    </div>
                                    <div class="grid grid-cols-5 gap-2 text-xs mb-2">
                                        ${m.samples.map(s => `
                                            <div class="text-center p-1 bg-white rounded border ${s.status === 'fail' ? 'border-red-300' : s.status === 'warning' ? 'border-amber-300' : 'border-green-300'}">
                                                <div class="text-gray-500">#${s.sampleNumber}</div>
                                                <div class="font-semibold">${s.value !== null ? s.value : 'N/A'}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                    ${m.statistics ? `
                                        <div class="grid grid-cols-4 gap-2 text-xs text-gray-600 bg-white p-2 rounded">
                                            <div><strong>Min:</strong> ${m.statistics.min.toFixed(3)}</div>
                                            <div><strong>Max:</strong> ${m.statistics.max.toFixed(3)}</div>
                                            <div><strong>Avg:</strong> ${m.statistics.avg.toFixed(3)}</div>
                                            <div><strong>Target:</strong> ${m.target}</div>
                                        </div>
                                    ` : ''}
                                </div>
                            `;
                        } else {
                            // Single sample report (legacy)
                            const statusIcons = {
                                pass: '<i class="fas fa-check-circle text-green-600"></i>',
                                warning: '<i class="fas fa-exclamation-triangle text-amber-600"></i>',
                                fail: '<i class="fas fa-times-circle text-red-600"></i>',
                                not_measured: '<i class="fas fa-minus-circle text-gray-400"></i>'
                            };
                            return `
                                <div class="text-sm bg-gray-50 rounded px-2 py-1 flex justify-between items-center mb-1">
                                    <span class="font-medium">${m.name}:</span>
                                    <span>${m.actual !== null ? m.actual + ' ' + m.unit : 'N/A'} ${statusIcons[m.status || 'not_measured']}</span>
                                </div>
                            `;
                        }
                    }).join('')}
                </div>
                
                ${inspection.notes ? `<p class="text-sm text-gray-600 italic bg-gray-50 rounded p-2"><strong>Notes:</strong> ${inspection.notes}</p>` : ''}
            </div>
        `).join('');
    }

    static async filterReports() {
        await this.renderAllReports();
    }

    // Legacy single-sample modal support (for tracking tab)
    static async generateReport() {
        const batchId = document.getElementById('trackingBatchSelect').value;
        if (!batchId) {
            UI.showToast('Please select a batch first', 'error');
            return;
        }

        const batches = await api.getBatches();
        const batch = batches.find(b => b._id === batchId);
        
        if (!batch || !batch.itemDimensions || batch.itemDimensions.length === 0) {
            UI.showToast('No dimensions defined for this item', 'info');
            return;
        }

        // Use the Inspections tab for multi-sample reports
        UI.showTab('inspections');
        document.getElementById('inspectionBatchSelect').value = batchId;
        this.previewDimensions();
        UI.showToast('Please use the Inspection Reports tab for multi-sample inspection', 'info');
    }
}

// Make globally accessible
window.InspectionManager = InspectionManager;
window.generateInspectionReport = () => InspectionManager.generateReport();
window.previewInspectionDimensions = () => InspectionManager.previewDimensions();
window.saveInspectionFromTab = () => InspectionManager.saveFromTab();
window.clearInspectionForm = () => InspectionManager.clearForm();
window.filterInspectionReports = () => InspectionManager.filterReports();
