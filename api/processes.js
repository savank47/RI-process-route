// ========================================
// BACKEND API ENDPOINT (Vercel Serverless)
// File: api/processes.js
// Purpose: CRUD operations for Process Library
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
    const collection = db.collection('processes');

    if (req.method === 'GET') {
      const processes = await collection.find({}).sort({ createdAt: -1 }).toArray();
      res.status(200).json(processes);
    } 
    else if (req.method === 'POST') {
      const process = JSON.parse(req.body);
      process.createdAt = new Date();
      const result = await collection.insertOne(process);
      res.status(201).json({ ...process, _id: result.insertedId });
    }
    else if (req.method === 'PUT') {
      const { id } = req.query;
      const updates = JSON.parse(req.body);
      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
      );
      res.status(200).json({ message: 'Process updated' });
    }
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      await collection.deleteOne({ _id: new ObjectId(id) });
      
      // Remove from items
      const itemsCollection = db.collection('items');
      await itemsCollection.updateMany(
        { 'processRoute.id': id },
        { $pull: { processRoute: { id: id } } }
      );
      
      res.status(200).json({ message: 'Process deleted' });
    }
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
};