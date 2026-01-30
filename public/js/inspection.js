// ========================================
// inspection.js
// FINAL – AUDITED, STABLE, SHOP-FLOOR SAFE
// ========================================

/* ==============================
   Inspection Manager
   ============================== */

const InspectionManager = {};

/* ==============================
   State
   ============================== */

InspectionManager.currentSampleSize = 1;
InspectionManager.currentBatchForInspection = null;
InspectionManager.currentRenderedInspections = [];

/* ==============================
   Utility Helpers (DEFENSIVE)
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
    if (!isNumber(value) || !isNumber(min) || !isNumber(max)) return false;
    return value < min || value > max;
}

function getDeviation(value, min, max) {
    if (!isOutOfTolerance(value, min, max)) return null;
    if (value < min) return (value - min).toFixed(2);
    if (value > max) return (value - max).toFixed(2);
    return null;
}

function getDimensionStatus(measurement) {
    return normalizeArray(measurement.samples).some(s =>
        isOutOfTolerance(s.value, measurement.min, measurement.max)
    )
        ? 'out'
        : 'ok';
}

function getOutOfToleranceSampleCount(measurements) {
    const set = new Set();

    normalizeArray(measurements).forEach(m => {
        normalizeArray(m.samples).forEach(s => {
            if (isOutOfTolerance(s.value, m.min, m.max)) {
                set.add(s.sampleNumber);
            }
        });
    });

    return set.size;
}

/* 🔽 ADDED: total samples measured (auto) */
function getTotalSamplesMeasured(measurements) {
    const sampleSet = new Set();

    measurements.forEach(m => {
        m.samples.forEach(s => {
            if (typeof s.value === 'number') {
                sampleSet.add(s.sampleNumber);
            }
        });
    });

    return sampleSet.size;
}

/* ==============================
   UI TAB ENTRY (MANDATORY)
   ============================== */

InspectionManager.renderTab = async function () {
    await InspectionManager.updateBatchSelect();
    await InspectionManager.renderAllReports();
};

/* ==============================
   Batch Dropdown
   ============================== */

InspectionManager.updateBatchSelect = async function () {
    const select = document.getElementById('inspectionBatchSelect');
    if (!select) return;

    const batches = await api.getBatches();

    select.innerHTML =
        '<option value="">-- Select Batch --</option>' +
        batches.map(b =>
            `<option value="${b._id}">${b.batchNumber} – ${b.itemName || ''}</option>`
        ).join('');
};

/* ==============================
   Sample Size Selection
   ============================== */

InspectionManager.setSampleSize = function (value) {
    let size = 1;

    if (value === 'custom') {
        const v = parseInt(prompt('Enter number of samples:', '5'), 10);
        if (!v || v <= 0) return;
        size = v;
    } else {
        size = parseInt(value, 10) || 1;
    }

    this.currentSampleSize = size;

    if (document.getElementById('inspectionBatchSelect').value) {
        this.previewDimensions();
    }
};

/* ==============================
   Preview Dimensions
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

    this.currentBatchForInspection = batch;
    preview.classList.remove('hidden');

    document.getElementById('inspectionFormBatchInfo').innerHTML = `
        <p><strong>Batch:</strong> ${batch.batchNumber}</p>
        <p><strong>Item:</strong> ${batch.itemName}</p>
        <p><strong>Quantity:</strong> ${batch.quantity}</p>
    `;

    const container = document.getElementById('inspectionFormDimensions');

    container.innerHTML = Array.from(
        { length: this.currentSampleSize },
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
   Save Inspection
   ============================== */

InspectionManager.saveFromTab = async function () {
    const batch = this.currentBatchForInspection;
    if (!batch) return;

    const inspector = document.getElementById('inspectorName').value.trim();
    if (!inspector) {
        UI.showToast('Inspector name required', 'error');
        return;
    }

    const invoiceNumber =
        document.getElementById('inspectionInvoiceNumber')?.value.trim() || null;
    const invoiceDate =
        document.getElementById('inspectionInvoiceDate')?.value || null;

    const measurements = batch.itemDimensions.map((dim, dIdx) => {
        const samples = [];

        for (let s = 0; s < this.currentSampleSize; s++) {
            const input = document.getElementById(`inspection-${s}-${dIdx}`);
            const value = input && input.value !== '' ? parseFloat(input.value) : null;
            samples.push({ sampleNumber: s + 1, value });
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
        sampleSize: this.currentSampleSize,
        measurements,
        invoice: {
            number: invoiceNumber,
            date: invoiceDate
        }
    };

    if (!Array.isArray(batch.inspections)) batch.inspections = [];
    batch.inspections.push(inspection);

    await api.updateBatch(batch._id, { inspections: batch.inspections });

    this.clearForm();
    await this.renderAllReports();

    UI.showToast('Inspection saved', 'success');
};

/* ==============================
   Render Inspection Reports
   ============================== */

InspectionManager.renderAllReports = async function () {
    const container = document.getElementById('inspectionReportsList');
    if (!container) return;

    const batches = await api.getBatches();
    const inspections = [];

    batches.forEach(batch => {
        normalizeArray(batch.inspections).forEach(i => {
            if (!i || !Array.isArray(i.measurements)) return;

            inspections.push({
                ...i,
                measurements: i.measurements.map(normalizeMeasurement),
                batchId: batch._id,
                batchNumber: batch.batchNumber,
                itemName: batch.itemName,

                // 🔽 ADDED (SAFE ENRICHMENT)
                material: batch.material || null,
                rawMaterialBatchNo: batch.rawMaterialBatchNo || null
            });
        });
    });

    inspections.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    this.currentRenderedInspections = inspections;

    container.innerHTML = inspections.length
        ? inspections.map(renderReportCard).join('')
        : `<p>No inspection reports found.</p>`;
};

/* ==============================
   Report Card
   ============================== */

function renderReportCard(report, index) {
    const invoiceNo = report.invoice?.number || '—';
    const invoiceDate = report.invoice?.date
        ? new Date(report.invoice.date).toLocaleDateString()
        : '—';

    return `
        <div class="report-card">
            <div class="report-header" onclick="toggleInspectionReport(this)">
                <div>
                    <div class="company-name">ROHIT INDUSTRIES</div>

                    <div class="report-title">
                        ${report.batchNumber} – ${report.itemName}
                    </div>

                    <!-- 🔽 ADDED -->
                    <div class="report-meta">
                        <strong>Material:</strong> ${report.material || '—'} |
                        <strong>RM Batch:</strong> ${report.rawMaterialBatchNo || '—'}
                    </div>

                    <div class="report-meta">${new Date(report.timestamp).toLocaleString()}</div>
                    <div class="report-meta">Inspector: ${report.inspector}</div>

                    <div class="report-meta">
                        Invoice No: ${invoiceNo} |
                        Invoice Date: ${invoiceDate}
                    </div>

                    <div class="report-summary">
                        Samples measured: ${getTotalSamplesMeasured(report.measurements)} |
                        Samples out of tolerance:
                        ${getOutOfToleranceSampleCount(report.measurements)}
                    </div>
                </div>

                <div class="report-actions">
                    <button class="export-btn subtle"
                            onclick="event.stopPropagation(); exportSingleReportPDF(this)">
                        Export PDF
                    </button>

                    <button class="edit-btn subtle"
                            onclick="event.stopPropagation(); InspectionManager.editInvoice(${index})">
                        Edit Invoice
                    </button>

                    <button class="delete-btn subtle"
                            onclick="event.stopPropagation(); InspectionManager.deleteInspection(${index})">
                        Delete
                    </button>
                </div>
            </div>

            <div class="report-body">
                ${report.measurements.map(renderDimensionRow).join('')}
            </div>
        </div>
    `;
}

/* ==============================
   Dimension & Sample Rendering
   ============================== */

function renderDimensionRow(m) {
    return `
        <div class="dimension-block ${getDimensionStatus(m) === 'out' ? 'out' : ''}">
            <div class="dimension-header">
                <div class="dimension-name">${m.name}</div>
            </div>

            <div class="dimension-target">
                Target: ${m.min} – ${m.max} ${m.unit}
            </div>

            <div class="sample-list">
                ${m.samples.map(s => renderSampleChip(s, m)).join('')}
            </div>
        </div>
    `;
}

function renderSampleChip(s, m) {
    const out = isOutOfTolerance(s.value, m.min, m.max);
    const dev = getDeviation(s.value, m.min, m.max);

    return `
        <div class="sample-chip ${out ? 'fail' : ''}">
            <div class="sample-label">S${s.sampleNumber}</div>
            <div class="sample-value">
                ${s.value ?? '—'} ${s.value != null ? m.unit : ''}
            </div>
            ${dev !== null ? `<div class="deviation">(${dev})</div>` : ''}
        </div>
    `;
}

/* ==============================
   Delete Inspection
   ============================== */

InspectionManager.deleteInspection = async function (index) {
    const inspection = this.currentRenderedInspections[index];
    if (!inspection) return;

    if (!confirm(`Delete inspection for batch ${inspection.batchNumber}?`)) return;

    const batches = await api.getBatches();
    const batch = batches.find(b => b._id === inspection.batchId);
    if (!batch) return;

    batch.inspections = normalizeArray(batch.inspections)
        .filter(i => i.timestamp !== inspection.timestamp);

    await api.updateBatch(batch._id, { inspections: batch.inspections });
    await this.renderAllReports();

    UI.showToast('Inspection deleted', 'success');
};

/* ==============================
   Edit Invoice
   ============================== */

InspectionManager.editInvoice = async function (index) {
    const inspection = this.currentRenderedInspections[index];
    if (!inspection) return;

    const number = prompt('Invoice Number:', inspection.invoice?.number || '');
    if (number === null) return;

    const date = prompt('Invoice Date (YYYY-MM-DD):', inspection.invoice?.date || '');

    const batches = await api.getBatches();
    const batch = batches.find(b => b._id === inspection.batchId);
    if (!batch) return;

    batch.inspections = normalizeArray(batch.inspections).map(i =>
        i.timestamp === inspection.timestamp
            ? { ...i, invoice: { number: number || null, date: date || null } }
            : i
    );

    await api.updateBatch(batch._id, { inspections: batch.inspections });
    await this.renderAllReports();

    UI.showToast('Invoice updated', 'success');
};

/* ==============================
   Clear Form
   ============================== */

InspectionManager.clearForm = function () {
    document.getElementById('inspectionFormPreview')?.classList.add('hidden');
    document.getElementById('inspectionBatchSelect').value = '';
    document.getElementById('inspectorName').value = '';
    this.currentSampleSize = 1;
    this.currentBatchForInspection = null;
};

/* ==============================
   Accordion Logic
   ============================== */

function toggleInspectionReport(headerEl) {
    const card = headerEl.closest('.report-card');

    document.querySelectorAll('.report-card.open').forEach(c => {
        if (c !== card) c.classList.remove('open');
    });

    card.classList.toggle('open');
}

/* ==============================
   PDF Export – Single Inspection
   ============================== */

async function exportSingleReportPDF(buttonEl) {
    const reportCard = buttonEl.closest('.report-card');
    if (!reportCard) return;

    // Show a loading state on the button
    const originalText = buttonEl.innerHTML;
    buttonEl.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Generating...';
    buttonEl.disabled = true;

    try {
        // Ensure the card is expanded for the capture
        const wasOpen = reportCard.classList.contains('open');
        reportCard.classList.add('open');

        // PDF Configuration optimized for Industrial Reports
        const opt = {
          margin: [10, 10, 10, 10],
          filename: `Inspection_${reportCard.querySelector('.report-title').innerText.replace(/\s+/g, '_')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
              scale: 2, 
              useCORS: true,
              // ADD THIS HOOK:
              onclone: (clonedDoc) => {
                  const elements = clonedDoc.querySelectorAll('*');
                  elements.forEach(el => {
                      const style = window.getComputedStyle(el);
                      // Force convert oklch to rgb for the PDF engine
                      if (style.backgroundColor.includes('oklch')) el.style.backgroundColor = 'rgb(243, 244, 246)'; 
                      if (style.color.includes('oklch')) el.style.color = 'rgb(31, 41, 55)';
                      if (style.borderColor.includes('oklch')) el.style.borderColor = 'rgb(209, 213, 219)';
                  });
              }
          },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

        // Generate the PDF
        await html2pdf().set(opt).from(reportCard).save();
        
        // Restore state
        if (!wasOpen) reportCard.classList.remove('open');
        UI.showToast('PDF Generated Successfully');

    } catch (error) {
        console.error('PDF Generation Error:', error);
        UI.showToast('PDF Export failed. Try browser print.', 'error');
    } finally {
        buttonEl.innerHTML = originalText;
        buttonEl.disabled = false;
    }
}

InspectionManager.filterByRMBatch = function(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    const container = document.getElementById('inspectionReportsList');
    
    // Use the cached reports from the last render
    const filtered = this.currentRenderedInspections.filter(report => {
        const rmBatch = (report.rawMaterialBatchNo || '').toLowerCase();
        const batchNo = (report.batchNumber || '').toLowerCase();
        return rmBatch.includes(term) || batchNo.includes(term);
    });

    container.innerHTML = filtered.length
        ? filtered.map(renderReportCard).join('')
        : `<p class="text-center py-8 text-gray-500">No reports match "${searchTerm}"</p>`;
};
/* ==============================
   Globals
   ============================== */

window.InspectionManager = InspectionManager;
window.previewInspectionDimensions = () => InspectionManager.previewDimensions();
window.saveInspectionFromTab = () => InspectionManager.saveFromTab();
window.filterInspectionReports = () => InspectionManager.renderAllReports();
