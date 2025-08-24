import type { APIRoute } from 'astro';
import { createUser, createSession } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { name, email, password } = await request.json();
    
    // Validate required fields
    if (!name || !email || !password) {
      return new Response(JSON.stringify({ error: 'Name, email, and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate name length
    if (name.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'Name must be at least 2 characters long' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Please enter a valid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate password strength
    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'Password must be at least 6 characters long' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const user = await createUser(email, password, name);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'An account with this email already exists' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const token = createSession(user);
    
    return new Response(JSON.stringify({ 
      success: true, 
      token,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.fullName 
      },
      message: 'Account created successfully!'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Signup error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};