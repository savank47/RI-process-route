// ========================================
// FRONTEND JAVASCRIPT MODULE
// File: js/inspection.js
// Purpose: Inspection reports with multi-sample support (SAMPLE-FOCUSED LAYOUT)
// Runs on: Browser (Client-side)
// ========================================
console.log('inspection.js loaded');

class InspectionManager {}

// Initialize static properties
InspectionManager.currentSampleSize = 1;
InspectionManager.currentBatchForInspection = null;

// Render Inspection Reports Tab
InspectionManager.renderTab = async function() {
    console.log('🔍 Inspection Reports tab opened');
    await this.updateBatchSelect();
    await this.renderAllReports();
};

// Update batch select dropdowns
InspectionManager.updateBatchSelect = async function() {
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
};

// Set sample size
InspectionManager.setSampleSize = function(value) {
    if (value === 'custom') {
        const customSize = prompt('Enter number of samples to measure:', '5');
        if (customSize && !isNaN(customSize) && parseInt(customSize) > 0) {
            this.currentSampleSize = parseInt(customSize);
        } else {
            return;
        }
    } else {
        this.currentSampleSize = parseInt(value) || 1;
    }
    
    console.log('📊 Sample size changed to:', this.currentSampleSize);
    
    const batchId = document.getElementById('inspectionBatchSelect').value;
    if (batchId) {
        this.previewDimensions();
    }
};

// Preview dimensions (SAMPLE-FOCUSED LAYOUT)
InspectionManager.previewDimensions = async function() {
    if (!this.currentSampleSize) this.currentSampleSize = 1;
    
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
    
    console.log('📋 Preview inspection for batch:', batch.batchNumber, 'with', this.currentSampleSize, 'samples');
    
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

    // SAMPLE-FOCUSED LAYOUT: One card per sample
    const dimensionsContainer = document.getElementById('inspectionFormDimensions');
    dimensionsContainer.innerHTML = Array.from({length: this.currentSampleSize}, (_, sampleIndex) => `
        <div class="border-2 border-blue-200 rounded-lg p-5 bg-gradient-to-br from-white to-blue-50 mb-4 shadow-md">
            <div class="flex items-center justify-between mb-4 pb-3 border-b-2 border-blue-300">
                <h4 class="text-xl font-bold text-blue-800">
                    <i class="fas fa-vial mr-2"></i>Sample #${sampleIndex + 1}
                </h4>
                <div id="sample-status-${sampleIndex}" class="text-sm font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                    Not measured
                </div>
            </div>
            
            <div class="space-y-3">
                ${batch.itemDimensions.map((dim, dimIndex) => `
                    <div class="bg-white rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition">
                        <div class="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                            <div class="md:col-span-3">
                                <label class="font-semibold text-gray-800">${dim.name}</label>
                                <p class="text-xs text-gray-500">Target: ${dim.minValue}-${dim.maxValue} ${dim.unit}</p>
                            </div>
                            <div class="md:col-span-4">
                                <input type="number" 
                                       step="0.001" 
                                       id="inspection-${sampleIndex}-${dimIndex}" 
                                       placeholder="Enter measured value" 
                                       onchange="InspectionManager.checkSampleDimension(${sampleIndex}, ${dimIndex}, ${dim.minValue}, ${dim.maxValue})"
                                       class="border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-blue-500">
                            </div>
                            <div class="md:col-span-2 text-center">
                                <span class="text-sm text-gray-600">${dim.unit}</span>
                            </div>
                            <div class="md:col-span-3 text-right">
                                <div id="inspection-result-${sampleIndex}-${dimIndex}" class="text-sm font-semibold"></div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
    
    // Add summary section at the bottom
    dimensionsContainer.innerHTML += `
        <div class="mt-6 p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200">
            <h4 class="text-lg font-bold text-purple-800 mb-4">
                <i class="fas fa-chart-bar mr-2"></i>Statistical Summary (All Samples)
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-${Math.min(batch.itemDimensions.length, 4)} gap-4">
                ${batch.itemDimensions.map((dim, dimIndex) => `
                    <div class="bg-white rounded-lg p-4 shadow-sm">
                        <h5 class="font-semibold text-gray-800 mb-3">${dim.name}</h5>
                        <div class="space-y-2 text-sm">
                            <div class="flex justify-between">
                                <span class="text-gray-600">Min:</span>
                                <span id="summary-min-${dimIndex}" class="font-bold text-blue-700">-</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Max:</span>
                                <span id="summary-max-${dimIndex}" class="font-bold text-blue-700">-</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Avg:</span>
                                <span id="summary-avg-${dimIndex}" class="font-bold text-blue-700">-</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-gray-600">Status:</span>
                                <span id="summary-status-${dimIndex}" class="font-bold">-</span>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
};

// Check sample dimension (SAMPLE-FOCUSED)
InspectionManager.checkSampleDimension = function(sampleIndex, dimIndex, minValue, maxValue) {
    const actualInput = document.getElementById(`inspection-${sampleIndex}-${dimIndex}`);
    const resultDiv = document.getElementById(`inspection-result-${sampleIndex}-${dimIndex}`);
    const actual = parseFloat(actualInput.value);

    if (isNaN(actual)) {
        resultDiv.innerHTML = '';
        actualInput.classList.remove('bg-green-50', 'bg-red-50', 'bg-amber-50');
        return;
    }

    const tolerance = (maxValue - minValue) * 0.1;
    
    if (actual >= minValue && actual <= maxValue) {
        if (actual < minValue + tolerance || actual > maxValue - tolerance) {
            resultDiv.innerHTML = '<span class="text-amber-600"><i class="fas fa-exclamation-triangle"></i> WARNING</span>';
            actualInput.classList.remove('bg-green-50', 'bg-red-50');
            actualInput.classList.add('bg-amber-50');
        } else {
            resultDiv.innerHTML = '<span class="text-green-600"><i class="fas fa-check-circle"></i> PASS</span>';
            actualInput.classList.remove('bg-red-50', 'bg-amber-50');
            actualInput.classList.add('bg-green-50');
        }
    } else {
        resultDiv.innerHTML = '<span class="text-red-600"><i class="fas fa-times-circle"></i> FAIL</span>';
        actualInput.classList.remove('bg-green-50', 'bg-amber-50');
        actualInput.classList.add('bg-red-50');
    }
    
    // Update sample overall status
    this.updateSampleStatus(sampleIndex);
    
    // Update dimension summary statistics
    this.updateDimensionSummary(dimIndex, minValue, maxValue);
};

// Update sample status badge
InspectionManager.updateSampleStatus = function(sampleIndex) {
    const batch = this.currentBatchForInspection;
    if (!batch) return;
    
    const statusDiv = document.getElementById(`sample-status-${sampleIndex}`);
    let allMeasured = true;
    let anyFail = false;
    let anyWarning = false;
    
    batch.itemDimensions.forEach((dim, dimIndex) => {
        const input = document.getElementById(`inspection-${sampleIndex}-${dimIndex}`);
        const actual = parseFloat(input.value);
        
        if (isNaN(actual)) {
            allMeasured = false;
        } else {
            const tolerance = (dim.maxValue - dim.minValue) * 0.1;
            if (actual < dim.minValue || actual > dim.maxValue) {
                anyFail = true;
            } else if (actual < dim.minValue + tolerance || actual > dim.maxValue - tolerance) {
                anyWarning = true;
            }
        }
    });
    
    if (!allMeasured) {
        statusDiv.className = 'text-sm font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600';
        statusDiv.innerHTML = '<i class="fas fa-hourglass-half mr-1"></i>Incomplete';
    } else if (anyFail) {
        statusDiv.className = 'text-sm font-semibold px-3 py-1 rounded-full bg-red-100 text-red-800';
        statusDiv.innerHTML = '<i class="fas fa-times-circle mr-1"></i>REJECT';
    } else if (anyWarning) {
        statusDiv.className = 'text-sm font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-800';
        statusDiv.innerHTML = '<i class="fas fa-exclamation-triangle mr-1"></i>CONDITIONAL';
    } else {
        statusDiv.className = 'text-sm font-semibold px-3 py-1 rounded-full bg-green-100 text-green-800';
        statusDiv.innerHTML = '<i class="fas fa-check-circle mr-1"></i>ACCEPT';
    }
};

// Update dimension summary statistics
InspectionManager.updateDimensionSummary = function(dimIndex, minValue, maxValue) {
    if (!this.currentSampleSize) return;
    
    const values = [];
    for (let sampleIndex = 0; sampleIndex < this.currentSampleSize; sampleIndex++) {
        const input = document.getElementById(`inspection-${sampleIndex}-${dimIndex}`);
        if (input) {
            const val = parseFloat(input.value);
            if (!isNaN(val)) values.push(val);
        }
    }
    
    if (values.length === 0) return;
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    
    const allPass = values.every(v => v >= minValue && v <= maxValue);
    const anyFail = values.some(v => v < minValue || v > maxValue);
    
    document.getElementById(`summary-min-${dimIndex}`).textContent = min.toFixed(3);
    document.getElementById(`summary-max-${dimIndex}`).textContent = max.toFixed(3);
    document.getElementById(`summary-avg-${dimIndex}`).textContent = avg.toFixed(3);
    
    const statusSpan = document.getElementById(`summary-status-${dimIndex}`);
    if (anyFail) {
        statusSpan.innerHTML = '<span class="text-red-600">REJECT</span>';
    } else if (allPass) {
        statusSpan.innerHTML = '<span class="text-green-600">ACCEPT</span>';
    } else {
        statusSpan.innerHTML = '<span class="text-amber-600">PARTIAL</span>';
    }
};

// Save inspection from tab
InspectionManager.saveFromTab = async function () {
    if (!this.currentSampleSize) this.currentSampleSize = 1;

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

    // Build measurements
    const measurements = batch.itemDimensions.map((dim, dimIndex) => {
        const samples = [];

        for (let sampleIndex = 0; sampleIndex < this.currentSampleSize; sampleIndex++) {
            const input = document.getElementById(`inspection-${sampleIndex}-${dimIndex}`);
            const value = input && input.value !== '' ? parseFloat(input.value) : null;

            let status = 'not_measured';

            if (value !== null && !isNaN(value)) {
                if (value < dim.minValue || value > dim.maxValue) {
                    status = 'fail';
                } else {
                    const tolerance = (dim.maxValue - dim.minValue) * 0.1;
                    status =
                        value < dim.minValue + tolerance ||
                        value > dim.maxValue - tolerance
                            ? 'warning'
                            : 'pass';
                }
            }

            samples.push({
                sampleNumber: sampleIndex + 1,
                value,
                status
            });
        }

        const validValues = samples
            .filter(s => typeof s.value === 'number')
            .map(s => s.value);

        if (validValues.length === 0) {
            return null; // ❌ invalid dimension
        }

        const min = Math.min(...validValues);
        const max = Math.max(...validValues);
        const avg = validValues.reduce((a, b) => a + b, 0) / validValues.length;

        return {
            name: dim.name,
            unit: dim.unit,
            target: `${dim.minValue} - ${dim.maxValue} ${dim.unit}`,
            actual: avg, // ✅ REQUIRED FOR SUMMARY PANEL
            samples,
            statistics: {
                min,
                max,
                avg,
                count: validValues.length
            },
            overallStatus: samples.some(s => s.status === 'fail')
                ? 'fail'
                : samples.some(s => s.status === 'warning')
                ? 'warning'
                : 'pass'
        };
    }).filter(Boolean); // 🔒 remove invalid dimensions

    if (measurements.length === 0) {
        UI.showToast('No valid measurements entered. Inspection not saved.', 'error');
        return;
    }

    const inspection = {
        timestamp: new Date().toISOString(),
        inspector: inspectorName,
        sampleSize: this.currentSampleSize,
        batchQuantity: batch.quantity,
        samplingPercentage: ((this.currentSampleSize / batch.quantity) * 100).toFixed(1),
        measurements,
        notes,
        overallStatus: measurements.some(m => m.overallStatus === 'fail')
            ? 'rejected'
            : measurements.some(m => m.overallStatus === 'warning')
            ? 'conditional'
            : 'approved'
    };

    if (!Array.isArray(batch.inspections)) batch.inspections = [];
    batch.inspections.push(inspection);

    try {
        await api.updateBatch(batchId, { inspections: batch.inspections });
        this.clearForm();
        await this.renderAllReports();
        UI.showToast(
            `Inspection saved: ${inspection.overallStatus.toUpperCase()}`,
            inspection.overallStatus === 'approved' ? 'success' : 'info'
        );
    } catch (error) {
        console.error('Failed to save inspection:', error);
        UI.showToast('Failed to save inspection', 'error');
    }
};


//     const inspection = {
//         timestamp: new Date().toISOString(),
//         inspector: inspectorName,
//         sampleSize: this.currentSampleSize,
//         batchQuantity: batch.quantity,
//         samplingPercentage: ((this.currentSampleSize / batch.quantity) * 100).toFixed(1),
//         measurements: measurements,
//         notes: notes,
//         overallStatus: measurements.some(m => m.overallStatus === 'fail') ? 'rejected' : 
//                       measurements.some(m => m.overallStatus === 'warning') ? 'conditional' : 'approved'
//     };

//     if (!batch.inspections) batch.inspections = [];
//     batch.inspections.push(inspection);

//     try {
//         await api.updateBatch(batchId, { inspections: batch.inspections });
//         this.clearForm();
//         await this.renderAllReports();
//         UI.showToast(`Inspection saved: ${inspection.overallStatus.toUpperCase()} (${this.currentSampleSize} samples)`, 
//                     inspection.overallStatus === 'approved' ? 'success' : 'info');
//     } catch (error) {
//         console.error('Failed to save inspection:', error);
//         UI.showToast('Failed to save inspection', 'error');
//     }
// };


// Clear form
InspectionManager.clearForm = function() {
    document.getElementById('inspectionBatchSelect').value = '';
    document.getElementById('inspectorName').value = '';
    document.getElementById('inspectionFormNotes').value = '';
    document.getElementById('inspectionFormPreview').classList.add('hidden');
    this.currentSampleSize = 1;
    this.currentBatchForInspection = null;
};

// Report Visibility – New Inspection Format Only
function renderInspectionMeasurements(inspection) {
    if (!Array.isArray(inspection.measurements)) {
        return '';
    }

    return inspection.measurements.map(m => {
        const status = m.overallStatus || 'pass';

        // 🔒 SAFETY: ensure samples is always an array
        const samples = Array.isArray(m.samples) ? m.samples : [];

        return `
            <div class="bg-gray-50 rounded p-3 mb-3 border">

                <!-- Dimension header -->
                <div class="flex justify-between items-center mb-2">
                    <span class="font-semibold text-gray-800">${m.name}</span>
                    <span class="text-sm font-semibold ${
                        status === 'fail'
                            ? 'text-red-600'
                            : status === 'warning'
                            ? 'text-amber-600'
                            : 'text-green-600'
                    }">
                        ${status.toUpperCase()}
                    </span>
                </div>

                <!-- Target -->
                <div class="text-sm text-gray-700 mb-2">
                    <strong>Target:</strong> ${m.target}
                </div>

                <!-- Actual values -->
                <div class="grid grid-cols-5 gap-2 text-xs">
                    ${samples
                        .filter(s => typeof s.value === 'number')
                        .map(s => `
                            <div class="text-center p-2 bg-white rounded border">
                                <div class="text-gray-500">Sample ${s.sampleNumber}</div>
                                <div class="font-semibold">${s.value}</div>
                            </div>
                        `)
                        .join('')}
                </div>

            </div>
        `;
    }).join('');
}



// Render all reports
// Render all reports
InspectionManager.renderAllReports = async function () {
    const container = document.getElementById('inspectionReportsList');
    const batchFilter = document.getElementById('inspectionFilterBatch').value;
    const statusFilter = document.getElementById('inspectionFilterStatus').value;

    const batches = await api.getBatches();
    let allInspections = [];

    // Collect inspections from all batches
    batches.forEach(batch => {
        if (Array.isArray(batch.inspections)) {
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

    // 🔒 CRITICAL: remove invalid / legacy inspections
    allInspections = allInspections.filter(i =>
        Array.isArray(i.measurements) && i.measurements.length > 0
    );

    // Sort newest first
    allInspections.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (allInspections.length === 0) {
        container.innerHTML =
            '<p class="text-gray-500 text-center py-8">No inspection reports found.</p>';
        return;
    }

    const statusColors = {
        approved: 'bg-green-100 text-green-800 border-green-300',
        conditional: 'bg-amber-100 text-amber-800 border-amber-300',
        rejected: 'bg-red-100 text-red-800 border-red-300'
    };

    container.innerHTML = allInspections.map((inspection, index) => `
        <div id="inspection-report-${index}"
             class="border-l-4 ${statusColors[inspection.overallStatus] || ''} bg-white rounded-lg p-4 shadow-sm mb-4">

            <div class="flex justify-between items-start mb-3">
                <div>
                    <h4 class="font-bold text-gray-800">
                        ${inspection.batchNumber} - ${inspection.itemName}
                    </h4>
                    <p class="text-sm text-gray-600">
                        ${new Date(inspection.timestamp).toLocaleString()}
                    </p>
                    <p class="text-sm text-gray-600">
                        Inspector: ${inspection.inspector || '—'}
                    </p>
                </div>

                <div class="flex flex-col items-end gap-2">
                    <span class="px-3 py-1 rounded-full text-sm font-semibold ${statusColors[inspection.overallStatus] || ''}">
                        ${(inspection.overallStatus || 'approved').toUpperCase()}
                    </span>

                    <button
                        type="button"
                        onclick="InspectionManager.downloadInspectionPDF(${index})"
                        class="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                        Download PDF
                    </button>
                </div>
            </div>

            <div class="mt-3">
                ${renderInspectionMeasurements(inspection)}
            </div>
        </div>
    `).join('');
};


// Filter reports
InspectionManager.filterReports = async function() {
    await this.renderAllReports();
};

// Legacy - generate report from tracking tab
InspectionManager.generateReport = async function() {
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

    // Redirect to Inspections tab
    UI.showTab('inspections');
    document.getElementById('inspectionBatchSelect').value = batchId;
    this.previewDimensions();
    UI.showToast('Please use the Inspection Reports tab for multi-sample inspection', 'info');
};

// ================= PDF DOWNLOAD (PER INSPECTION CARD) =================
InspectionManager.downloadInspectionPDF = function (index) {
    const source = document.getElementById(`inspection-report-${index}`);
    if (!source) {
        alert('Report not found');
        return;
    }

    // Clone report HTML
    const html = source.outerHTML
        .replace(/class="[^"]*"/g, ''); // strip ALL classes

    // Create isolated iframe (NO Tailwind CSS)
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.width = '794';
    iframe.height = '1123';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow.document;

    // Write CLEAN HTML with BASIC CSS ONLY
    doc.open();
    doc.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background: #ffffff;
                    color: #000000;
                    padding: 16px;
                }
                h4 { margin: 0 0 8px 0; }
                .section { margin-bottom: 12px; }
                .row { display: flex; gap: 8px; }
                .box {
                    border: 1px solid #ccc;
                    padding: 6px;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            ${html}
        </body>
        </html>
    `);
    doc.close();

    const target = doc.body;

    html2pdf()
        .set({
            margin: 10,
            filename: `Inspection_Report_${index + 1}.pdf`,
            image: { type: 'jpeg', quality: 0.95 },
            html2canvas: {
                scale: 1,
                backgroundColor: '#ffffff'
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            }
        })
        .from(target)
        .save()
        .then(() => {
            document.body.removeChild(iframe);
        })
        .catch(err => {
            console.error('PDF generation failed:', err);
            document.body.removeChild(iframe);
            alert('PDF generation failed');
        });
};



// Make globally accessible
window.InspectionManager = InspectionManager;
window.generateInspectionReport = () => InspectionManager.generateReport();
window.previewInspectionDimensions = () => InspectionManager.previewDimensions();
window.saveInspectionFromTab = () => InspectionManager.saveFromTab();
window.clearInspectionForm = () => InspectionManager.clearForm();
window.filterInspectionReports = () => InspectionManager.filterReports();

console.log('✅ InspectionManager loaded (SAMPLE-FOCUSED LAYOUT). Sample size:', InspectionManager.currentSampleSize);
