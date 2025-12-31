// ========================================
// inspection.js
// Purpose: Sample-based inspection entry & reporting
// Scope: UI + data only (NO PDF, NO EXPORT)
// ========================================

/* ==============================
   Inspection Manager
   ============================== */

const InspectionManager = {};

/* ==============================
   Utility helpers
   ============================== */

function isOutOfTolerance(value, min, max) {
    if (typeof value !== 'number') return false;
    if (typeof min !== 'number' || typeof max !== 'number') return false;
    return value < min || value > max;
}

function getDeviation(value, min, max) {
    if (typeof value !== 'number') return null;
    if (value < min) return (value - min).toFixed(2);
    if (value > max) return (value - max).toFixed(2);
    return null;
}

/**
 * Dimension status:
 * - "out" if ANY sample of this dimension is OOT
 * - otherwise "ok"
 */
function getDimensionStatus(measurement) {
    if (!Array.isArray(measurement.samples)) return 'ok';

    return measurement.samples.some(s =>
        isOutOfTolerance(s.value, measurement.min, measurement.max)
    )
        ? 'out'
        : 'ok';
}

/**
 * Report-level summary:
 * Count UNIQUE samples that are out of tolerance
 * (a sample is counted once even if multiple dimensions fail)
 */
function getOutOfToleranceSampleCount(measurements) {
    const outSamples = new Set();

    measurements.forEach(m => {
        if (!Array.isArray(m.samples)) return;

        m.samples.forEach(s => {
            if (isOutOfTolerance(s.value, m.min, m.max)) {
                outSamples.add(s.sampleNumber);
            }
        });
    });

    return outSamples.size;
}

/* ==============================
   Render entry point
   ============================== */

InspectionManager.renderTab = async function () {
    await InspectionManager.renderAllReports();
};

/* ==============================
   Render all inspection reports
   ============================== */

InspectionManager.renderAllReports = async function () {
    const container = document.getElementById('inspectionReportsList');
    if (!container) return;

    container.classList.add('inspection-canvas');

    const batches = await api.getBatches();
    let inspections = [];

    // Collect inspections from all batches
    batches.forEach(batch => {
        (batch.inspections || []).forEach((inspection, inspectionIndex) => {
            inspections.push({
                ...inspection,
                batchId: batch._id,
                inspectionIndex,
                batchNumber: batch.batchNumber,
                itemName: batch.itemName
            });
        });
    });

    // Newest first
    inspections.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

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

                    <div class="report-meta">
                        ${new Date(report.timestamp).toLocaleString()}
                    </div>

                    <div class="report-meta">
                        Inspector: ${report.inspector}
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

            ${report.measurements.map(m => renderDimensionRow(m)).join('')}
        </div>
    `;
}

/* ==============================
   Dimension row (hybrid "row" style)
   ============================== */

function renderDimensionRow(m) {
    const status = getDimensionStatus(m);

    return `
        <div class="dimension-block ${status === 'out' ? 'out' : ''}">
            <div class="dimension-header">
                <div class="dimension-name">${m.name}</div>

                ${
                    status === 'out'
                        ? `<div class="dimension-status out">Out of tolerance</div>`
                        : ''
                }
            </div>

            <div class="dimension-target">
                Target: ${
                    typeof m.min === 'number' && typeof m.max === 'number'
                        ? `${m.min} – ${m.max} ${m.unit || ''}`
                        : m.target || 'N/A'
                }
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
            <div class="sample-label">S${sample.sampleNumber}</div>

            <div class="sample-value">
                ${sample.value ?? '—'}
                ${sample.value !== null && measurement.unit ? ` ${measurement.unit}` : ''}
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
        if (!batch.inspections) continue;

        if (inspectionIndex < counter + batch.inspections.length) {
            batch.inspections.splice(inspectionIndex - counter, 1);
            await api.updateBatch(batch._id, {
                inspections: batch.inspections
            });
            break;
        }

        counter += batch.inspections.length;
    }

    await InspectionManager.renderAllReports();
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
