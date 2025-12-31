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
            target: `${dim.minValue} – ${dim.maxValue} ${dim.unit}`,
            samples
        };
    }).filter(Boolean);

    if (!measurements.length) {
        UI.showToast('No valid measurements entered', 'error');
        return;
    }

    const inspection = {
        timestamp: new Date().toISOString(), // used as delete key
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
// Reports (View + Delete)
// --------------------
InspectionManager.renderAllReports = async function () {
    const container = document.getElementById('inspectionReportsList');
    const batches = await api.getBatches();
    let inspections = [];

    // Flatten inspections and retain batchId for delete
    batches.forEach(b => {
        (b.inspections || []).forEach(i => {
    
            // 🔒 Skip malformed / legacy inspections
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
        <div class="border rounded p-4 mb-4">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold">${i.batchNumber} – ${i.itemName}</h4>
                    <p class="text-sm">${new Date(i.timestamp).toLocaleString()}</p>
                    <p class="text-sm">Inspector: ${i.inspector}</p>
                </div>

                <button
                    class="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                    onclick="InspectionManager.deleteInspection(${index})">
                    Delete
                </button>
            </div>

            ${Array.isArray(i.measurements) ? i.measurements.map(m => `
                <div class="mt-2">
                    <strong>${m.name}</strong> (Target: ${m.target})
                    <div class="flex gap-2 mt-1">
                        ${m.samples.map(s => `
                            <span class="border px-2 py-1 text-xs">
                                S${s.sampleNumber}: ${s.value ?? '—'}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('') : ''}
};

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

    // Remove inspection using timestamp as unique key
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

console.log('✅ InspectionManager base loaded');
