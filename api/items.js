const { MongoClient, ObjectId } = require('mongodb');


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
    console.log('Items API called with method:', req.method);
    const { db } = await connectToDatabase();
    const collection = db.collection('items');

    if (req.method === 'GET') {
      console.log('Fetching all items...');
      const items = await collection.find({}).sort({ createdAt: -1 }).toArray();
      console.log('Found', items.length, 'items');
      res.status(200).json(items);
    } 
    else if (req.method === 'POST') {
      console.log('Creating new item...');
      let item;
      try {
        item = JSON.parse(req.body);
      } catch (e) {
        console.error('Failed to parse request body:', e);
        return res.status(400).json({ error: 'Invalid JSON in request body' });
      }
      
      console.log('Item data:', item);
      
      if (!item.name || !item.code) {
        return res.status(400).json({ error: 'Item name and code are required' });
      }
      
      item.createdAt = new Date();
      const result = await collection.insertOne(item);
      console.log('Item created with ID:', result.insertedId);
      res.status(201).json({ ...item, _id: result.insertedId });
    }
    else if (req.method === 'DELETE') {
      console.log('Deleting item...');
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Item ID is required' });
      }
      console.log('Deleting item with ID:', id);
      await collection.deleteOne({ _id: new ObjectId(id) });
      res.status(200).json({ message: 'Item deleted' });
    }
    else {
      console.error('Method not allowed:', req.method);
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack
    });
  }
};
