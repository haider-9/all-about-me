import type { APIRoute } from 'astro';
import { verifySession } from '../../lib/auth';
import { 
  createMemory, 
  getMemoriesByUserId, 
  getMemoryById, 
  updateMemory, 
  deleteMemory,
  searchMemories 
} from '../../lib/memories';
import { isValidId } from '../../lib/id-generator';

// GET - Fetch memories (user's own or search)
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const searchParams = url.searchParams;
    const query = searchParams.get('q');
    const memoryId = searchParams.get('id');
    
    // If requesting a specific memory
    if (memoryId) {
      if (!isValidId(memoryId, 'mem')) {
        return new Response(JSON.stringify({ error: 'Invalid memory ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if user is authenticated for private memories
      const authHeader = request.headers.get('authorization');
      let userId: string | undefined;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = verifySession(token);
        if (payload && isValidId(payload.id, 'user')) {
          userId = payload.id;
        }
      }

      const memory = await getMemoryById(memoryId, userId);
      
      if (!memory) {
        return new Response(JSON.stringify({ error: 'Memory not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(memory), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Authentication required for user's memories or search
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const payload = verifySession(token);

    if (!payload || !isValidId(payload.id, 'user')) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = payload.id;

    // If searching
    if (query) {
      const memories = await searchMemories(query, userId, true);
      return new Response(JSON.stringify(memories), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user's memories
    const memories = await getMemoriesByUserId(userId, true);

    return new Response(JSON.stringify(memories), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Memories fetch error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Create new memory
export const POST: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const payload = verifySession(token);

    if (!payload || !isValidId(payload.id, 'user')) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = payload.id;
    const formData = await request.formData();

    // Extract required fields
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;
    const type = formData.get('type') as 'milestone' | 'memory' | 'achievement';
    const isPrivate = formData.get('isPrivate') === 'true';

    // Validate required fields
    if (!title || !description || !date || !type) {
      return new Response(JSON.stringify({ 
        error: 'Title, description, date, and type are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate type
    if (!['milestone', 'memory', 'achievement'].includes(type)) {
      return new Response(JSON.stringify({ 
        error: 'Type must be milestone, memory, or achievement' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate date
    const memoryDate = new Date(date);
    if (isNaN(memoryDate.getTime())) {
      return new Response(JSON.stringify({ error: 'Invalid date format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Handle optional fields
    const tags = formData.get('tags') as string;
    const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

    // Handle image upload
    let imageData: string | undefined;
    const image = formData.get('image') as File;
    if (image && image.size > 0) {
      // Validate file size (5MB limit)
      if (image.size > 5 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'Image must be less than 5MB' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Validate file type
      if (!image.type.startsWith('image/')) {
        return new Response(JSON.stringify({ error: 'File must be an image' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const imageBuffer = await image.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      imageData = `data:${image.type};base64,${imageBase64}`;
    }

    const memoryData = {
      title: title.trim(),
      description: description.trim(),
      date: date,
      type,
      image: imageData,
      tags: tagsArray,
      isPrivate
    };

    const memory = await createMemory(userId, memoryData);

    if (!memory) {
      return new Response(JSON.stringify({ error: 'Failed to create memory' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      message: 'Memory created successfully',
      memory
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Memory creation error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update memory
export const PUT: APIRoute = async ({ request, url }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const payload = verifySession(token);

    if (!payload || !isValidId(payload.id, 'user')) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = payload.id;
    const memoryId = url.searchParams.get('id');

    if (!memoryId || !isValidId(memoryId, 'mem')) {
      return new Response(JSON.stringify({ error: 'Invalid memory ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await request.formData();
    const updateData: any = {};

    // Extract fields to update
    const fields = ['title', 'description', 'date', 'type'];
    fields.forEach(field => {
      const value = formData.get(field);
      if (value && typeof value === 'string') {
        updateData[field] = value.trim();
      }
    });

    // Handle boolean fields
    const isPrivate = formData.get('isPrivate');
    if (isPrivate !== null) {
      updateData.isPrivate = isPrivate === 'true';
    }

    // Handle tags
    const tags = formData.get('tags') as string;
    if (tags !== null) {
      updateData.tags = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    }

    // Handle image update
    const image = formData.get('image') as File;
    if (image && image.size > 0) {
      // Validate file size and type (same as POST)
      if (image.size > 5 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: 'Image must be less than 5MB' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (!image.type.startsWith('image/')) {
        return new Response(JSON.stringify({ error: 'File must be an image' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const imageBuffer = await image.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      updateData.image = `data:${image.type};base64,${imageBase64}`;
    }

    const updatedMemory = await updateMemory(memoryId, userId, updateData);

    if (!updatedMemory) {
      return new Response(JSON.stringify({ error: 'Memory not found or update failed' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      message: 'Memory updated successfully',
      memory: updatedMemory
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Memory update error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Delete memory
export const DELETE: APIRoute = async ({ request, url }) => {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.substring(7);
    const payload = verifySession(token);

    if (!payload || !isValidId(payload.id, 'user')) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = payload.id;
    const memoryId = url.searchParams.get('id');

    if (!memoryId || !isValidId(memoryId, 'mem')) {
      return new Response(JSON.stringify({ error: 'Invalid memory ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const deleted = await deleteMemory(memoryId, userId);

    if (!deleted) {
      return new Response(JSON.stringify({ error: 'Memory not found or delete failed' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      message: 'Memory deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Memory delete error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};