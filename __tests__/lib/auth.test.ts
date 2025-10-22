import jwt from 'jsonwebtoken';
import { generateToken, verifyToken, getAuthUser, requireAuth, requireAdmin, TokenPayload } from '@/lib/auth';
import { cookies } from 'next/headers';

// Mock next/headers
jest.mock('next/headers');

const mockCookies = cookies as jest.MockedFunction<typeof cookies>;

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

describe('Auth Library', () => {
  const mockUser: TokenPayload = {
    userId: 'test-user-id',
    phone: '1234567890',
    isAdmin: false,
  };

  const mockAdminUser: TokenPayload = {
    userId: 'admin-user-id',
    phone: '0987654321',
    isAdmin: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockUser);
      
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      
      // Verify token can be decoded
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
      expect(decoded.userId).toBe(mockUser.userId);
      expect(decoded.phone).toBe(mockUser.phone);
      expect(decoded.isAdmin).toBe(mockUser.isAdmin);
    });

    it('should generate tokens with 90-day expiration', () => {
      const token = generateToken(mockUser);
      const decoded = jwt.decode(token) as any;
      
      expect(decoded.exp).toBeDefined();
      
      // Check if expiration is approximately 90 days from now
      const now = Math.floor(Date.now() / 1000);
      const expectedExpiration = now + (90 * 24 * 60 * 60); // 90 days in seconds
      const tolerance = 60; // 1 minute tolerance
      
      expect(decoded.exp).toBeGreaterThan(expectedExpiration - tolerance);
      expect(decoded.exp).toBeLessThan(expectedExpiration + tolerance);
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateToken(mockUser);
      const token2 = generateToken(mockAdminUser);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify valid tokens', () => {
      const token = generateToken(mockUser);
      const result = verifyToken(token);
      
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(mockUser.userId);
      expect(result?.phone).toBe(mockUser.phone);
      expect(result?.isAdmin).toBe(mockUser.isAdmin);
    });

    it('should return null for invalid tokens', () => {
      const invalidToken = 'invalid-token';
      const result = verifyToken(invalidToken);
      
      expect(result).toBeNull();
    });

    it('should return null for expired tokens', () => {
      // Create a token with immediate expiration
      const expiredToken = jwt.sign(mockUser, JWT_SECRET, { expiresIn: '-1s' });
      const result = verifyToken(expiredToken);
      
      expect(result).toBeNull();
    });

    it('should return null for tokens with wrong secret', () => {
      const tokenWithWrongSecret = jwt.sign(mockUser, 'wrong-secret');
      const result = verifyToken(tokenWithWrongSecret);
      
      expect(result).toBeNull();
    });
  });

  describe('getAuthUser', () => {
    const mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    beforeEach(() => {
      mockCookies.mockResolvedValue(mockCookieStore as any);
    });

    it('should return user data for valid token', async () => {
      const token = generateToken(mockUser);
      mockCookieStore.get.mockReturnValue({ value: token });
      
      const result = await getAuthUser();
      
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(mockUser.userId);
      expect(result?.phone).toBe(mockUser.phone);
      expect(result?.isAdmin).toBe(mockUser.isAdmin);
    });

    it('should return null when no token exists', async () => {
      mockCookieStore.get.mockReturnValue(undefined);
      
      const result = await getAuthUser();
      
      expect(result).toBeNull();
    });

    it('should return null for invalid token', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'invalid-token' });
      
      const result = await getAuthUser();
      
      expect(result).toBeNull();
    });

    it('should handle cookie store errors', async () => {
      mockCookies.mockRejectedValue(new Error('Cookie error'));
      
      const result = await getAuthUser();
      
      expect(result).toBeNull();
    });

    it('should check for auth-token cookie', async () => {
      const token = generateToken(mockUser);
      mockCookieStore.get.mockReturnValue({ value: token });
      
      await getAuthUser();
      
      expect(mockCookieStore.get).toHaveBeenCalledWith('auth-token');
    });
  });

  describe('requireAuth', () => {
    const mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    beforeEach(() => {
      mockCookies.mockResolvedValue(mockCookieStore as any);
    });

    it('should return user data for authenticated user', async () => {
      const token = generateToken(mockUser);
      mockCookieStore.get.mockReturnValue({ value: token });
      
      const result = await requireAuth();
      
      expect(result).toEqual(expect.objectContaining({
        userId: mockUser.userId,
        phone: mockUser.phone,
        isAdmin: mockUser.isAdmin,
      }));
    });

    it('should throw error for unauthenticated user', async () => {
      mockCookieStore.get.mockReturnValue(undefined);
      
      await expect(requireAuth()).rejects.toThrow('Unauthorized');
    });

    it('should throw error for invalid token', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'invalid-token' });
      
      await expect(requireAuth()).rejects.toThrow('Unauthorized');
    });
  });

  describe('requireAdmin', () => {
    const mockCookieStore = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
    };

    beforeEach(() => {
      mockCookies.mockResolvedValue(mockCookieStore as any);
    });

    it('should return admin user data for admin user', async () => {
      const token = generateToken(mockAdminUser);
      mockCookieStore.get.mockReturnValue({ value: token });
      
      const result = await requireAdmin();
      
      expect(result).toEqual(expect.objectContaining({
        userId: mockAdminUser.userId,
        phone: mockAdminUser.phone,
        isAdmin: true,
      }));
    });

    it('should throw error for non-admin user', async () => {
      const token = generateToken(mockUser);
      mockCookieStore.get.mockReturnValue({ value: token });
      
      await expect(requireAdmin()).rejects.toThrow('Admin access required');
    });

    it('should throw error for unauthenticated user', async () => {
      mockCookieStore.get.mockReturnValue(undefined);
      
      await expect(requireAdmin()).rejects.toThrow('Unauthorized');
    });

    it('should throw error for invalid token', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'invalid-token' });
      
      await expect(requireAdmin()).rejects.toThrow('Unauthorized');
    });
  });

  describe('Token Integration', () => {
    it('should handle complete auth flow', async () => {
      const mockCookieStore = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      };
      mockCookies.mockResolvedValue(mockCookieStore as any);

      // Generate token
      const token = generateToken(mockUser);
      expect(token).toBeDefined();

      // Verify token
      const verified = verifyToken(token);
      expect(verified).toEqual(expect.objectContaining(mockUser));

      // Mock cookie with token
      mockCookieStore.get.mockReturnValue({ value: token });

      // Get auth user
      const authUser = await getAuthUser();
      expect(authUser).toEqual(expect.objectContaining(mockUser));

      // Require auth
      const requiredAuth = await requireAuth();
      expect(requiredAuth).toEqual(expect.objectContaining(mockUser));
    });

    it('should handle admin auth flow', async () => {
      const mockCookieStore = {
        get: jest.fn(),
        set: jest.fn(),
        delete: jest.fn(),
      };
      mockCookies.mockResolvedValue(mockCookieStore as any);

      // Generate admin token
      const token = generateToken(mockAdminUser);
      mockCookieStore.get.mockReturnValue({ value: token });

      // Require admin
      const adminUser = await requireAdmin();
      expect(adminUser).toEqual(expect.objectContaining(mockAdminUser));
      expect(adminUser.isAdmin).toBe(true);
    });
  });
});