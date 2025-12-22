// ========================================
// FRONTEND JAVASCRIPT MODULE
// File: js/api.js
// Purpose: API Client - Calls backend endpoints
// Runs on: Browser (Client-side)
// ========================================

class API {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    // Generic API call
    async call(endpoint, method = 'GET', data = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            mode: 'cors'
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, options);
            
            if (!response.ok) {
                let errorData;
                const contentType = response.headers.get('content-type');
                
                try {
                    if (contentType && contentType.includes('application/json')) {
                        errorData = await response.json();
                    } else {
                        errorData = await response.text();
                    }
                } catch (parseError) {
                    errorData = `Status: ${response.status}`;
                }
                
                throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                const text = await response.text();
                try {
                    return JSON.parse(text);
                } catch {
                    return text;
                }
            }
        } catch (error) {
            console.error('API call failed:', error.message);
            // Only fallback to localStorage for GET requests
            if (method === 'GET') {
                return this.useLocalStorageFallback(endpoint, method, data);
            }
            throw error;
        }
    }

    // LocalStorage Fallback
    useLocalStorageFallback(endpoint, method, data) {
        const storageKey = `appData${endpoint.replace(/\/api\/(\w+).*/, '$1')}`;
        
        if (method === 'GET') {
            const data = localStorage.getItem(storageKey);
            return data ? JSON.parse(data) : [];
        } else if (method === 'POST') {
            const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
            existing.unshift(data);
            localStorage.setItem(storageKey, JSON.stringify(existing));
            return data;
        }
        return null;
    }

    // API Status Check
    async checkStatus() {
        try {
            const response = await fetch(`${this.baseURL}/health`, {
                method: 'GET',
                mode: 'cors',
                timeout: 5000
            });
            
            return response.ok;
        } catch (error) {
            console.log('API not available, using localStorage');
            return false;
        }
    }

    // Processes
    async getProcesses() {
        return await this.call('/processes', 'GET');
    }

    async addProcess(process) {
        return await this.call('/processes', 'POST', process);
    }

    async updateProcess(id, updates) {
        return await this.call(`/processes?id=${id}`, 'PUT', updates);
    }

    async deleteProcess(id) {
        return await this.call(`/processes?id=${id}`, 'DELETE');
    }

    // Items
    async getItems() {
        return await this.call('/items', 'GET');
    }

    async addItem(item) {
        return await this.call('/items', 'POST', item);
    }

    async deleteItem(id) {
        return await this.call(`/items?id=${id}`, 'DELETE');
    }

    // Batches
    async getBatches() {
        return await this.call('/batches', 'GET');
    }

    async addBatch(batch) {
        return await this.call('/batches', 'POST', batch);
    }

    async updateBatch(id, updates) {
        return await this.call(`/batches?id=${id}`, 'PUT', updates);
    }

    async deleteBatch(id) {
        return await this.call(`/batches?id=${id}`, 'DELETE');
    }

    async updateBatchProcess(batchId, processIndex, updates) {
        return await this.call(
            `/batches?id=${batchId}&processIndex=${processIndex}&action=updateProcess`, 
            'PUT', 
            updates
        );
    }
}

// Export API instance
const api = new API(CONFIG.API_BASE_URL);
