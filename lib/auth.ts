import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface TokenPayload {
  userId: string;
  phone: string;
  isAdmin: boolean;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '90d' }); // 3 months
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function getAuthUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    console.log('[Auth] Checking auth token:', token ? 'Token exists' : 'No token found');
    
    if (!token) {
      return null;
    }
    
    const verified = verifyToken(token);
    console.log('[Auth] Token verification result:', verified ? 'Valid' : 'Invalid');
    
    return verified;
  } catch (error) {
    console.error('[Auth] Error in getAuthUser:', error);
    return null;
  }
}

export async function requireAuth(): Promise<TokenPayload> {
  const user = await getAuthUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}

export async function requireAdmin(): Promise<TokenPayload> {
  const user = await requireAuth();
  
  if (!user.isAdmin) {
    throw new Error('Admin access required');
  }
  
  return user;
}