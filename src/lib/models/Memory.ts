import mongoose, { Document, Schema } from 'mongoose';

export interface IMemory extends Document {
  _id: string;
  title: string;
  description: string;
  date: Date;
  type: 'memory' | 'milestone' | 'achievement';
  image?: string;
  tags: string[];
  userId: mongoose.Types.ObjectId;
  location?: {
    name: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  mood?: 'happy' | 'sad' | 'excited' | 'nostalgic' | 'grateful' | 'proud' | 'peaceful';
  isPrivate: boolean;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

const MemorySchema = new Schema<IMemory>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot be more than 2000 characters']
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  type: {
    type: String,
    required: [true, 'Type is required'],
    enum: ['memory', 'milestone', 'achievement']
  },
  image: {
    type: String,
    required: false
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot be more than 50 characters']
  }],
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  location: {
    name: {
      type: String,
      trim: true,
      maxlength: [200, 'Location name cannot be more than 200 characters']
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  mood: {
    type: String,
    enum: ['happy', 'sad', 'excited', 'nostalgic', 'grateful', 'proud', 'peaceful'],
    required: false
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  likes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
MemorySchema.index({ userId: 1, createdAt: -1 });
MemorySchema.index({ userId: 1, date: -1 });
MemorySchema.index({ userId: 1, type: 1 });
MemorySchema.index({ tags: 1 });
MemorySchema.index({ 'location.coordinates': '2dsphere' });

// Virtual for formatted date
MemorySchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

export default mongoose.models.Memory || mongoose.model<IMemory>('Memory', MemorySchema);