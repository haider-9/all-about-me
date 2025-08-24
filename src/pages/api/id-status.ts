import type { APIRoute } from 'astro';
import { MongoClient } from 'mongodb';

const MONGODB_URI = 
  import.meta.env.MONGODB_URI || 
  process.env.MONGODB_URI || 
  'mongodb+srv://haider:108663@cluster0.f2shpqt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

if (process.env.NODE_ENV === 'development') {
  if (!(global as any)._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI, mongoOptions);
    (global as any)._mongoClientPromise = client.connect();
  }
  clientPromise = (global as any)._mongoClientPromise;
} else {
  client = new MongoClient(MONGODB_URI, mongoOptions);
  clientPromise = client.connect();
}

export const GET: APIRoute = async () => {
  try {
    const client = await clientPromise;
    const db = client.db('allaboutme');
    
    // Check users
    const users = db.collection('users');
    const totalUsers = await users.countDocuments();
    const usersWithCustomIds = await users.countDocuments({ id: { $exists: true } });
    
    // Check memories
    const memories = db.collection('memories');
    const totalMemories = await memories.countDocuments();
    const memoriesWithCustomIds = await memories.countDocuments({ id: { $exists: true } });

    // Sample IDs
    const sampleUser = await users.findOne({ id: { $exists: true } }, { projection: { id: 1, email: 1 } });
    const sampleMemory = await memories.findOne({ id: { $exists: true } }, { projection: { id: 1, title: 1 } });

    return new Response(JSON.stringify({
      users: {
        total: totalUsers,
        withCustomIds: usersWithCustomIds,
        migrationComplete: totalUsers === usersWithCustomIds,
        sampleId: sampleUser?.id || null,
        sampleEmail: sampleUser?.email || null
      },
      memories: {
        total: totalMemories,
        withCustomIds: memoriesWithCustomIds,
        migrationComplete: totalMemories === memoriesWithCustomIds,
        sampleId: sampleMemory?.id || null,
        sampleTitle: sampleMemory?.title || null
      },
      overallStatus: {
        migrationNeeded: (totalUsers > usersWithCustomIds) || (totalMemories > memoriesWithCustomIds),
        allMigrated: (totalUsers === usersWithCustomIds) && (totalMemories === memoriesWithCustomIds)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('ID status check error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to check ID status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};