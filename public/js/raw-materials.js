class DealerManager {
    static async save() {
        const name = document.getElementById('dealerName').value.trim();
        if(!name) return;
        
        await api.call('/dealers', 'POST', { name });
        document.getElementById('dealerName').value = '';
        await this.render();
        await RawMaterialManager.updateDealerDropdown(); // Refresh the RM form dropdown
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
        // Use a safety check to prevent the 'null' crash
        const dealerEl = document.getElementById('rmDealerSelect');
        const nameEl = document.getElementById('rmName');
        
        if (!dealerEl || !nameEl) {
            console.error("Form elements missing!");
            return;
        }

        const material = {
            name: nameEl.value,
            dealer: dealerEl.value, // FIXED ID
            dimension: document.getElementById('rmDimension').value,
            netWeight: parseFloat(document.getElementById('rmNetWeight').value) || 0,
            lossPercent: parseInt(document.getElementById('rmLossPercent').value) || 0,
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

    static clearForm() {
        document.getElementById('rmName').value = '';
        document.getElementById('rmDealerSelect').value = ''; // FIXED ID
        document.getElementById('rmDimension').value = '';
        document.getElementById('rmNetWeight').value = '';
        document.getElementById('rmGrossWeightDisplay').textContent = '0.000';
    }

 static async render() {
    const list = document.getElementById('rmList');
    const materials = await api.call('/raw-materials', 'GET');
    
    if (!materials || materials.length === 0) {
        list.innerHTML = '<p class="text-gray-400 italic text-sm">No raw materials added to master yet.</p>';
        return;
    }

    list.innerHTML = materials.map(rm => `
        <div class="border border-gray-100 rounded-lg p-4 hover:bg-gray-50 flex justify-between items-center transition-all">
            <div>
                <h3 class="font-bold text-gray-800">${rm.name}</h3>
                <p class="text-xs text-gray-500">${rm.dimension} | ${rm.dealer || 'Unknown Dealer'}</p>
            </div>
            <div class="text-right">
                <p class="text-xs text-gray-400">Net: ${(parseFloat(rm.netWeight) || 0).toFixed(3)} kg</p>
                <p class="text-sm font-bold text-indigo-600">${(parseFloat(rm.grossWeight) || 0).toFixed(3)} kg</p>
            </div>
        </div>
    `).join('');
}

    static clearForm() {
        document.getElementById('rmName').value = '';
        document.getElementById('rmDealer').value = '';
        document.getElementById('rmDimension').value = '';
        document.getElementById('rmNetWeight').value = '';
        document.getElementById('rmGrossWeightDisplay').textContent = '0';
    }
}

RawMaterialManager.updateDealerDropdown();
window.RawMaterialManager = RawMaterialManager;;
window.DealerManager = DealerManager;
