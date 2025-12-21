const { MongoClient } = require('mongodb');


module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Debug: Check if URI exists
  const uri = process.env.MONGODB_URI;
  
  if (!uri) {
    console.error('MONGODB_URI is NOT SET in environment');
    return res.status(500).json({ 
      status: 'ERROR', 
      message: 'MONGODB_URI environment variable is missing',
      check: 'Add it in Vercel Settings → Environment Variables'
    });
  }

  if (uri.length < 30) {
    console.error('MONGODB_URI is too short:', uri);
    return res.status(500).json({ 
      status: 'ERROR', 
      message: 'MONGODB_URI appears incomplete',
      uriLength: uri.length,
      uri: uri
    });
  }

  // Check URI format
  if (!uri.includes('mongodb+srv://')) {
    console.error('Invalid URI format:', uri);
    return res.status(500).json({ 
      status: 'ERROR', 
      message: 'MONGODB_URI must start with mongodb+srv://',
      actualStart: uri.substring(0, 20)
    });
  }

  try {
    console.log('Attempting MongoDB connection...');
    console.log('URI length:', uri.length);
    console.log('URI contains cluster:', uri.includes('cluster'));
    console.log('URI contains mongodb.net:', uri.includes('mongodb.net'));
    
    const client = await MongoClient.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    
    const db = client.db('auto_parts_tracker');
    await db.command({ ping: 1 });
    await client.close();
    
    console.log('✅ MongoDB connection successful!');
    
    res.status(200).json({ 
      status: 'OK', 
      message: 'API and Database are connected',
      uri: 'HIDDEN', // Don't expose full URI
      hasCluster: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Database connection failed',
      error: error.message,
      hint: 'Check MongoDB Atlas: Network Access (0.0.0.0/0) and Database Access (username/password)'
    });
  }
};
