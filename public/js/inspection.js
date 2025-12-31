// ========================================
// inspection.js
// Purpose: Inspection Reports (FINAL / AUDITED)
// Scope: UI + data only
// ========================================

/* ==============================
   Inspection Manager
   ============================== */

const InspectionManager = {};

/* ==============================
   State (required for creation & delete)
   ============================== */

InspectionManager.currentSampleSize = 1;
InspectionManager.currentBatchForInspection = null;
InspectionManager.currentRenderedInspections = [];

/* ==============================
   Utility helpers (DEFENSIVE)
   ============================== */

function isNumber(n) {
    return typeof n === 'number' && !Number.isNaN(n);
}

function normalizeArray(arr) {
    return Array.isArray(arr) ? arr : [];
}

function normalizeMeasurement(m) {
    return {
        ...m,
        min: isNumber(m.min) ? m.min : m.minValue,
        max: isNumber(m.max) ? m.max : m.maxValue
    };
}

function isOutOfTolerance(value, min, max) {
    if (!isNumber(value)) return false;
    if (!isNumber(min) || !isNumber(max)) return false;
    return value < min || value > max;
}

function getDeviation(value, min, max) {
    if (!isNumber(value) || !isNumber(min) || !isNumber(max)) return null;
    if (value < min) return (value - min).toFixed(2);
    if (value > max) return (value - max).toFixed(2);
    return null;
}

function getDimensionStatus(measurement) {
    const samples = normalizeArray(measurement.samples);
    return samples.some(s =>
        isOutOfTolerance(s.value, measurement.min, measurement.max)
    )
        ? 'out'
        : 'ok';
}

function getOutOfToleranceSampleCount(measurements) {
    const outSamples = new Set();

    normalizeArray(measurements).forEach(m => {
        normalizeArray(m.samples).forEach(s => {
            if (isOutOfTolerance(s.value, m.min, m.max)) {
                outSamples.add(s.sampleNumber);
            }
        });
    });

    return outSamples.size;
}

/* ==============================
   TAB ENTRY POINT (UI CONTRACT)
   ============================== */

InspectionManager.renderTab = async function () {
    await InspectionManager.updateBatchSelect();
    await InspectionManager.renderAllReports();
};

/* ==============================
   Batch dropdown (RESTORED)
   ============================== */

InspectionManager.updateBatchSelect = async function () {
    const select = document.getElementById('inspectionBatchSelect');
    if (!select) return;

    let batches = [];
    try {
        batches = await api.getBatches();
    } catch (err) {
        console.error('Failed to load batches for inspection', err);
        return;
    }

    select.innerHTML =
        '<option value="">-- Select Batch --</option>' +
        batches.map(b =>
            `<option value="${b._id}">${b.batchNumber} – ${b.itemName || ''}</option>`
        ).join('');
};

/* ==============================
   Preview inspection form
   ============================== */

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

    InspectionManager.currentBatchForInspection = batch;
    preview.classList.remove('hidden');

    document.getElementById('inspectionFormBatchInfo').innerHTML = `
        <p><strong>Batch:</strong> ${batch.batchNumber}</p>
        <p><strong>Item:</strong> ${batch.itemName}</p>
        <p><strong>Quantity:</strong> ${batch.quantity}</p>
    `;

    const container = document.getElementById('inspectionFormDimensions');
    container.innerHTML = Array.from(
        { length: InspectionManager.currentSampleSize },
        (_, sIdx) => `
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
        `
    ).join('');
};

/* ==============================
   Save inspection (RESTORED)
   ============================== */

InspectionManager.saveFromTab = async function () {
    const batch = InspectionManager.currentBatchForInspection;
    if (!batch) return;

    const inspector = document.getElementById('inspectorName').value.trim();
    if (!inspector) {
        UI.showToast('Inspector name required', 'error');
        return;
    }

    const measurements = batch.itemDimensions.map((dim, dIdx) => {
        const samples = [];

        for (let s = 0; s < InspectionManager.currentSampleSize; s++) {
            const input = document.getElementById(`inspection-${s}-${dIdx}`);
            const value = input && input.value !== '' ? parseFloat(input.value) : null;

            samples.push({
                sampleNumber: s + 1,
                value
            });
        }

        if (!samples.some(s => isNumber(s.value))) return null;

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
        sampleSize: InspectionManager.currentSampleSize,
        measurements
    };

    if (!Array.isArray(batch.inspections)) batch.inspections = [];
    batch.inspections.push(inspection);

    await api.updateBatch(batch._id, { inspections: batch.inspections });

    InspectionManager.clearForm();
    await InspectionManager.renderAllReports();

    UI.showToast('Inspection saved', 'success');
};

/* ==============================
   Render inspection reports
   ============================== */

InspectionManager.renderAllReports = async function () {
    const container = document.getElementById('inspectionReportsList');
    if (!container) return;

    container.classList.add('inspection-canvas');

    const batches = await api.getBatches();
    const inspections = [];

    batches.forEach(batch => {
        normalizeArray(batch.inspections).forEach(inspection => {
            if (!inspection || !Array.isArray(inspection.measurements)) return;

            inspections.push({
                ...inspection,
                measurements: inspection.measurements.map(normalizeMeasurement),
                batchId: batch._id,
                batchNumber: batch.batchNumber || '—',
                itemName: batch.itemName || '—'
            });
        });
    });

    inspections.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    InspectionManager.currentRenderedInspections = inspections;

    if (!inspections.length) {
        container.innerHTML = `<p>No inspection reports found.</p>`;
        return;
    }

    container.innerHTML = inspections
        .map((inspection, index) => renderReportCard(inspection, index))
        .join('');
};

/* ==============================
   Report card
   ============================== */

function renderReportCard(report, index) {
    const outCount = getOutOfToleranceSampleCount(report.measurements);

    return `
        <div class="report-card">
            <div class="report-header">
                <div>
                    <div class="report-title">
                        ${report.batchNumber} – ${report.itemName}
                    </div>
                    <div class="report-meta">${new Date(report.timestamp).toLocaleString()}</div>
                    <div class="report-meta">Inspector: ${report.inspector || '—'}</div>
                    <div class="report-summary">
                        Samples out of tolerance: ${outCount}
                    </div>
                </div>

                <button
                    class="delete-btn"
                    onclick="InspectionManager.deleteInspection(${index})">
                    Delete
                </button>
            </div>

            ${report.measurements.map(renderDimensionRow).join('')}
        </div>
    `;
}

/* ==============================
   Dimension block
   ============================== */

function renderDimensionRow(m) {
    const status = getDimensionStatus(m);

    return `
        <div class="dimension-block ${status === 'out' ? 'out' : ''}">
            <div class="dimension-header">
                <div class="dimension-name">${m.name}</div>
                ${status === 'out'
                    ? `<div class="dimension-status out">Out of tolerance</div>`
                    : ''}
            </div>

            <div class="dimension-target">
                Target: ${m.min} – ${m.max} ${m.unit || ''}
            </div>

            <div class="sample-list">
                ${m.samples.map(s => renderSampleChip(s, m)).join('')}
            </div>
        </div>
    `;
}

/* ==============================
   Sample chip
   ============================== */

function renderSampleChip(sample, measurement) {
    const out = isOutOfTolerance(sample.value, measurement.min, measurement.max);
    const deviation = out ? getDeviation(sample.value, measurement.min, measurement.max) : null;

    return `
        <div class="sample-chip ${out ? 'fail' : ''}">
            <div class="sample-label">S${sample.sampleNumber}</div>
            <div class="sample-value">
                ${sample.value ?? '—'}${sample.value != null && measurement.unit ? ` ${measurement.unit}` : ''}
            </div>
            ${out && deviation !== null ? `<div class="deviation">(${deviation})</div>` : ''}
        </div>
    `;
}

/* ==============================
   Delete inspection
   ============================== */

InspectionManager.deleteInspection = async function (index) {
    const inspection = InspectionManager.currentRenderedInspections[index];
    if (!inspection) return;

    if (!confirm(`Delete inspection for batch ${inspection.batchNumber}?`)) return;

    const batches = await api.getBatches();
    const batch = batches.find(b => b._id === inspection.batchId);
    if (!batch) return;

    batch.inspections = normalizeArray(batch.inspections)
        .filter(i => i.timestamp !== inspection.timestamp);

    await api.updateBatch(batch._id, { inspections: batch.inspections });

    await InspectionManager.renderAllReports();
    UI.showToast('Inspection deleted', 'success');
};

/* ==============================
   Clear form
   ============================== */

InspectionManager.clearForm = function () {
    document.getElementById('inspectionFormPreview')?.classList.add('hidden');
    document.getElementById('inspectionBatchSelect').value = '';
    document.getElementById('inspectorName').value = '';
    this.currentSampleSize = 1;
    this.currentBatchForInspection = null;
};

/* ==============================
   Globals
   ============================== */

window.InspectionManager = InspectionManager;
window.saveInspectionFromTab = () => InspectionManager.saveFromTab();
window.previewInspectionDimensions = () => InspectionManager.previewDimensions();
window.filterInspectionReports = () => InspectionManager.renderAllReports();
