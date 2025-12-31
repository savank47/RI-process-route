// ========================================
// inspection.js
// Purpose: Sample-based inspection entry & reporting
// Scope: UI + data only (NO PDF, NO EXPORT)
// ========================================

console.log('inspection.js loaded');

class InspectionManager {}

// --------------------
// State
// --------------------
InspectionManager.currentSampleSize = 1;
InspectionManager.currentBatchForInspection = null;
InspectionManager.currentRenderedInspections = [];

// --------------------
// Tab lifecycle
// --------------------
InspectionManager.renderTab = async function () {
    await this.updateBatchSelect();
    await this.renderAllReports();
};

// --------------------
// Batch selectors
// --------------------
InspectionManager.updateBatchSelect = async function () {
    const select = document.getElementById('inspectionBatchSelect');
    const filterSelect = document.getElementById('inspectionFilterBatch');
    const batches = await api.getBatches();

    select.innerHTML =
        '<option value="">-- Select Batch --</option>' +
        batches.map(b => `<option value="${b._id}">${b.batchNumber} - ${b.itemName}</option>`).join('');

    if (filterSelect) {
        filterSelect.innerHTML =
            '<option value="all">All Batches</option>' +
            batches.map(b => `<option value="${b._id}">${b.batchNumber}</option>`).join('');
    }
};

// --------------------
// Sample size
// --------------------
InspectionManager.setSampleSize = function (value) {
    if (value === 'custom') {
        const v = parseInt(prompt('Enter number of samples:', '5'), 10);
        if (!v || v <= 0) return;
        this.currentSampleSize = v;
    } else {
        this.currentSampleSize = parseInt(value, 10) || 1;
    }

    const batchId = document.getElementById('inspectionBatchSelect').value;
    if (batchId) this.previewDimensions();
};

// --------------------
// Preview inspection form
// --------------------
InspectionManager.previewDimensions = async function () {
    const batchId = document.getElementById('inspectionBatchSelect').value;
    const preview = document.getElementById('inspectionFormPreview');

    if (!batchId) {
        preview.classList.add('hidden');
        return;
    }

    const batches = await api.getBatches();
    const batch = batches.find(b => b._id === batchId);

    if (!batch || !Array.isArray(batch.itemDimensions)) {
        UI.showToast('No dimensions defined for this batch', 'info');
        preview.classList.add('hidden');
        return;
    }

    this.currentBatchForInspection = batch;
    preview.classList.remove('hidden');

    document.getElementById('inspectionFormBatchInfo').innerHTML = `
        <p><strong>Batch:</strong> ${batch.batchNumber}</p>
        <p><strong>Item:</strong> ${batch.itemName}</p>
        <p><strong>Quantity:</strong> ${batch.quantity}</p>
    `;

    const container = document.getElementById('inspectionFormDimensions');
    container.innerHTML = Array.from({ length: this.currentSampleSize }, (_, sIdx) => `
        <div class="border rounded p-4 mb-4">
            <h4 class="font-bold mb-2">Sample ${sIdx + 1}</h4>
            ${batch.itemDimensions.map((dim, dIdx) => `
                <div class="mb-2">
                    <label class="text-sm font-semibold">${dim.name}</label>
                    <div class="flex gap-2">
                        <input
                            type="number"
                            step="0.001"
                            id="inspection-${sIdx}-${dIdx}"
                            class="border rounded px-2 py-1 w-full"
                        />
                        <span class="text-sm">${dim.unit}</span>
                    </div>
                    <div class="text-xs text-gray-500">
                        Target: ${dim.minValue} – ${dim.maxValue}
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');
};

// --------------------
// Save inspection
// --------------------
InspectionManager.saveFromTab = async function () {
    const batch = this.currentBatchForInspection;
    if (!batch) return;

    const inspector = document.getElementById('inspectorName').value.trim();
    if (!inspector) {
        UI.showToast('Inspector name required', 'error');
        return;
    }

    const measurements = batch.itemDimensions.map((dim, dIdx) => {
        const samples = [];

        for (let s = 0; s < this.currentSampleSize; s++) {
            const input = document.getElementById(`inspection-${s}-${dIdx}`);
            const value = input && input.value !== '' ? parseFloat(input.value) : null;

            samples.push({
                sampleNumber: s + 1,
                value
            });
        }

        if (!samples.some(s => typeof s.value === 'number')) return null;

        return {
            name: dim.name,
            unit: dim.unit,
            min: dim.minValue,
            max: dim.maxValue,
            target: `${dim.minValue} – ${dim.maxValue} ${dim.unit}`,
            samples
        };
    }).filter(Boolean);

    if (!measurements.length) {
        UI.showToast('No valid measurements entered', 'error');
        return;
    }

    const inspection = {
        timestamp: new Date().toISOString(),
        inspector,
        sampleSize: this.currentSampleSize,
        measurements
    };

    if (!Array.isArray(batch.inspections)) batch.inspections = [];
    batch.inspections.push(inspection);

    await api.updateBatch(batch._id, { inspections: batch.inspections });

    this.clearForm();
    await this.renderAllReports();

    UI.showToast('Inspection saved', 'success');
};

// --------------------
// STATUS + DEVIATION HELPERS
// --------------------
function isOutOfTolerance(value, min, max) {
    return typeof value === 'number' && (value < min || value > max);
}

function getDeviation(value, min, max) {
    const nominal = (min + max) / 2;
    return (value - nominal).toFixed(2);
}

function getDimensionStatus(m) {
    return m.samples.some(s => isOutOfTolerance(s.value, m.min, m.max))
        ? 'fail'
        : 'pass';
}

function getOverallInspectionStatus(measurements) {
    return measurements.some(m => getDimensionStatus(m) === 'fail')
        ? 'rejected'
        : 'approved';
}

// --------------------
// Reports (View + Delete)
// --------------------
InspectionManager.renderAllReports = async function () {
    const container = document.getElementById('inspectionReportsList');

    // Ensure report canvas background (prevents white-on-white bleed)
    container.classList.add('bg-gray-50', 'p-6');
    
    const batches = await api.getBatches();
    let inspections = [];

    batches.forEach(b => {
        (b.inspections || []).forEach(i => {
            if (!i || !Array.isArray(i.measurements)) return;
            inspections.push({
                ...i,
                batchId: b._id,
                batchNumber: b.batchNumber,
                itemName: b.itemName
            });
        });
    });

    this.currentRenderedInspections = inspections;

    if (!inspections.length) {
        container.innerHTML = '<p class="text-gray-500">No inspections found</p>';
        return;
    }

    container.innerHTML = inspections.map((i, index) => {
        const overallStatus = getOverallInspectionStatus(i.measurements);

        return `
            <div class="
                    border-l-4 ${overallStatus === 'approved' ? 'border-green-500' : 'border-red-500'}
                    bg-white
                    rounded-lg
                    shadow-md
                    p-5
                    mb-10
                ">

            <!-- Header -->
            <div class="flex justify-between items-start mb-3">
                <div>
                    <div class="flex items-center gap-3">
                        <h4 class="font-bold">${i.batchNumber} – ${i.itemName}</h4>
                        <span class="text-xs font-semibold px-2 py-1 rounded
                            ${overallStatus === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'}">
                            ${overallStatus.toUpperCase()}
                        </span>
                    </div>
                    <p class="text-sm">${new Date(i.timestamp).toLocaleString()}</p>
                    <p class="text-sm">Inspector: ${i.inspector}</p>
                </div>

                <button
                    class="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                    onclick="InspectionManager.deleteInspection(${index})">
                    Delete
                </button>
            </div>

            <!-- Dimensions -->
            ${i.measurements.map(m => `
                <div class="mb-6 bg-gray-50 rounded-md p-4 shadow-sm">
                    <div class="flex justify-between items-center mb-1">
                        <div class="font-semibold text-gray-800">${m.name}</div>
                        <span class="text-xs font-bold ${
                            getDimensionStatus(m) === 'fail'
                                ? 'text-red-700'
                                : 'text-green-600'
                        }">
                            ${getDimensionStatus(m).toUpperCase()}
                        </span>
                    </div>

                    <div class="text-xs text-gray-600 mb-2">
                        Target: ${
                            m.min !== undefined && m.max !== undefined
                                ? `${m.min} – ${m.max} ${m.unit}`
                                : m.target || 'N/A'
                        }
                    </div>

                    <div class="flex flex-wrap gap-2">
                        ${m.samples.map(s => {
                            const out = isOutOfTolerance(s.value, m.min, m.max);
                            const deviation = out ? getDeviation(s.value, m.min, m.max) : null;

                            return `
                            <div class="px-3 py-1.5 min-w-[64px] rounded border text-center text-xs
                                ${out
                                    ? 'border-red-500 bg-red-50 text-red-800'
                                    : 'border-gray-300 bg-white text-gray-800'}">
                                <div class="font-semibold">S${s.sampleNumber}</div>
                                <div>
                                  ${s.value ?? '—'}
                                  ${s.value !== null && m.unit ? ` ${m.unit}` : ''}
                                </div>
                                ${out ? `<div class="text-[11px]">(${deviation > 0 ? '+' : ''}${deviation})</div>` : ''}
                            </div>
                            `;
                        }).join('')}
                    </div>

                </div>
            `).join('')}
        </div>
        `;
    }).join('');
};

// --------------------
// Delete inspection
// --------------------
InspectionManager.deleteInspection = async function (index) {
    const inspection = this.currentRenderedInspections[index];
    if (!inspection) return;

    if (!confirm(`Delete inspection for batch ${inspection.batchNumber}?`)) return;

    const batches = await api.getBatches();
    const batch = batches.find(b => b._id === inspection.batchId);
    if (!batch) return;

    batch.inspections = batch.inspections.filter(i => i.timestamp !== inspection.timestamp);
    await api.updateBatch(batch._id, { inspections: batch.inspections });

    await this.renderAllReports();
    UI.showToast('Inspection deleted', 'success');
};

// --------------------
// Clear
// --------------------
InspectionManager.clearForm = function () {
    document.getElementById('inspectionFormPreview').classList.add('hidden');
    document.getElementById('inspectionBatchSelect').value = '';
    document.getElementById('inspectorName').value = '';
    this.currentSampleSize = 1;
    this.currentBatchForInspection = null;
};

// --------------------
// Globals
// --------------------
window.InspectionManager = InspectionManager;
window.saveInspectionFromTab = () => InspectionManager.saveFromTab();
window.previewInspectionDimensions = () => InspectionManager.previewDimensions();
window.filterInspectionReports = () => InspectionManager.renderAllReports();

console.log('✅ InspectionManager loaded successfully');
