import { getDb } from '../lib/mongodb'; // Adjust path to your mongo helper

export default async function handler(req, res) {
    const db = await getDb(); // Using your established Mongo connection
    const collection = db.collection('dealers');

    if (req.method === 'POST') {
        const result = await collection.insertOne(req.body);
        return res.status(201).json(result);
    } 
    
    if (req.method === 'GET') {
        const dealers = await collection.find({}).toArray();
        return res.status(200).json(dealers);
    }

    res.status(405).json({ message: 'Method not allowed' });
}
