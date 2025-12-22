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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('batches');

    // Parse query parameters
    const { id, processIndex, action } = req.query;

    if (req.method === 'GET') {
      const batches = await collection.find({}).sort({ createdAt: -1 }).toArray();
      res.status(200).json(batches);
    } 
    else if (req.method === 'POST') {
      const batch = await parseBody(req);
      batch.createdAt = new Date();
      batch.completedAt = null;
      const result = await collection.insertOne(batch);
      res.status(201).json({ ...batch, _id: result.insertedId });
    }
    else if (req.method === 'PUT') {
      // Check if this is a process update (has processIndex)
      if (processIndex !== undefined && action === 'updateProcess') {
        console.log('Updating process:', id, processIndex);
        const updates = await parseBody(req);
        
        const batch = await collection.findOne({ _id: new ObjectId(id) });
        if (!batch) {
          return res.status(404).json({ error: 'Batch not found' });
        }

        const idx = parseInt(processIndex);
        batch.processes[idx] = { 
          ...batch.processes[idx], 
          ...updates 
        };

        const allCompleted = batch.processes.every(p => p.status === 'completed');
        batch.completedAt = allCompleted ? new Date() : null;

        await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { processes: batch.processes, completedAt: batch.completedAt } }
        );
        
        res.status(200).json(batch);
      } else {
        // Regular batch update
        const updates = await parseBody(req);
        await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updates }
        );
        res.status(200).json({ message: 'Batch updated' });
      }
    }
    else if (req.method === 'DELETE') {
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
