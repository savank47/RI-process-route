// ========================================
// FRONTEND JAVASCRIPT MODULE
// File: js/dimensions.js
// Purpose: Dimension management for items
// Runs on: Browser (Client-side)
// ========================================

class DimensionManager {
    static addDimensionRow() {
        const dimensionId = Date.now();
        STATE.itemDimensions.push({ 
            id: dimensionId, 
            name: '', 
            minValue: '', 
            maxValue: '', 
            unit: 'mm' 
        });
        this.render();
    }

    static removeDimension(dimensionId) {
        STATE.itemDimensions = STATE.itemDimensions.filter(d => d.id !== dimensionId);
        this.render();
    }

    static updateDimension(dimensionId, field, value) {
        const dimension = STATE.itemDimensions.find(d => d.id === dimensionId);
        if (dimension) {
            dimension[field] = value;
        }
    }

    static render() {
        const container = document.getElementById('dimensionsContainer');
        
        if (STATE.itemDimensions.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-400 italic">No dimensions added yet. Click "Add Dimension" below.</p>';
            return;
        }

        container.innerHTML = STATE.itemDimensions.map(dim => `
            <div class="grid grid-cols-12 gap-2 items-end bg-white p-3 rounded-lg border border-amber-300">
                <div class="col-span-12 md:col-span-3">
                    <label class="block text-xs font-medium text-gray-700 mb-1">Dimension Name</label>
                    <input type="text" 
                        placeholder="e.g., OD, ID, Length" 
                        value="${dim.name}"
                        onchange="DimensionManager.updateDimension(${dim.id}, 'name', this.value)"
                        class="border border-gray-300 rounded px-3 py-2 text-sm w-full">
                </div>
                <div class="col-span-5 md:col-span-3">
                    <label class="block text-xs font-medium text-gray-700 mb-1">Min Value</label>
                    <input type="number" 
                        step="0.01"
                        placeholder="e.g., 10.00" 
                        value="${dim.minValue}"
                        onchange="DimensionManager.updateDimension(${dim.id}, 'minValue', this.value)"
                        class="border border-gray-300 rounded px-3 py-2 text-sm w-full">
                </div>
                <div class="col-span-5 md:col-span-3">
                    <label class="block text-xs font-medium text-gray-700 mb-1">Max Value</label>
                    <input type="number" 
                        step="0.01"
                        placeholder="e.g., 10.02" 
                        value="${dim.maxValue}"
                        onchange="DimensionManager.updateDimension(${dim.id}, 'maxValue', this.value)"
                        class="border border-gray-300 rounded px-3 py-2 text-sm w-full">
                </div>
                <div class="col-span-10 md:col-span-2">
                    <label class="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                    <select onchange="DimensionManager.updateDimension(${dim.id}, 'unit', this.value)" 
                            class="border border-gray-300 rounded px-3 py-2 text-sm w-full">
                        ${CONFIG.DIMENSION_UNITS.map(unit => 
                            `<option value="${unit}" ${dim.unit === unit ? 'selected' : ''}>${unit}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="col-span-2 md:col-span-1">
                    <button type="button" onclick="DimensionManager.removeDimension(${dim.id})" 
                            class="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded text-sm w-full" 
                            title="Remove">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="col-span-12 text-xs text-gray-500 mt-1">
                    Tolerance: ${dim.minValue} to ${dim.maxValue} ${dim.unit}
                </div>
            </div>
        `).join('');
    }

    static clearAll() {
        STATE.itemDimensions = [];
        this.render();
    }

    static getDimensions() {
        return STATE.itemDimensions.map(d => ({
            name: d.name,
            minValue: parseFloat(d.minValue) || 0,
            maxValue: parseFloat(d.maxValue) || 0,
            unit: d.unit
        }));
    }
}

// Make globally accessible
window.DimensionManager = DimensionManager;
window.addDimensionRow = () => DimensionManager.addDimensionRow();
window.removeDimension = (id) => DimensionManager.removeDimension(id);
window.updateDimension = (id, field, value) => DimensionManager.updateDimension(id, field, value);
