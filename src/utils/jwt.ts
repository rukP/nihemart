/**
 * Utility functions for JWT token handling
 */

interface JWTPayload {
  sub?: string;
  email?: string;
  roles?: string[];
  exp?: number;
  iat?: number;
  [key: string]: any;
}

/**
 * Decode a JWT token without verification (client-side only)
 * Returns null if token is invalid or cannot be decoded
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch (error) {
    console.error('Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if a JWT token is expired or will expire soon
 * @param token - JWT token string
 * @param bufferSeconds - Number of seconds before expiration to consider token as "expiring soon" (default: 3600 = 1 hour)
 * @returns true if token is expired or expiring soon, false otherwise
 */
export function isTokenExpiringSoon(token: string | null, bufferSeconds: number = 3600): boolean {
  if (!token) return true;

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;

  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const bufferTime = bufferSeconds * 1000;

  // Token is expired or will expire within the buffer time
  return expirationTime <= currentTime + bufferTime;
}

/**
 * Get the expiration time of a JWT token in milliseconds
 * @param token - JWT token string
 * @returns expiration time in milliseconds, or null if token is invalid
 */
export function getTokenExpiration(token: string | null): number | null {
  if (!token) return null;

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return null;

  return decoded.exp * 1000; // Convert to milliseconds
}

/**
 * Get the time until token expiration in milliseconds
 * @param token - JWT token string
 * @returns milliseconds until expiration, or null if token is invalid or expired
 */
export function getTimeUntilExpiration(token: string | null): number | null {
  if (!token) return null;

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return null;

  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();
  const timeUntilExpiration = expirationTime - currentTime;

  return timeUntilExpiration > 0 ? timeUntilExpiration : null;
}

