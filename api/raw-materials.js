import { getDb } from '../lib/mongodb';

export default async function handler(req, res) {
    const db = await getDb();
    const collection = db.collection('raw_materials');

    if (req.method === 'POST') {
        // Data includes name, dealer, netWeight, lossPercent, and grossWeight
        const result = await collection.insertOne(req.body);
        return res.status(201).json(result);
    }

    if (req.method === 'GET') {
        const materials = await collection.find({}).toArray();
        return res.status(200).json(materials);
    }

    res.status(405).json({ message: 'Method not allowed' });
}
