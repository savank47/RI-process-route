class DealerManager {
    static async save() {
        const name = document.getElementById('dealerName').value.trim();
        if(!name) return;
        
        await api.call('/dealers', 'POST', { name });
        document.getElementById('dealerName').value = '';
        this.render();
        RawMaterialManager.updateDealerDropdown(); // Refresh the RM form dropdown
    }

    static async render() {
        const list = document.getElementById('dealerList');
        const dealers = await api.call('/dealers', 'GET');
        document.getElementById('dealerList').innerHTML = dealers.map(d => 
            `
            <span class="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold border border-blue-200">
                ${d.name}
            </span>
        `).join('');
    }
}

class RawMaterialManager {
    static calculateGrossWeight() {
        const net = parseFloat(document.getElementById('rmNetWeight').value) || 0;
        const lossPercent = parseFloat(document.getElementById('rmLossPercent').value) || 0;
 
        const gross = net * (1 + (lossPercent / 100));
        
        document.getElementById('rmGrossWeightDisplay').textContent = gross.toFixed(3);
        return gross;
    }

    static async updateDealerDropdown() {
        const select = document.getElementById('rmDealerSelect');
        const dealers = await api.call('/dealers', 'GET');
        select.innerHTML = '<option value="">-- Select Dealer --</option>' + 
            dealers.map(d => `<option value="${d.name}">${d.name}</option>`).join('');
    }

    static async save() {
        const material = {
            name: document.getElementById('rmName').value,
            dealer: document.getElementById('rmDealer').value,
            dimension: document.getElementById('rmDimension').value,
            netWeight: parseFloat(document.getElementById('rmNetWeight').value),
            lossPercent: parseInt(document.getElementById('rmLossPercent').value),
            grossWeight: this.calculateGrossWeight()
        };

        if (!material.name) {
            UI.showToast('Material name is required', 'error');
            return;
        }

        try {
            await api.call('/raw-materials', 'POST', material);
            UI.showToast('Raw Material saved to Master');
            this.clearForm();
            this.render();
        } catch (error) {
            UI.showToast('Failed to save material', 'error');
        }
    }

    static async render() {
        const list = document.getElementById('rmList');
        // Ensure this endpoint exists in your Vercel/Node backend
        const materials = await api.call('/raw-materials', 'GET');
        
        if (!materials || materials.length === 0) {
            list.innerHTML = '<p class="text-center py-8 text-gray-500">No raw materials added to master yet.</p>';
            return;
        }
    
        list.innerHTML = materials.map(rm => {
            // Ensure values are numbers before formatting
            const netVal = parseFloat(rm.netWeight) || 0;
            const grossVal = parseFloat(rm.grossWeight) || 0;
    
            return `
                <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 flex justify-between items-center animate-slide-in">
                    <div>
                        <h3 class="font-bold text-gray-800">${rm.name}</h3>
                        <p class="text-sm text-gray-600">${rm.dimension} | Supplied by: ${rm.dealer || '—'}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-gray-500">Net: ${netVal.toFixed(3)} kg (+${rm.lossPercent}%)</p>
                        <p class="text-sm font-bold text-indigo-600">Gross: ${grossVal.toFixed(3)} kg</p>
                    </div>
                </div>
            `;
        }).join('');
    }

    static clearForm() {
        document.getElementById('rmName').value = '';
        document.getElementById('rmDealer').value = '';
        document.getElementById('rmDimension').value = '';
        document.getElementById('rmNetWeight').value = '';
        document.getElementById('rmGrossWeightDisplay').textContent = '0';
    }
}


window.RawMaterialManager = RawMaterialManager;
