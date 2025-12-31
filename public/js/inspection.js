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

/**
 * Flat list of inspections currently rendered in UI.
 * Each entry also stores batchId so delete works correctly.
 */
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

    // ✅ Determine overall inspection status (ONCE)
    const overallStatus = measurements.some(m =>
        m.samples.some(s =>
            typeof s.value === 'number' &&
            (s.value < m.min || s.value > m.max)
        )
    ) ? 'rejected' : 'approved';

    const inspection = {
        timestamp: new Date().toISOString(),
        inspector,
        sampleSize: this.currentSampleSize,
        overallStatus,
        measurements
    };

    if (!Array.isArray(batch.inspections)) batch.inspections = [];
    batch.inspections.push(inspection);

    await api.updateBatch(batch._id, { inspections: batch.inspections });

    this.clearForm();
    await this.renderAllReports();

    UI.showToast(
        `Inspection saved (${overallStatus.toUpperCase()})`,
        overallStatus === 'approved' ? 'success' : 'error'
    );
};

///////////////////
function getDimensionStatus(measurement) {
    const failed = measurement.samples.some(
        s => typeof s.value === 'number' &&
             (s.value < measurement.min || s.value > measurement.max)
    );

    if (failed) return 'fail';

    const nearLimit = measurement.samples.some(s => {
        if (typeof s.value !== 'number') return false;
        const range = measurement.max - measurement.min;
        const margin = range * 0.1; // 10% tolerance band
        return (
            s.value <= measurement.min + margin ||
            s.value >= measurement.max - margin
        );
    });

    return nearLimit ? 'conditional' : 'pass';
}

// --------------------
// Reports (View + Delete)
// --------------------
InspectionManager.renderAllReports = async function () {
    const container = document.getElementById('inspectionReportsList');
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

    container.innerHTML = inspections.map((i, index) => `
        <div class="
            border rounded p-4 mb-4
            ${i.overallStatus === 'approved'
                ? 'border-l-4 border-green-500'
                : 'border-l-4 border-red-500'}
        ">
            <div class="flex justify-between items-start">
                <div>
                    <div class="flex items-center gap-3">
                        <h4 class="font-bold">${i.batchNumber} – ${i.itemName}</h4>
                        <span class="
                            text-xs font-semibold px-2 py-1 rounded
                            ${i.overallStatus === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'}
                        ">
                            ${(i.overallStatus || 'unknown').toUpperCase()}
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

           ${i.measurements.map(m => `
                ${(() => {
                    const failed = m.samples.some(
                        s => typeof s.value === 'number' && (s.value < m.min || s.value > m.max)
                    );
            
                    const nearLimit = !failed && m.samples.some(s => {
                        if (typeof s.value !== 'number') return false;
                        const range = m.max - m.min;
                        const margin = range * 0.1;
                        return s.value <= m.min + margin || s.value >= m.max - margin;
                    });
            
                    const status = failed ? 'fail' : nearLimit ? 'conditional' : 'pass';
            
                    const styles = {
                        pass: 'border-green-500 bg-green-50 text-green-800',
                        conditional: 'border-amber-500 bg-amber-50 text-amber-800',
                        fail: 'border-red-500 bg-red-50 text-red-800'
                    };
            
                    const labels = {
                        pass: 'PASS',
                        conditional: 'CONDITIONAL',
                        fail: 'FAIL'
                    };
            
                    return `
                        <div class="mt-4 border-l-4 ${styles[status]} p-3 rounded">
                            <div class="flex justify-between items-center mb-1">
                                <div class="font-semibold">${m.name}</div>
                                <span class="text-xs font-bold">${labels[status]}</span>
                            </div>
            
                            <div class="text-xs mb-2">
                                Target: ${m.target}
                            </div>
            
                            <div class="flex flex-wrap gap-2">
                                ${m.samples.map(s => {
                                    const out = typeof s.value === 'number' &&
                                                (s.value < m.min || s.value > m.max);
            
                                    return `
                                        <span class="
                                            border px-2 py-1 text-xs rounded
                                            ${out ? 'border-red-500 text-red-700' : 'border-gray-300'}
                                        ">
                                            S${s.sampleNumber}: ${s.value ?? '—'}
                                        </span>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                })()}
            `).join('')}


// --------------------
// Delete inspection (HARD DELETE)
// --------------------
InspectionManager.deleteInspection = async function (index) {
    const inspection = this.currentRenderedInspections[index];
    if (!inspection) return;

    const ok = confirm(
        `Delete inspection for batch ${inspection.batchNumber}?\nThis action cannot be undone.`
    );
    if (!ok) return;

    const batches = await api.getBatches();
    const batch = batches.find(b => b._id === inspection.batchId);
    if (!batch || !Array.isArray(batch.inspections)) return;

    batch.inspections = batch.inspections.filter(
        i => i.timestamp !== inspection.timestamp
    );

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
