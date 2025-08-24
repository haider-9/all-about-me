import { MongoClient } from 'mongodb';
import { generateMemoryId, isValidId } from './id-generator';

// MongoDB connection (reuse from auth.ts)
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

export interface Memory {
  id: string; // Custom ID (e.g., mem_k7x9m2p4)
  userId: string; // User's custom ID
  title: string;
  description: string;
  date: string; // Date when the memory happened
  type: 'milestone' | 'memory' | 'achievement';
  image?: string; // Base64 encoded image
  tags?: string[];
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export async function createMemory(
  userId: string, 
  memoryData: Omit<Memory, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<Memory | null> {
  try {
    if (!isValidId(userId, 'user')) {
      console.error('Invalid user ID format:', userId);
      return null;
    }

    const client = await clientPromise;
    const db = client.db('allaboutme');
    const memories = db.collection('memories');

    const memoryId = generateMemoryId();
    
    const newMemory: Memory = {
      id: memoryId,
      userId,
      ...memoryData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await memories.insertOne(newMemory);
    return newMemory;
  } catch (error) {
    console.error('Error creating memory:', error);
    throw error;
  }
}

export async function getMemoriesByUserId(userId: string, includePrivate: boolean = true): Promise<Memory[]> {
  try {
    if (!isValidId(userId, 'user')) {
      console.error('Invalid user ID format:', userId);
      return [];
    }

    const client = await clientPromise;
    const db = client.db('allaboutme');
    const memories = db.collection('memories');

    const filter: any = { userId };
    if (!includePrivate) {
      filter.isPrivate = false;
    }

    const memoriesArray = await memories
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();

    return memoriesArray as Memory[];
  } catch (error) {
    console.error('Error getting memories:', error);
    throw error;
  }
}

export async function getMemoryById(memoryId: string, userId?: string): Promise<Memory | null> {
  try {
    if (!isValidId(memoryId, 'mem')) {
      console.error('Invalid memory ID format:', memoryId);
      return null;
    }

    const client = await clientPromise;
    const db = client.db('allaboutme');
    const memories = db.collection('memories');

    const filter: any = { id: memoryId };
    
    // If userId is provided, ensure the memory belongs to the user or is public
    if (userId) {
      if (!isValidId(userId, 'user')) {
        console.error('Invalid user ID format:', userId);
        return null;
      }
      filter.$or = [
        { userId, isPrivate: false },
        { userId }
      ];
    } else {
      // If no userId provided, only return public memories
      filter.isPrivate = false;
    }

    const memory = await memories.findOne(filter);
    return memory as Memory | null;
  } catch (error) {
    console.error('Error getting memory by ID:', error);
    throw error;
  }
}

export async function updateMemory(
  memoryId: string, 
  userId: string, 
  updateData: Partial<Omit<Memory, 'id' | 'userId' | 'createdAt'>>
): Promise<Memory | null> {
  try {
    if (!isValidId(memoryId, 'mem') || !isValidId(userId, 'user')) {
      console.error('Invalid ID format:', { memoryId, userId });
      return null;
    }

    const client = await clientPromise;
    const db = client.db('allaboutme');
    const memories = db.collection('memories');

    const result = await memories.findOneAndUpdate(
      { id: memoryId, userId }, // Ensure user owns the memory
      { 
        $set: { 
          ...updateData, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );

    return result as Memory | null;
  } catch (error) {
    console.error('Error updating memory:', error);
    throw error;
  }
}

export async function deleteMemory(memoryId: string, userId: string): Promise<boolean> {
  try {
    if (!isValidId(memoryId, 'mem') || !isValidId(userId, 'user')) {
      console.error('Invalid ID format:', { memoryId, userId });
      return false;
    }

    const client = await clientPromise;
    const db = client.db('allaboutme');
    const memories = db.collection('memories');

    const result = await memories.deleteOne({ id: memoryId, userId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting memory:', error);
    throw error;
  }
}

export async function getPublicMemories(limit: number = 20, offset: number = 0): Promise<Memory[]> {
  try {
    const client = await clientPromise;
    const db = client.db('allaboutme');
    const memories = db.collection('memories');

    const memoriesArray = await memories
      .find({ isPrivate: false })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    return memoriesArray as Memory[];
  } catch (error) {
    console.error('Error getting public memories:', error);
    throw error;
  }
}

export async function searchMemories(
  query: string, 
  userId?: string, 
  includePrivate: boolean = false
): Promise<Memory[]> {
  try {
    const client = await clientPromise;
    const db = client.db('allaboutme');
    const memories = db.collection('memories');

    const searchFilter: any = {
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]
    };

    if (userId && isValidId(userId, 'user')) {
      if (includePrivate) {
        searchFilter.userId = userId;
      } else {
        searchFilter.$and = [
          { userId },
          { isPrivate: false }
        ];
      }
    } else {
      searchFilter.isPrivate = false;
    }

    const memoriesArray = await memories
      .find(searchFilter)
      .sort({ createdAt: -1 })
      .toArray();

    return memoriesArray as Memory[];
  } catch (error) {
    console.error('Error searching memories:', error);
    throw error;
  }
}