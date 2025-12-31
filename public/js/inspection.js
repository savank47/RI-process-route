// ========================================
// inspection.js
// Purpose: Inspection Reports
// Scope: UI + data only
// ========================================

/* ==============================
   Inspection Manager
   ============================== */

const InspectionManager = {};

/* ==============================
   Utility helpers (SAFE)
   ============================== */

function isNumber(n) {
    return typeof n === 'number' && !Number.isNaN(n);
}

function normalizeArray(arr) {
    return Array.isArray(arr) ? arr : [];
}

function isOutOfTolerance(value, min, max) {
    if (!isNumber(value)) return false;
    if (!isNumber(min) || !isNumber(max)) return false;
    return value < min || value > max;
}

function getDeviation(value, min, max) {
    if (!isNumber(value)) return null;
    if (!isNumber(min) || !isNumber(max)) return null;

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
   UI TAB ENTRY POINT (IMPORTANT)
   Called from UI.showTab('inspections')
   ============================== */

InspectionManager.renderTab = async function () {
    await InspectionManager.renderAllReports();

    // Populate batch dropdown (defined elsewhere)
    if (typeof populateInspectionBatchSelect === 'function') {
        await populateInspectionBatchSelect();
    }
};

/* ==============================
   Render all inspection reports
   ============================== */

InspectionManager.renderAllReports = async function () {
    const container = document.getElementById('inspectionReportsList');
    if (!container) return;

    container.classList.add('inspection-canvas');

    let batches = [];
    try {
        batches = await api.getBatches();
    } catch (err) {
        console.error('Failed to load batches', err);
        container.innerHTML = `<p>Error loading inspection reports.</p>`;
        return;
    }

    const inspections = [];

    // Normalize inspections + measurements ONCE
    batches.forEach(batch => {
        const inspectionsArr = Array.isArray(batch.inspections)
            ? batch.inspections
            : [];

        inspectionsArr.forEach((inspection, inspectionIndex) => {
            inspections.push({
                ...inspection,
                measurements: Array.isArray(inspection.measurements)
                    ? inspection.measurements
                    : [],
                batchId: batch._id,
                inspectionIndex,
                batchNumber: batch.batchNumber || '—',
                itemName: batch.itemName || '—'
            });
        });
    });

    inspections.sort((a, b) => {
        const ta = new Date(a.timestamp).getTime() || 0;
        const tb = new Date(b.timestamp).getTime() || 0;
        return tb - ta;
    });

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
    const measurements = normalizeArray(report.measurements);
    const outCount = getOutOfToleranceSampleCount(measurements);

    return `
        <div class="report-card">
            <div class="report-header">
                <div>
                    <div class="report-title">
                        ${report.batchNumber} – ${report.itemName}
                    </div>

                    <div class="report-meta">
                        ${report.timestamp
                            ? new Date(report.timestamp).toLocaleString()
                            : '—'}
                    </div>

                    <div class="report-meta">
                        Inspector: ${report.inspector || '—'}
                    </div>

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

            ${measurements.map(m => renderDimensionRow(m)).join('')}
        </div>
    `;
}

/* ==============================
   Dimension block
   ============================== */

function renderDimensionRow(m) {
    const status = getDimensionStatus(m);
    const samples = normalizeArray(m.samples);

    return `
        <div class="dimension-block ${status === 'out' ? 'out' : ''}">
            <div class="dimension-header">
                <div class="dimension-name">${m.name || '—'}</div>
                ${
                    status === 'out'
                        ? `<div class="dimension-status out">Out of tolerance</div>`
                        : ''
                }
            </div>

            <div class="dimension-target">
                Target: ${
                    isNumber(m.min) && isNumber(m.max)
                        ? `${m.min} – ${m.max} ${m.unit || ''}`
                        : m.target || 'N/A'
                }
            </div>

            <div class="sample-list">
                ${samples.map(s => renderSampleChip(s, m)).join('')}
            </div>
        </div>
    `;
}

/* ==============================
   Sample chip
   ============================== */

function renderSampleChip(sample, measurement) {
    const out = isOutOfTolerance(
        sample.value,
        measurement.min,
        measurement.max
    );

    const deviation = out
        ? getDeviation(sample.value, measurement.min, measurement.max)
        : null;

    return `
        <div class="sample-chip ${out ? 'fail' : ''}">
            <div class="sample-label">S${sample.sampleNumber ?? '—'}</div>

            <div class="sample-value">
                ${sample.value ?? '—'}
                ${sample.value != null && measurement.unit ? ` ${measurement.unit}` : ''}
            </div>

            ${
                out && deviation !== null
                    ? `<div class="deviation">(${deviation > 0 ? '+' : ''}${deviation})</div>`
                    : ''
            }
        </div>
    `;
}

/* ==============================
   Delete inspection
   ============================== */

InspectionManager.deleteInspection = async function (inspectionIndex) {
    if (!confirm('Delete this inspection report?')) return;

    const batches = await api.getBatches();
    let counter = 0;

    for (const batch of batches) {
        const inspectionsArr = Array.isArray(batch.inspections)
            ? batch.inspections
            : [];

        if (inspectionIndex < counter + inspectionsArr.length) {
            inspectionsArr.splice(inspectionIndex - counter, 1);
            await api.updateBatch(batch._id, {
                inspections: inspectionsArr
            });
            break;
        }

        counter += inspectionsArr.length;
    }

    await InspectionManager.renderAllReports();
};

/* ==============================
   Globals
   ============================== */

window.InspectionManager = InspectionManager;
window.saveInspectionFromTab = () => InspectionManager.saveFromTab?.();
window.previewInspectionDimensions = () => InspectionManager.previewDimensions?.();
window.filterInspectionReports = () => InspectionManager.renderAllReports();
