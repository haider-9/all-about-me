import type { APIRoute } from 'astro';
import { MongoClient } from 'mongodb';

export const GET: APIRoute = async () => {
  const MONGODB_URI = 'mongodb+srv://haider:108663@cluster0.f2shpqt.mongodb.net/allaboutme?retryWrites=true&w=majority&appName=Cluster0';
  
  try {
    console.log('Testing MongoDB connection...');
    console.log('URI:', MONGODB_URI);
    
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    // Test the connection
    const db = client.db('allaboutme');
    const collections = await db.listCollections().toArray();
    
    await client.close();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'MongoDB connection successful',
      collections: collections.map(c => c.name)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      details: error
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};