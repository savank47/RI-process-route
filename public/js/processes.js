// ========================================
// FRONTEND JAVASCRIPT MODULE
// File: js/processes.js
// Purpose: Process Library UI and logic
// Runs on: Browser (Client-side)
// ========================================

class ProcessManager {
    static async add() {
        const name = document.getElementById('processName').value.trim();
        const code = document.getElementById('processCode').value.trim();
        const description = document.getElementById('processDescription').value.trim();

        if (!name || !code) {
            UI.showToast('Please enter process name and code', 'error');
            return;
        }

        const process = {
            name,
            code,
            description,
            color: STATE.selectedColor
        };

        try {
            console.log('Adding process:', process);
            const result = await api.addProcess(process);
            console.log('Process added:', result);
            
            document.getElementById('processName').value = '';
            document.getElementById('processCode').value = '';
            document.getElementById('processDescription').value = '';
            
            await this.render();
            await UI.updateStats();
            UI.showToast(`Process "${name}" added to library!`);
        } catch (error) {
            console.error('Failed to add process:', error);
            UI.showToast('Failed to add process: ' + error.message, 'error');
        }
    }

    static async loadDefaults() {
        if (!confirm('This will add default processes to your library. Continue?')) return;
        
        try {
            for (const proc of CONFIG.DEFAULT_PROCESSES) {
                console.log('Loading default process:', proc.name);
                await api.addProcess(proc);
            }
            
            await this.render();
            await UI.updateStats();
            UI.showToast('Default processes loaded!');
        } catch (error) {
            console.error('Failed to load default processes:', error);
            UI.showToast('Failed to load default processes: ' + error.message, 'error');
        }
    }

    static async delete(processId) {
        if (!confirm('Delete this process? It will be removed from all items using it.')) return;
        
        await api.deleteProcess(processId);
        await this.render();
        await UI.updateStats();
        UI.showToast('Process deleted');
    }

    static edit(processId) {
        document.getElementById('editProcessId').value = processId;
        UI.openModal('editModal');
    }

    static closeEditModal() {
        UI.closeModal('editModal');
    }

    static async saveEdit() {
        const processId = document.getElementById('editProcessId').value;
        const updates = {
            name: document.getElementById('editProcessName').value,
            code: document.getElementById('editProcessCode').value,
            description: document.getElementById('editProcessDesc').value
        };

        await api.updateProcess(processId, updates);
        await this.render();
        this.closeEditModal();
        UI.showToast('Process updated!');
    }

    static async render() {
        const container = document.getElementById('processesList');
        
        try {
            const processes = await api.getProcesses();
            
            console.log('Rendering processes:', processes);
            
            if (!processes || processes.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-8 w-full">No processes in library. Add your first process above or load default processes.</p>';
                return;
            }

            container.innerHTML = processes.map(proc => `
                <div class="process-chip ${CONFIG.COLOR_CLASSES[proc.color] || CONFIG.COLOR_CLASSES.blue} border-2 rounded-lg px-4 py-2 flex items-center gap-2">
                    <span class="font-semibold">${proc.name}</span>
                    <span class="text-xs opacity-75">${proc.code}</span>
                    ${proc.description ? `<span class="text-xs opacity-60 ml-1">(${proc.description})</span>` : ''}
                    <button onclick="ProcessManager.delete('${proc._id}')" class="ml-auto opacity-50 hover:opacity-100 transition" title="Delete process">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </div>
            `).join('');
            
            console.log('Processes rendered successfully');
        } catch (error) {
            console.error('Error rendering processes:', error);
            container.innerHTML = '<p class="text-red-500 text-center py-8">Error loading processes. Check console for details.</p>';
        }
    }
}

// Make globally accessible
window.ProcessManager = ProcessManager;
window.addProcess = () => ProcessManager.add();
window.loadDefaultProcesses = () => ProcessManager.loadDefaults();
window.deleteProcess = (id) => ProcessManager.delete(id);
window.editProcess = (id) => ProcessManager.edit(id);
window.closeEditModal = () => ProcessManager.closeEditModal();
window.saveProcessEdit = () => ProcessManager.saveEdit();
