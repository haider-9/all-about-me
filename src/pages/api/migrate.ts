import type { APIRoute } from 'astro';
import { runFullMigration } from '../../lib/migration';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Simple security check - you might want to add proper authentication
    const { secret } = await request.json();
    
    if (secret !== 'migrate-to-custom-ids-2024') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Starting migration process...');
    await runFullMigration();

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Migration completed successfully! Check server logs for details.'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Migration API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};