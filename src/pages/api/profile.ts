import type { APIRoute } from 'astro';
import { getUserById, updateUserById, verifySession } from '../../lib/auth';
import { isValidId } from '../../lib/id-generator';

// GET - Fetch user profile
export const GET: APIRoute = async ({ request }) => {
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

        if (!payload) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const userId = payload.id;
        if (!isValidId(userId, 'user')) {
            return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const user = await getUserById(userId);

        if (!user) {
            return new Response(JSON.stringify({ error: 'User not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Remove sensitive data
        const { password, _id, ...safeUserData } = user;

        return new Response(JSON.stringify(safeUserData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Profile fetch error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

// PUT - Update user profile
export const PUT: APIRoute = async ({ request }) => {
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

        if (!payload) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const userId = payload.id;
        if (!isValidId(userId, 'user')) {
            return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const formData = await request.formData();

        // Extract text fields
        const updateData: any = {};

        const textFields = ['fullName', 'email', 'birthDate', 'location', 'bio', 'interests'];
        textFields.forEach(field => {
            const value = formData.get(field);
            if (value && typeof value === 'string') {
                updateData[field] = value.trim();
            }
        });

        // Validate email if provided
        if (updateData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(updateData.email)) {
                return new Response(JSON.stringify({ error: 'Invalid email format' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Validate birth date if provided
        if (updateData.birthDate) {
            const birthDate = new Date(updateData.birthDate);
            const today = new Date();
            if (birthDate > today) {
                return new Response(JSON.stringify({ error: 'Birth date cannot be in the future' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // Handle image uploads (in a real app, you'd upload to cloud storage)
        // For now, we'll store base64 encoded images in the database
        const bannerImage = formData.get('bannerImage') as File;
        const profileImage = formData.get('profileImage') as File;

        if (bannerImage && bannerImage.size > 0) {
            // Validate file size (5MB limit)
            if (bannerImage.size > 5 * 1024 * 1024) {
                return new Response(JSON.stringify({ error: 'Banner image must be less than 5MB' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Validate file type
            if (!bannerImage.type.startsWith('image/')) {
                return new Response(JSON.stringify({ error: 'Banner must be an image file' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const bannerBuffer = await bannerImage.arrayBuffer();
            const bannerBase64 = Buffer.from(bannerBuffer).toString('base64');
            updateData.bannerImage = `data:${bannerImage.type};base64,${bannerBase64}`;
        }

        if (profileImage && profileImage.size > 0) {
            // Validate file size (2MB limit)
            if (profileImage.size > 2 * 1024 * 1024) {
                return new Response(JSON.stringify({ error: 'Profile image must be less than 2MB' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Validate file type
            if (!profileImage.type.startsWith('image/')) {
                return new Response(JSON.stringify({ error: 'Profile picture must be an image file' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const profileBuffer = await profileImage.arrayBuffer();
            const profileBase64 = Buffer.from(profileBuffer).toString('base64');
            updateData.profileImage = `data:${profileImage.type};base64,${profileBase64}`;
        }

        const updatedUser = await updateUserById(userId, updateData);

        if (!updatedUser) {
            return new Response(JSON.stringify({ error: 'Failed to update profile' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Remove sensitive data
        const { password, _id, ...safeUserData } = updatedUser;

        return new Response(JSON.stringify({
            message: 'Profile updated successfully',
            user: safeUserData
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Profile update error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

// DELETE - Delete user profile
export const DELETE: APIRoute = async ({ request }) => {
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

        if (!payload) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const userId = payload.id;
        if (!isValidId(userId, 'user')) {
            return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // In a real app, you'd also delete related data (memories, etc.)
        const { deleteUser } = await import('../../lib/auth');
        const deleted = await deleteUser(userId);

        if (!deleted) {
            return new Response(JSON.stringify({ error: 'Failed to delete profile' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            message: 'Profile deleted successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Profile delete error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};