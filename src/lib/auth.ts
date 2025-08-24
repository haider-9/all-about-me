import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { generateUserId, generateSessionId, isValidId } from './id-generator';

// Try different ways to get the MongoDB URI
const MONGODB_URI = 
  import.meta.env.MONGODB_URI || 
  process.env.MONGODB_URI || 
  'mongodb+srv://haider:108663@cluster0.f2shpqt.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

console.log('MongoDB URI loaded:', MONGODB_URI ? 'URI found' : 'URI not found');

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Create MongoDB client with options
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

export interface User {
  _id?: ObjectId;
  id: string; // Custom ID (e.g., user_k7x9m2p4)
  email: string;
  password: string;
  fullName: string;
  bio?: string;
  location?: string;
  birthDate?: string;
  interests?: string;
  profileImage?: string;
  bannerImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function createUser(email: string, password: string, fullName: string): Promise<User | null> {
  try {
    console.log('Attempting to create user:', email);
    const client = await clientPromise;
    console.log('MongoDB client connected successfully');
    
    const db = client.db('allaboutme');
    const users = db.collection('users');

    // Check if user already exists
    console.log('Checking for existing user...');
    const existingUser = await users.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('User already exists');
      return null;
    }

    // Generate custom user ID
    const customId = generateUserId();
    console.log('Generated custom ID:', customId);

    // Hash password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with custom ID
    console.log('Creating new user...');
    const newUser: Omit<User, '_id'> = {
      id: customId,
      email: email.toLowerCase(),
      password: hashedPassword,
      fullName: fullName.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await users.insertOne(newUser);
    console.log('User created successfully with custom ID:', customId);
    
    return {
      ...newUser,
      _id: result.insertedId
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  try {
    const client = await clientPromise;
    const db = client.db('allaboutme');
    const users = db.collection('users');

    const user = await users.findOne({ email: email.toLowerCase() });
    if (!user) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    return user as User;
  } catch (error) {
    console.error('Error authenticating user:', error);
    throw error;
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  try {
    if (!isValidId(userId, 'user')) {
      console.error('Invalid user ID format:', userId);
      return null;
    }

    const client = await clientPromise;
    const db = client.db('allaboutme');
    const users = db.collection('users');

    const user = await users.findOne({ id: userId });
    return user as User | null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
}

export async function updateUserById(userId: string, updateData: Partial<User>): Promise<User | null> {
  try {
    if (!isValidId(userId, 'user')) {
      console.error('Invalid user ID format:', userId);
      return null;
    }

    const client = await clientPromise;
    const db = client.db('allaboutme');
    const users = db.collection('users');

    // Remove fields that shouldn't be updated directly
    const { _id, id, password, createdAt, ...safeUpdateData } = updateData;
    
    const result = await users.findOneAndUpdate(
      { id: userId },
      { 
        $set: { 
          ...safeUpdateData, 
          updatedAt: new Date() 
        } 
      },
      { returnDocument: 'after' }
    );

    return result as User | null;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
  try {
    if (!isValidId(userId, 'user')) {
      console.error('Invalid user ID format:', userId);
      return false;
    }

    const client = await clientPromise;
    const db = client.db('allaboutme');
    const users = db.collection('users');

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const result = await users.updateOne(
      { id: userId },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date() 
        } 
      }
    );

    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
}

export function createSession(user: User): string {
  const sessionId = generateSessionId();
  
  const payload = {
    sessionId,
    id: user.id, // Use custom ID
    email: user.email,
    name: user.fullName,
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    createdAt: user.createdAt
  };

  // In a production app, you'd use a proper JWT library with signing
  // For this demo, we'll use base64 encoding
  return btoa(JSON.stringify(payload));
}

export function verifySession(token: string): any | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function deleteUser(userId: string): Promise<boolean> {
  try {
    if (!isValidId(userId, 'user')) {
      console.error('Invalid user ID format:', userId);
      return false;
    }

    const client = await clientPromise;
    const db = client.db('allaboutme');
    const users = db.collection('users');

    const result = await users.deleteOne({ id: userId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}