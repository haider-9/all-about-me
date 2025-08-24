const { MongoClient } = require('mongodb');

// Replace with your actual credentials
const uri = 'mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@cluster0.f2shpqt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function testConnection() {
  const client = new MongoClient(uri);
  
  try {
    console.log('Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // List databases
    const dbs = await client.db().admin().listDatabases();
    console.log('Available databases:', dbs.databases.map(db => db.name));
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.close();
  }
}

testConnection();
