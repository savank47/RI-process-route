// ========================================
// BACKEND API ENDPOINT (Vercel Serverless)
// File: api/batches.js
// Purpose: CRUD operations for Production Batches
// Runs on: Server (Vercel)
// ========================================

const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const db = client.db('auto_parts_tracker');
  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

// Helper to parse request body
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('batches');

    if (req.method === 'GET') {
      const batches = await collection.find({}).sort({ createdAt: -1 }).toArray();
      res.status(200).json(batches);
    } 
    else if (req.method === 'POST') {
      console.log('Creating new batch...');
      const batch = await parseBody(req); // Changed from JSON.parse(req.body)
      
      console.log('Batch data received:', batch);
      
      if (!batch.batchNumber || !batch.quantity || !batch.itemId) {
        return res.status(400).json({ error: 'Batch number, quantity, and item are required' });
      }
      
      batch.createdAt = new Date();
      batch.completedAt = null;
      const result = await collection.insertOne(batch);
      console.log('Batch created with ID:', result.insertedId);
      res.status(201).json({ ...batch, _id: result.insertedId });
    }
    else if (req.method === 'PUT') {
      const { id, processIndex, action } = req.query;
      
      if (processIndex !== undefined && action === 'updateProcess') {
        const updates = await parseBody(req);
        const idx = parseInt(processIndex);
    
        // Atomic update using the positional index
        // This is faster and prevents "Race Conditions" on the shop floor
        const updateQuery = { [`processes.${idx}`]: { ...updates } };
        
        // Perform the update
        await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateQuery }
        );
    
        // Check if the whole batch is now complete
        const updatedBatch = await collection.findOne({ _id: new ObjectId(id) });
        const allCompleted = updatedBatch.processes.every(p => p.status === 'completed');
        
        if (allCompleted && !updatedBatch.completedAt) {
          await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { completedAt: new Date() } }
          );
        } else if (!allCompleted && updatedBatch.completedAt) {
          await collection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { completedAt: null } }
          );
        }
        
        res.status(200).json(updatedBatch);
      } else {
        // Regular batch update for non-process fields
        const updates = await parseBody(req);
        await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updates }
        );
        res.status(200).json({ message: 'Batch updated' });
      }
    }
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      await collection.deleteOne({ _id: new ObjectId(id) });
      res.status(200).json({ message: 'Batch deleted' });
    }
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
};
