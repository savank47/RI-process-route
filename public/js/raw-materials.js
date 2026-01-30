class RawMaterialManager {
    static calculateGrossWeight() {
        const net = parseFloat(document.getElementById('rmNetWeight').value) || 0;
        const lossPercent = parseFloat(document.getElementById('rmLossPercent').value) || 0;
        
        // Calculation: Gross = Net + (Net * Loss%)
        const gross = net + (net * (lossPercent / 100));
        
        document.getElementById('rmGrossWeightDisplay').textContent = gross.toFixed(2);
        return gross;
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
        const materials = await api.call('/raw-materials', 'GET');
        
        list.innerHTML = materials.map(rm => `
            <div class="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 flex justify-between items-center">
                <div>
                    <h3 class="font-bold text-gray-800">${rm.name}</h3>
                    <p class="text-sm text-gray-600">${rm.dimension} | Supplied by: ${rm.dealer}</p>
                </div>
                <div class="text-right">
                    <p class="text-xs text-gray-500">Net: ${rm.netWeight}g (+${rm.lossPercent}%)</p>
                    <p class="text-sm font-bold text-indigo-600">Gross: ${rm.grossWeight}g</p>
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

window.RawMaterialManager = RawMaterialManager;
