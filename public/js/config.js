// ========================================
// FRONTEND JAVASCRIPT MODULE
// File: js/config.js
// Purpose: Configuration, constants, and global state
// Runs on: Browser (Client-side)
// ========================================

const CONFIG = {
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:3000/api' 
        : `${window.location.origin}/api`,
    
    DEFAULT_PROCESSES: [
        { name: 'Raw Material Acquisition', code: 'RMA-001', description: 'Procurement and inspection of raw materials', color: 'gray' },
        { name: 'Cutting', code: 'CUT-001', description: 'Initial cutting of raw material to size', color: 'orange' },
        { name: 'Forging', code: 'FRG-001', description: 'Shaping metal through compressive forces', color: 'red' },
        { name: 'CNC', code: 'CNC-001', description: 'Computer Numerical Control machining', color: 'blue' },
        { name: 'VMC', code: 'VMC-001', description: 'Vertical Machining Center operations', color: 'indigo' },
        { name: 'Heat Treatment', code: 'HTT-001', description: 'Thermal processing for material properties', color: 'amber' },
        { name: 'Grinding', code: 'GRD-001', description: 'Precision surface finishing', color: 'teal' },
        { name: 'Quality Check', code: 'QCI-001', description: 'Inspection and quality verification', color: 'purple' },
        { name: 'Packaging', code: 'PKG-001', description: 'Final packaging for shipment', color: 'green' },
        { name: 'Dispatch', code: 'DSP-001', description: 'Shipping and delivery', color: 'pink' }
    ],
    
    COLOR_CLASSES: {
        gray: 'bg-gray-100 text-gray-800 border-gray-300',
        red: 'bg-red-100 text-red-800 border-red-300',
        orange: 'bg-orange-100 text-orange-800 border-orange-300',
        amber: 'bg-amber-100 text-amber-800 border-amber-300',
        green: 'bg-green-100 text-green-800 border-green-300',
        teal: 'bg-teal-100 text-teal-800 border-teal-300',
        blue: 'bg-blue-100 text-blue-800 border-blue-300',
        indigo: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        purple: 'bg-purple-100 text-purple-800 border-purple-300',
        pink: 'bg-pink-100 text-pink-800 border-pink-300'
    },
    
    PRIORITY_COLORS: {
        normal: 'bg-gray-100 text-gray-800',
        high: 'bg-orange-100 text-orange-800',
        urgent: 'bg-red-100 text-red-800'
    },
    
    DIMENSION_UNITS: ['mm', 'cm', 'inch', 'deg', 'μm']
};

// Global State
const STATE = {
    selectedColor: 'blue',
    selectedProcessesForRoute: [],
    itemDimensions: [],
    currentBatchId: null,
    draggedIndex: null
};
