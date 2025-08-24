/**
 * Migration utilities for converting MongoDB ObjectIds to custom IDs
 * Run this once to migrate existing data
 */

import { MongoClient, ObjectId } from 'mongodb';
import { generateUserId, generateMemoryId } from './id-generator';

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

export async function migrateUsersToCustomIds(): Promise<{ success: boolean; migratedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let migratedCount = 0;

  try {
    const client = await clientPromise;
    const db = client.db('allaboutme');
    const users = db.collection('users');

    // Find all users without custom IDs
    const usersToMigrate = await users.find({ id: { $exists: false } }).toArray();
    
    console.log(`Found ${usersToMigrate.length} users to migrate`);

    for (const user of usersToMigrate) {
      try {
        const customId = generateUserId();
        
        await users.updateOne(
          { _id: user._id },
          { 
            $set: { 
              id: customId,
              updatedAt: new Date()
            } 
          }
        );
        
        migratedCount++;
        console.log(`Migrated user ${user.email} to ID: ${customId}`);
      } catch (error) {
        const errorMsg = `Failed to migrate user ${user.email}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return {
      success: errors.length === 0,
      migratedCount,
      errors
    };

  } catch (error) {
    console.error('Migration error:', error);
    return {
      success: false,
      migratedCount,
      errors: [`Migration failed: ${error}`]
    };
  }
}

export async function migrateMemoriesToCustomIds(): Promise<{ success: boolean; migratedCount: number; errors: string[] }> {
  const errors: string[] = [];
  let migratedCount = 0;

  try {
    const client = await clientPromise;
    const db = client.db('allaboutme');
    const memories = db.collection('memories');
    const users = db.collection('users');

    // Find all memories without custom IDs
    const memoriesToMigrate = await memories.find({ id: { $exists: false } }).toArray();
    
    console.log(`Found ${memoriesToMigrate.length} memories to migrate`);

    for (const memory of memoriesToMigrate) {
      try {
        const customId = generateMemoryId();
        
        // Find the user's custom ID if they have one
        let userId = memory.userId;
        if (ObjectId.isValid(memory.userId)) {
          const user = await users.findOne({ _id: new ObjectId(memory.userId) });
          if (user && user.id) {
            userId = user.id;
          }
        }
        
        await memories.updateOne(
          { _id: memory._id },
          { 
            $set: { 
              id: customId,
              userId: userId,
              updatedAt: new Date()
            } 
          }
        );
        
        migratedCount++;
        console.log(`Migrated memory ${memory.title} to ID: ${customId}`);
      } catch (error) {
        const errorMsg = `Failed to migrate memory ${memory.title}: ${error}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return {
      success: errors.length === 0,
      migratedCount,
      errors
    };

  } catch (error) {
    console.error('Memory migration error:', error);
    return {
      success: false,
      migratedCount,
      errors: [`Memory migration failed: ${error}`]
    };
  }
}

export async function runFullMigration(): Promise<void> {
  console.log('Starting full migration to custom IDs...');
  
  // Migrate users first
  console.log('\n=== Migrating Users ===');
  const userResult = await migrateUsersToCustomIds();
  console.log(`Users migrated: ${userResult.migratedCount}`);
  if (userResult.errors.length > 0) {
    console.error('User migration errors:', userResult.errors);
  }

  // Then migrate memories
  console.log('\n=== Migrating Memories ===');
  const memoryResult = await migrateMemoriesToCustomIds();
  console.log(`Memories migrated: ${memoryResult.migratedCount}`);
  if (memoryResult.errors.length > 0) {
    console.error('Memory migration errors:', memoryResult.errors);
  }

  console.log('\n=== Migration Complete ===');
  console.log(`Total users migrated: ${userResult.migratedCount}`);
  console.log(`Total memories migrated: ${memoryResult.migratedCount}`);
  
  if (userResult.errors.length > 0 || memoryResult.errors.length > 0) {
    console.log('Some errors occurred during migration. Check logs above.');
  } else {
    console.log('Migration completed successfully!');
  }
}