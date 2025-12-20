const { MongoClient, ObjectId } = require("mongodb");

const MONGODB_URI = process.env.MONGODB_URI;

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined");
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db("auto_parts_tracker");

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,DELETE,OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection("processes");

    if (req.method === "GET") {
      const processes = await collection
        .find({})
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json(processes);
    }

    if (req.method === "POST") {
      const body =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      body.createdAt = new Date();
      const result = await collection.insertOne(body);

      return res.status(201).json({ ...body, _id: result.insertedId });
    }

    if (req.method === "PUT") {
      const { id } = req.query;
      const updates =
        typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      await collection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
      );

      return res.status(200).json({ message: "Process updated" });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;

      await collection.deleteOne({ _id: new ObjectId(id) });

      const itemsCollection = db.collection("items");
      await itemsCollection.updateMany(
        { "processRoute.id": id },
        { $pull: { processRoute: { id } } }
      );

      return res.status(200).json({ message: "Process deleted" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Processes API error:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};
