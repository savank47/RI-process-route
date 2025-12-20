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
    const { db } = await connectToDatabase();
    const collection = db.collection('batches');

    if (req.method === 'GET') {
      const batches = await collection.find({}).sort({ createdAt: -1 }).toArray();
      res.status(200).json(batches);
    } 
    else if (req.method === 'POST') {
      const batch = JSON.parse(req.body);
      batch.createdAt = new Date();
      batch.completedAt = null;
      const result = await collection.insertOne(batch);
      res.status(201).json({ ...batch, _id: result.insertedId });
    }
    else if (req.method === 'PUT') {
      const { id } = req.query;
      const updates = JSON.parse(req.body);
      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
      );
      res.status(200).json({ message: 'Batch updated' });
    }
    else if (req.method === 'DELETE') {
      const { id } = req.query;
      await collection.deleteOne({ _id: new ObjectId(id) });
      res.status(200).json({ message: 'Batch deleted' });
    }
    else if (req.method === 'PATCH') {
      const { id, processIndex } = req.query;
      const updates = JSON.parse(req.body);
      
      const batch = await collection.findOne({ _id: new ObjectId(id) });
      if (!batch) {
        return res.status(404).json({ error: 'Batch not found' });
      }

      batch.processes[processIndex] = { 
        ...batch.processes[processIndex], 
        ...updates 
      };

      const allCompleted = batch.processes.every(p => p.status === 'completed');
      batch.completedAt = allCompleted ? new Date() : null;

      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { processes: batch.processes, completedAt: batch.completedAt } }
      );
      
      res.status(200).json(batch);
    }
    else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
};
