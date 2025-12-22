// ========================================
// FRONTEND JAVASCRIPT MODULE
// File: js/items.js
// Purpose: Items Master UI and logic
// Runs on: Browser (Client-side)
// ========================================

class ItemManager {
    static async add() {
        const name = document.getElementById('itemName').value.trim();
        const code = document.getElementById('itemCode').value.trim();
        const spec = document.getElementById('itemSpec').value.trim();
        const material = document.getElementById('itemMaterial').value.trim();
        const category = document.getElementById('itemCategory').value.trim();

        if (!name || !code) {
            UI.showToast('Please enter item name and code', 'error');
            return;
        }

        if (STATE.selectedProcessesForRoute.length === 0) {
            UI.showToast('Please select at least one process for the route', 'error');
            return;
        }

        const item = {
            name,
            code,
            specifications: spec,
            material,
            category,
            dimensions: DimensionManager.getDimensions(),
            processRoute: STATE.selectedProcessesForRoute.map((proc, index) => ({
                ...proc,
                order: index + 1
            }))
        };

        try {
            await api.addItem(item);
            this.clearForm();
            await this.render();
            await UI.updateStats();
            UI.showToast(`Item "${name}" saved with ${STATE.selectedProcessesForRoute.length} processes!`);
        } catch (error) {
            console.error('Failed to add item:', error);
            UI.showToast('Failed to add item: ' + error.message, 'error');
        }
    }

    static clearForm() {
        document.getElementById('itemName').value = '';
        document.getElementById('itemCode').value = '';
        document.getElementById('itemSpec').value = '';
        document.getElementById('itemMaterial').value = '';
        document.getElementById('itemCategory').value = '';
        STATE.selectedProcessesForRoute = [];
        DimensionManager.clearAll();
        this.renderAvailableProcesses();
    }

    static async delete(itemId) {
        if (!confirm('Delete this item? Related batches will not be affected.')) return;
        
        await api.deleteItem(itemId);
        await this.render();
        await UI.updateStats();
        UI.showToast('Item deleted');
    }

    static async renderAvailableProcesses() {
        const container = document.getElementById('availableProcessesForItem');
        const processes = await api.getProcesses();
        
        if (processes.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-400">No processes available. Add processes to the library first.</p>';
            return;
        }

        const colorClasses = {
            gray: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
            red: 'bg-red-200 text-red-800 hover:bg-red-300',
            orange: 'bg-orange-200 text-orange-800 hover:bg-orange-300',
            amber: 'bg-amber-200 text-amber-800 hover:bg-amber-300',
            green: 'bg-green-200 text-green-800 hover:bg-green-300',
            teal: 'bg-teal-200 text-teal-800 hover:bg-teal-300',
            blue: 'bg-blue-200 text-blue-800 hover:bg-blue-300',
            indigo: 'bg-indigo-200 text-indigo-800 hover:bg-indigo-300',
            purple: 'bg-purple-200 text-purple-800 hover:bg-purple-300',
            pink: 'bg-pink-200 text-pink-800 hover:bg-pink-300'
        };

        container.innerHTML = processes.map(proc => {
            const isSelected = STATE.selectedProcessesForRoute.find(p => p.id === proc._id);
            return `
                <button onclick="ItemManager.toggleProcess('${proc._id}')" 
                    class="process-chip ${colorClasses[proc.color]} border ${isSelected ? 'ring-2 ring-blue-500' : ''} rounded-lg px-3 py-1 text-sm transition"
                    title="${proc.description}">
                    ${proc.name}
                </button>
            `;
        }).join('');

        this.renderSelectedRoute();
    }

    static async toggleProcess(processId) {
        const processes = await api.getProcesses();
        const process = processes.find(p => p._id === processId);
        
        if (!process) return;

        const existingIndex = STATE.selectedProcessesForRoute.findIndex(p => p.id === processId);
        if (existingIndex >= 0) {
            STATE.selectedProcessesForRoute.splice(existingIndex, 1);
        } else {
            STATE.selectedProcessesForRoute.push({ 
                id: process._id,
                name: process.name,
                code: process.code,
                description: process.description,
                color: process.color
            });
        }

        this.renderAvailableProcesses();
    }

    static renderSelectedRoute() {
        const container = document.getElementById('selectedProcessRoute');
        const emptyMessage = document.getElementById('emptyRouteMessage');

        if (STATE.selectedProcessesForRoute.length === 0) {
            container.innerHTML = '';
            emptyMessage.classList.remove('hidden');
            return;
        }

        emptyMessage.classList.add('hidden');

        const colorClasses = {
            gray: 'bg-gray-500 text-white',
            red: 'bg-red-500 text-white',
            orange: 'bg-orange-500 text-white',
            amber: 'bg-amber-500 text-white',
            green: 'bg-green-500 text-white',
            teal: 'bg-teal-500 text-white',
            blue: 'bg-blue-500 text-white',
            indigo: 'bg-indigo-500 text-white',
            purple: 'bg-purple-500 text-white',
            pink: 'bg-pink-500 text-white'
        };

        container.innerHTML = STATE.selectedProcessesForRoute.map((proc, index) => `
            <div class="sortable-item flex items-center gap-2 ${colorClasses[proc.color]} rounded-lg px-3 py-2 text-white cursor-move" 
                 draggable="true" 
                 ondragstart="ItemManager.dragStart(event, ${index})"
                 ondragover="ItemManager.dragOver(event)"
                 ondrop="ItemManager.drop(event, ${index})">
                <i class="fas fa-grip-vertical opacity-50"></i>
                <span class="font-bold">${index + 1}.</span>
                <span>${proc.name}</span>
                <button onclick="ItemManager.removeFromRoute(${index})" class="ml-2 hover:text-red-200 transition">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    static removeFromRoute(index) {
        STATE.selectedProcessesForRoute.splice(index, 1);
        this.renderAvailableProcesses();
    }

    // Drag and drop
    static dragStart(event, index) {
        STATE.draggedIndex = index;
        event.target.classList.add('dragging');
    }

    static dragOver(event) {
        event.preventDefault();
    }

    static drop(event, dropIndex) {
        event.preventDefault();
        if (STATE.draggedIndex === null || STATE.draggedIndex === dropIndex) return;

        const item = STATE.selectedProcessesForRoute.splice(STATE.draggedIndex, 1)[0];
        STATE.selectedProcessesForRoute.splice(dropIndex, 0, item);
        
        STATE.draggedIndex = null;
        this.renderAvailableProcesses();
    }

    static async render() {
        const container = document.getElementById('itemsList');
        const items = await api.getItems();
        
        if (items.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">No items added yet. Create your first item above.</p>';
            return;
        }

        container.innerHTML = items.map(item => `
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h3 class="font-bold text-gray-800 text-lg">${item.name}</h3>
                        <p class="text-sm text-gray-600">Code: ${item.code}</p>
                        ${item.material ? `<span class="inline-block mt-1 text-xs bg-gray-100 px-2 py-1 rounded">${item.material}</span>` : ''}
                        ${item.category ? `<span class="inline-block mt-1 text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-1">${item.category}</span>` : ''}
                    </div>
                    <button onclick="ItemManager.delete('${item._id}')" class="text-red-600 hover:text-red-800 p-2" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${item.specifications ? `<p class="text-sm text-gray-500 mb-3">${item.specifications}</p>` : ''}
                
                ${item.dimensions && item.dimensions.length > 0 ? `
                    <div class="mb-3">
                        <p class="text-sm font-medium text-gray-700 mb-2"><i class="fas fa-ruler-combined mr-1"></i>Dimensions (${item.dimensions.length}):</p>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
                            ${item.dimensions.map(dim => `
                                <div class="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                    <span class="font-semibold">${dim.name}:</span> ${dim.minValue}-${dim.maxValue} ${dim.unit}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div>
                    <p class="text-sm font-medium text-gray-700 mb-2"><i class="fas fa-route mr-1"></i>Process Route (${item.processRoute.length} steps):</p>
                    <div class="flex flex-wrap gap-1">
                        ${item.processRoute.map((proc, i) => `
                            <span class="${CONFIG.COLOR_CLASSES[proc.color]} text-xs px-2 py-1 rounded">
                                ${i + 1}. ${proc.name}
                            </span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Make globally accessible
window.ItemManager = ItemManager;
window.addItem = () => ItemManager.add();
window.clearItemForm = () => ItemManager.clearForm();
window.deleteItem = (id) => ItemManager.delete(id);
window.toggleProcessForRoute = (id) => ItemManager.toggleProcess(id);
window.removeProcessFromRoute = (i) => ItemManager.removeFromRoute(i);
window.dragStart = (e, i) => ItemManager.dragStart(e, i);
window.dragOver = (e) => ItemManager.dragOver(e);
window.drop = (e, i) => ItemManager.drop(e, i);
