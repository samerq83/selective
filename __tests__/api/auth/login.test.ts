import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/login/route';
import { generateToken, verifyToken } from '@/lib/auth';
import { findUserByPhone, createUser, updateUser } from '@/lib/simple-db';
import { formatPhone } from '@/lib/utils';

// Mock dependencies
jest.mock('@/lib/auth');
jest.mock('@/lib/simple-db');
jest.mock('@/lib/utils');

const mockGenerateToken = generateToken as jest.MockedFunction<typeof generateToken>;
const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;
const mockFindUserByPhone = findUserByPhone as jest.MockedFunction<typeof findUserByPhone>;
const mockCreateUser = createUser as jest.MockedFunction<typeof createUser>;
const mockUpdateUser = updateUser as jest.MockedFunction<typeof updateUser>;
const mockFormatPhone = formatPhone as jest.MockedFunction<typeof formatPhone>;

describe('/api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatPhone.mockImplementation((phone) => phone.replace(/\D/g, ''));
  });

  const mockUser = {
    id: 'user-id-123',
    phone: '1234567890',
    name: 'Test User',
    companyName: 'Test Company',
    email: 'test@example.com',
    address: 'Test Address',
    isAdmin: false,
    isActive: true,
    lastLogin: new Date(),
  };

  const mockAdminUser = {
    id: 'admin-id-123',
    phone: '0987654321',
    name: 'Admin User',
    companyName: 'Admin Company',
    email: 'admin@example.com',
    address: 'Admin Address',
    isAdmin: true,
    isActive: true,
    lastLogin: new Date(),
  };

  describe('POST /api/auth/login', () => {
    it('should login existing user successfully', async () => {
      const requestBody = { phone: '1234567890' };
      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      mockFindUserByPhone.mockReturnValue(mockUser);
      mockGenerateToken.mockReturnValue('mock-jwt-token');

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.user).toEqual({
        id: mockUser.id,
        phone: mockUser.phone,
        name: mockUser.name,
        isAdmin: mockUser.isAdmin,
      });

      // Verify function calls
      expect(mockFormatPhone).toHaveBeenCalledWith('1234567890');
      expect(mockFindUserByPhone).toHaveBeenCalledWith('1234567890');
      expect(mockUpdateUser).toHaveBeenCalledWith(mockUser.id, { lastLogin: expect.any(Date) });
      expect(mockGenerateToken).toHaveBeenCalledWith({
        userId: mockUser.id,
        phone: mockUser.phone,
        isAdmin: mockUser.isAdmin,
      });
    });

    it('should create new user if not found', async () => {
      const requestBody = { phone: '+1 (234) 567-8900' };
      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      const newUser = { ...mockUser, id: 'new-user-id' };

      mockFindUserByPhone.mockReturnValue(null);
      mockCreateUser.mockReturnValue(newUser);
      mockGenerateToken.mockReturnValue('mock-jwt-token');

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.user.id).toBe(newUser.id);

      // Verify user creation
      expect(mockCreateUser).toHaveBeenCalledWith({
        phone: '12345678900',
        name: 'User',
        companyName: '',
        email: '',
        address: '',
        isAdmin: false,
        isActive: true,
      });
    });

    it('should handle admin user login', async () => {
      const requestBody = { phone: '0987654321' };
      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      mockFindUserByPhone.mockReturnValue(mockAdminUser);
      mockGenerateToken.mockReturnValue('admin-jwt-token');

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.user.isAdmin).toBe(true);

      expect(mockGenerateToken).toHaveBeenCalledWith({
        userId: mockAdminUser.id,
        phone: mockAdminUser.phone,
        isAdmin: true,
      });
    });

    it('should return 400 for missing phone number', async () => {
      const requestBody = {};
      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Phone number is required');
    });

    it('should return 400 for empty phone number', async () => {
      const requestBody = { phone: '' };
      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Phone number is required');
    });

    it('should handle malformed request body', async () => {
      const mockRequest = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON')),
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle database errors', async () => {
      const requestBody = { phone: '1234567890' };
      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      mockFindUserByPhone.mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle token generation errors', async () => {
      const requestBody = { phone: '1234567890' };
      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      mockFindUserByPhone.mockReturnValue(mockUser);
      mockGenerateToken.mockImplementation(() => {
        throw new Error('Token generation failed');
      });

      const response = await POST(mockRequest);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should format phone number correctly', async () => {
      const requestBody = { phone: '+1 (234) 567-8900' };
      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      mockFormatPhone.mockReturnValue('12345678900');
      mockFindUserByPhone.mockReturnValue(null);
      mockCreateUser.mockReturnValue({ ...mockUser, phone: '12345678900' });
      mockGenerateToken.mockReturnValue('mock-token');

      await POST(mockRequest);

      expect(mockFormatPhone).toHaveBeenCalledWith('+1 (234) 567-8900');
      expect(mockFindUserByPhone).toHaveBeenCalledWith('12345678900');
    });

    it('should set correct cookie properties', async () => {
      const requestBody = { phone: '1234567890' };
      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      mockFindUserByPhone.mockReturnValue(mockUser);
      mockGenerateToken.mockReturnValue('mock-jwt-token');

      const response = await POST(mockRequest);

      // Check if cookie is set in response headers
      const setCookieHeader = response.headers.get('set-cookie');
      expect(setCookieHeader).toContain('auth-token=mock-jwt-token');
      expect(setCookieHeader).toContain('HttpOnly');
      expect(setCookieHeader).toContain('Path=/');
      expect(setCookieHeader).toContain('SameSite=Lax');
    });

    it('should update lastLogin timestamp', async () => {
      const requestBody = { phone: '1234567890' };
      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      const beforeLogin = new Date();
      mockFindUserByPhone.mockReturnValue(mockUser);
      mockGenerateToken.mockReturnValue('mock-jwt-token');

      await POST(mockRequest);

      expect(mockUpdateUser).toHaveBeenCalledWith(
        mockUser.id,
        { lastLogin: expect.any(Date) }
      );

      // Check that lastLogin was called with a recent timestamp
      const updateCall = mockUpdateUser.mock.calls[0];
      const lastLoginDate = updateCall[1].lastLogin as Date;
      expect(lastLoginDate.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });
  });

  describe('Request Validation', () => {
    it('should handle various phone formats', async () => {
      const phoneFormats = [
        '123-456-7890',
        '(123) 456-7890',
        '+1 123 456 7890',
        '123.456.7890',
        '1234567890',
      ];

      for (const phone of phoneFormats) {
        const mockRequest = {
          json: jest.fn().mockResolvedValue({ phone }),
        } as unknown as NextRequest;

        mockFindUserByPhone.mockReturnValue(mockUser);
        mockGenerateToken.mockReturnValue('mock-token');

        const response = await POST(mockRequest);
        expect(response.status).toBe(200);
      }
    });

    it('should handle international phone numbers', async () => {
      const internationalPhones = [
        '+44 20 7946 0958',
        '+33 1 42 86 83 26',
        '+81 3 1234 5678',
      ];

      for (const phone of internationalPhones) {
        const mockRequest = {
          json: jest.fn().mockResolvedValue({ phone }),
        } as unknown as NextRequest;

        mockFindUserByPhone.mockReturnValue(null);
        mockCreateUser.mockReturnValue({ ...mockUser, phone });
        mockGenerateToken.mockReturnValue('mock-token');

        const response = await POST(mockRequest);
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Security Considerations', () => {
    it('should not expose sensitive user data', async () => {
      const requestBody = { phone: '1234567890' };
      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      const sensitiveUser = {
        ...mockUser,
        password: 'secret-password',
        internalId: 'internal-123',
        secretKey: 'secret-key',
      };

      mockFindUserByPhone.mockReturnValue(sensitiveUser as any);
      mockGenerateToken.mockReturnValue('mock-jwt-token');

      const response = await POST(mockRequest);
      const responseData = await response.json();

      // Should only include safe fields
      expect(responseData.user).toEqual({
        id: sensitiveUser.id,
        phone: sensitiveUser.phone,
        name: sensitiveUser.name,
        isAdmin: sensitiveUser.isAdmin,
      });

      // Should not include sensitive fields
      expect(responseData.user.password).toBeUndefined();
      expect(responseData.user.internalId).toBeUndefined();
      expect(responseData.user.secretKey).toBeUndefined();
    });

    it('should handle production environment cookies', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const requestBody = { phone: '1234567890' };
      const mockRequest = {
        json: jest.fn().mockResolvedValue(requestBody),
      } as unknown as NextRequest;

      mockFindUserByPhone.mockReturnValue(mockUser);
      mockGenerateToken.mockReturnValue('mock-jwt-token');

      const response = await POST(mockRequest);
      const setCookieHeader = response.headers.get('set-cookie');

      expect(setCookieHeader).toContain('Secure');

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });
});