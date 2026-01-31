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
  const db = client.db('auto_parts_tracker'); // Matches items.js
  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } 
      catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  // CRITICAL: Match items.js CORS and OPTIONS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('raw_materials');

    if (req.method === 'GET') {
      const materials = await collection.find({}).sort({ createdAt: -1 }).toArray();
      res.status(200).json(materials);
    } 
    else if (req.method === 'POST') {
      const material = await parseBody(req); //
      
      // Industrial Validation
      if (!material.name || !material.dealer) {
        return res.status(400).json({ error: 'Name and Dealer are required' });
      }

      material.createdAt = new Date();
      const result = await collection.insertOne(material);
      res.status(201).json({ ...material, _id: result.insertedId });
    }
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
};
