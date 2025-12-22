// ========================================
// BACKEND API ENDPOINT (Vercel Serverless)
// File: api/items.js
// Purpose: CRUD operations for Items Master
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
    const collection = db.collection('items');

    if (req.method === 'GET') {
      const items = await collection.find({}).sort({ createdAt: -1 }).toArray();
      res.status(200).json(items);
    } 
    else if (req.method === 'POST') {
      const item = JSON.parse(req.body);
      item.createdAt = new Date();
      const result = await collection.insertOne(item);
      res.status(201).json({ ...item, _id: result.insertedId });
    }
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      await collection.deleteOne({ _id: new ObjectId(id) });
      res.status(200).json({ message: 'Item deleted' });
    }
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
};