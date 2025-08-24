/**
 * Custom ID generator for creating clean, readable IDs
 * Format: prefix_randomString (e.g., user_k7x9m2p4, mem_a5b8c3d1)
 */

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Generate a random string of specified length
 */
function generateRandomString(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }
  return result;
}

/**
 * Generate a custom ID with prefix
 */
export function generateId(prefix: string, length: number = 8): string {
  const randomPart = generateRandomString(length);
  return `${prefix}_${randomPart}`;
}

/**
 * Generate user ID
 */
export function generateUserId(): string {
  return generateId('user', 8);
}

/**
 * Generate memory ID
 */
export function generateMemoryId(): string {
  return generateId('mem', 8);
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return generateId('sess', 12);
}

/**
 * Validate ID format
 */
export function isValidId(id: string, prefix?: string): boolean {
  if (!id || typeof id !== 'string') return false;
  
  const parts = id.split('_');
  if (parts.length !== 2) return false;
  
  const [idPrefix, randomPart] = parts;
  
  // Check prefix if specified
  if (prefix && idPrefix !== prefix) return false;
  
  // Check random part format (only lowercase letters and numbers)
  const validPattern = /^[a-z0-9]+$/;
  return validPattern.test(randomPart) && randomPart.length >= 6;
}

/**
 * Extract prefix from ID
 */
export function getIdPrefix(id: string): string | null {
  if (!isValidId(id)) return null;
  return id.split('_')[0];
}