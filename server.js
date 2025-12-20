const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/auto_parts_tracker';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// Models
const ProcessSchema = new mongoose.Schema({
  name: String,
  code: String,
  description: String,
  color: String,
  createdAt: { type: Date, default: Date.now }
});

const ItemSchema = new mongoose.Schema({
  name: String,
  code: String,
  specifications: String,
  material: String,
  category: String,
  processRoute: [{
    id: String,
    name: String,
    code: String,
    description: String,
    color: String,
    order: Number
  }],
  createdAt: { type: Date, default: Date.now }
});

const BatchSchema = new mongoose.Schema({
  batchNumber: String,
  quantity: Number,
  priority: String,
  targetDate: String,
  customer: String,
  itemId: String,
  itemName: String,
  itemCode: String,
  processes: [{
    id: String,
    name: String,
    code: String,
    description: String,
    color: String,
    order: Number,
    status: String,
    startTime: Date,
    endTime: Date,
    notes: String
  }],
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});

const Process = mongoose.model('Process', ProcessSchema);
const Item = mongoose.model('Item', ItemSchema);
const Batch = mongoose.model('Batch', BatchSchema);

// Routes - Process Library
app.post('/api/processes', async (req, res) => {
  try {
    const process = new Process(req.body);
    await process.save();
    res.status(201).json(process);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/processes', async (req, res) => {
  try {
    const processes = await Process.find().sort({ createdAt: -1 });
    res.json(processes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/processes/:id', async (req, res) => {
  try {
    await Process.findByIdAndDelete(req.params.id);
    // Remove from items
    await Item.updateMany(
      { 'processRoute.id': req.params.id },
      { $pull: { processRoute: { id: req.params.id } } }
    );
    res.json({ message: 'Process deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/processes/:id', async (req, res) => {
  try {
    const process = await Process.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(process);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Routes - Items
app.post('/api/items', async (req, res) => {
  try {
    const item = new Item(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/items', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    await Item.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes - Batches
app.post('/api/batches', async (req, res) => {
  try {
    const batch = new Batch(req.body);
    await batch.save();
    res.status(201).json(batch);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/batches', async (req, res) => {
  try {
    const batches = await Batch.find().sort({ createdAt: -1 });
    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/batches/:id', async (req, res) => {
  try {
    await Batch.findByIdAndDelete(req.params.id);
    res.json({ message: 'Batch deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/batches/:id', async (req, res) => {
  try {
    const batch = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(batch);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/batches/:id/process/:processIndex', async (req, res) => {
  try {
    const { id, processIndex } = req.params;
    const updates = req.body;
    
    const batch = await Batch.findById(id);
    if (!batch) {
      return res.status(404).json({ error: 'Batch not found' });
    }

    batch.processes[processIndex] = { 
      ...batch.processes[processIndex], 
      ...updates 
    };

    // Check if all processes completed
    const allCompleted = batch.processes.every(p => p.status === 'completed');
    if (allCompleted) {
      batch.completedAt = new Date();
    } else {
      batch.completedAt = null;
    }

    await batch.save();
    res.json(batch);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📝 API Base URL: http://localhost:${PORT}/api`);
});
