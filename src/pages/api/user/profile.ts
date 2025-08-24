import type { APIRoute } from 'astro';
import { getUserById, updateUserById, verifySession } from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    
    const session = verifySession(token);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await getUserById(session.id);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return user profile without sensitive data
    const profile = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      bio: user.bio,
      location: user.location,
      birthDate: user.birthDate,
      interests: user.interests,
      profileImage: user.profileImage,
      bannerImage: user.bannerImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return new Response(JSON.stringify({ success: true, profile }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = async ({ request }) => {
  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '') || '';
    
    const session = verifySession(token);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updates = await request.json();
    
    // Remove sensitive fields that shouldn't be updated via this endpoint
    const { password, _id, id, createdAt, updatedAt, ...safeUpdates } = updates;

    const updatedUser = await updateUserById(session.id, safeUpdates);
    if (!updatedUser) {
      return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return updated profile
    const profile = {
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      bio: updatedUser.bio,
      location: updatedUser.location,
      birthDate: updatedUser.birthDate,
      interests: updatedUser.interests,
      profileImage: updatedUser.profileImage,
      bannerImage: updatedUser.bannerImage,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    };

    return new Response(JSON.stringify({ 
      success: true, 
      profile,
      message: 'Profile updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating profile:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};