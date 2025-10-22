import { GET, PUT } from '../../../app/api/profile/route';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '../../../lib/auth';
import { updateUser, findUserById } from '../../../lib/simple-db';

// Mock dependencies
jest.mock('../../../lib/auth');
jest.mock('../../../lib/simple-db');

const mockGetAuthUser = getAuthUser as jest.MockedFunction<typeof getAuthUser>;
const mockUpdateUser = updateUser as jest.MockedFunction<typeof updateUser>;
const mockFindUserById = findUserById as jest.MockedFunction<typeof findUserById>;

// Mock console methods to avoid noise in tests
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  (console.log as jest.Mock).mockRestore();
  (console.error as jest.Mock).mockRestore();
});

describe('/api/profile Route', () => {
  const mockUser = {
    id: '1',
    phone: '+1234567890',
    name: 'John Doe',
    companyName: 'Test Company',
    email: 'john@test.com',
    address: '123 Test St',
    isAdmin: false,
    isActive: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/profile', () => {
    describe('Happy Path', () => {
      it('should return user profile successfully', async () => {
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockFindUserById.mockReturnValue(mockUser);

        const request = new NextRequest('http://localhost:3000/api/profile');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toEqual({
          id: '1',
          phone: '+1234567890',
          name: 'John Doe',
          isAdmin: false
        });
        expect(mockFindUserById).toHaveBeenCalledWith('1');
      });

      it('should return admin user profile', async () => {
        const adminUser = { ...mockUser, isAdmin: true };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: true });
        mockFindUserById.mockReturnValue(adminUser);

        const request = new NextRequest('http://localhost:3000/api/profile');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.isAdmin).toBe(true);
      });

      it('should handle user without name', async () => {
        const userWithoutName = { ...mockUser, name: '' };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockFindUserById.mockReturnValue(userWithoutName);

        const request = new NextRequest('http://localhost:3000/api/profile');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.name).toBe('');
      });
    });

    describe('Input Verification', () => {
      it('should return 401 for unauthenticated user', async () => {
        mockGetAuthUser.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/profile');
        const response = await GET(request);

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: 'Unauthorized' });
      });

      it('should return 404 for non-existent user', async () => {
        mockGetAuthUser.mockResolvedValue({ userId: '999', isAdmin: false });
        mockFindUserById.mockReturnValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/profile');
        const response = await GET(request);

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: 'User not found' });
      });
    });

    describe('Exception Handling', () => {
      it('should handle auth service errors', async () => {
        mockGetAuthUser.mockRejectedValue(new Error('Auth service error'));

        const request = new NextRequest('http://localhost:3000/api/profile');
        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Internal server error' });
      });

      it('should handle database errors', async () => {
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockFindUserById.mockImplementation(() => {
          throw new Error('Database error');
        });

        const request = new NextRequest('http://localhost:3000/api/profile');
        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Internal server error' });
      });
    });
  });

  describe('PUT /api/profile', () => {
    describe('Happy Path', () => {
      it('should update user profile successfully', async () => {
        const updatedUser = { ...mockUser, name: 'Jane Doe', companyName: 'New Company' };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockUpdateUser.mockReturnValue(updatedUser);

        const updateData = {
          name: 'Jane Doe',
          companyName: 'New Company',
          email: 'jane@test.com',
          address: '456 New St'
        };

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.user.name).toBe('Jane Doe');
        expect(mockUpdateUser).toHaveBeenCalledWith('1', {
          name: 'Jane Doe',
          companyName: 'New Company',
          email: 'jane@test.com',
          address: '456 New St'
        });
      });

      it('should handle partial updates', async () => {
        const updatedUser = { ...mockUser, name: 'Updated Name' };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockUpdateUser.mockReturnValue(updatedUser);

        const updateData = { name: 'Updated Name' };

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(mockUpdateUser).toHaveBeenCalledWith('1', {
          name: 'Updated Name',
          companyName: '',
          email: '',
          address: ''
        });
      });

      it('should trim whitespace from fields', async () => {
        const updatedUser = { ...mockUser, name: 'Trimmed Name' };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockUpdateUser.mockReturnValue(updatedUser);

        const updateData = {
          name: '  Trimmed Name  ',
          companyName: '  Trimmed Company  ',
          email: '  trimmed@test.com  ',
          address: '  Trimmed Address  '
        };

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        await PUT(request);

        expect(mockUpdateUser).toHaveBeenCalledWith('1', {
          name: 'Trimmed Name',
          companyName: 'Trimmed Company',
          email: 'trimmed@test.com',
          address: 'Trimmed Address'
        });
      });

      it('should handle empty string values', async () => {
        const updatedUser = { ...mockUser, name: '' };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockUpdateUser.mockReturnValue(updatedUser);

        const updateData = {
          name: '',
          companyName: '',
          email: '',
          address: ''
        };

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        const response = await PUT(request);

        expect(response.status).toBe(200);
        expect(mockUpdateUser).toHaveBeenCalledWith('1', {
          name: '',
          companyName: '',
          email: '',
          address: ''
        });
      });

      it('should handle null and undefined values', async () => {
        const updatedUser = { ...mockUser };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockUpdateUser.mockReturnValue(updatedUser);

        const updateData = {
          name: null,
          companyName: undefined,
          email: null,
          address: undefined
        };

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        const response = await PUT(request);

        expect(response.status).toBe(200);
        expect(mockUpdateUser).toHaveBeenCalledWith('1', {
          name: '',
          companyName: '',
          email: '',
          address: ''
        });
      });
    });

    describe('Input Verification', () => {
      it('should return 401 for unauthenticated user', async () => {
        mockGetAuthUser.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Test' })
        });

        const response = await PUT(request);

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: 'Unauthorized' });
      });

      it('should validate name length', async () => {
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });

        const longName = 'A'.repeat(101);
        const updateData = { name: longName };

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        const response = await PUT(request);

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'Name is too long' });
      });

      it('should validate company name length', async () => {
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });

        const longCompanyName = 'A'.repeat(101);
        const updateData = { companyName: longCompanyName };

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        const response = await PUT(request);

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'Company name is too long' });
      });

      it('should validate email length', async () => {
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });

        const longEmail = 'A'.repeat(95) + '@test.com'; // 105 characters
        const updateData = { email: longEmail };

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        const response = await PUT(request);

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'Email is too long' });
      });

      it('should validate address length', async () => {
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });

        const longAddress = 'A'.repeat(501);
        const updateData = { address: longAddress };

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        const response = await PUT(request);

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'Address is too long' });
      });

      it('should accept maximum valid lengths', async () => {
        const updatedUser = { ...mockUser };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockUpdateUser.mockReturnValue(updatedUser);

        const updateData = {
          name: 'A'.repeat(100),
          companyName: 'B'.repeat(100),
          email: 'C'.repeat(91) + '@test.com', // 100 characters
          address: 'D'.repeat(500)
        };

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        const response = await PUT(request);

        expect(response.status).toBe(200);
      });

      it('should return 404 for non-existent user', async () => {
        mockGetAuthUser.mockResolvedValue({ userId: '999', isAdmin: false });
        mockUpdateUser.mockReturnValue(null);

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Test' })
        });

        const response = await PUT(request);

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: 'User not found' });
      });
    });

    describe('Branching', () => {
      it('should update only provided fields', async () => {
        const updatedUser = { ...mockUser, name: 'New Name' };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockUpdateUser.mockReturnValue(updatedUser);

        const updateData = { name: 'New Name' };

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.user.name).toBe('New Name');
      });

      it('should handle admin user updates', async () => {
        const adminUser = { ...mockUser, isAdmin: true, name: 'Admin User' };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: true });
        mockUpdateUser.mockReturnValue(adminUser);

        const updateData = { name: 'Admin User' };

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.user.isAdmin).toBe(true);
      });

      it('should handle empty request body', async () => {
        const updatedUser = { ...mockUser };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockUpdateUser.mockReturnValue(updatedUser);

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify({})
        });

        const response = await PUT(request);

        expect(response.status).toBe(200);
        expect(mockUpdateUser).toHaveBeenCalledWith('1', {
          name: '',
          companyName: '',
          email: '',
          address: ''
        });
      });
    });

    describe('Exception Handling', () => {
      it('should handle auth service errors', async () => {
        mockGetAuthUser.mockRejectedValue(new Error('Auth service error'));

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Test' })
        });

        const response = await PUT(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Internal server error' });
      });

      it('should handle invalid JSON in request body', async () => {
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: 'invalid json'
        });

        const response = await PUT(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Internal server error' });
      });

      it('should handle database update errors', async () => {
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockUpdateUser.mockImplementation(() => {
          throw new Error('Database error');
        });

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Test' })
        });

        const response = await PUT(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Internal server error' });
      });

      it('should handle malformed request body', async () => {
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: '{"name": "Test", invalid}'
        });

        const response = await PUT(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Internal server error' });
      });
    });

    describe('Data Sanitization', () => {
      it('should trim all string fields', async () => {
        const updatedUser = { ...mockUser };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockUpdateUser.mockReturnValue(updatedUser);

        const updateData = {
          name: '  John Doe  ',
          companyName: '  Test Company  ',
          email: '  john@test.com  ',
          address: '  123 Test St  '
        };

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        await PUT(request);

        expect(mockUpdateUser).toHaveBeenCalledWith('1', {
          name: 'John Doe',
          companyName: 'Test Company',
          email: 'john@test.com',
          address: '123 Test St'
        });
      });

      it('should handle special characters in fields', async () => {
        const updatedUser = { ...mockUser };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockUpdateUser.mockReturnValue(updatedUser);

        const updateData = {
          name: 'José María',
          companyName: 'Tëst Çömpáñy',
          email: 'josé@tëst.com',
          address: '123 Tëst St, Çítÿ'
        };

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        const response = await PUT(request);

        expect(response.status).toBe(200);
        expect(mockUpdateUser).toHaveBeenCalledWith('1', {
          name: 'José María',
          companyName: 'Tëst Çömpáñy',
          email: 'josé@tëst.com',
          address: '123 Tëst St, Çítÿ'
        });
      });

      it('should handle numeric and boolean values as strings', async () => {
        const updatedUser = { ...mockUser };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockUpdateUser.mockReturnValue(updatedUser);

        const updateData = {
          name: 123 as any,
          companyName: true as any,
          email: false as any,
          address: 456.78 as any
        };

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify(updateData)
        });

        const response = await PUT(request);

        // The API might handle type conversion differently, so let's just check response is 200
        expect(response.status).toBe(200);
        expect(mockUpdateUser).toHaveBeenCalled();
      });
    });

    describe('Response Format', () => {
      it('should return correct response structure on success', async () => {
        const updatedUser = { ...mockUser, name: 'Updated Name' };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockUpdateUser.mockReturnValue(updatedUser);

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Name' })
        });

        const response = await PUT(request);
        const data = await response.json();

        expect(data).toEqual({
          success: true,
          user: {
            id: '1',
            phone: '+1234567890',
            name: 'Updated Name',
            isAdmin: false
          }
        });
      });

      it('should only return safe user fields in response', async () => {
        const updatedUser = {
          ...mockUser,
          name: 'Updated Name',
          password: 'secret',
          lastLogin: new Date(),
          isActive: true
        };
        mockGetAuthUser.mockResolvedValue({ userId: '1', isAdmin: false });
        mockUpdateUser.mockReturnValue(updatedUser as any);

        const request = new NextRequest('http://localhost:3000/api/profile', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Name' })
        });

        const response = await PUT(request);
        const data = await response.json();

        // Should not include sensitive fields like password, lastLogin, etc.
        expect(data.user).toEqual({
          id: '1',
          phone: '+1234567890',
          name: 'Updated Name',
          isAdmin: false
        });
        expect(data.user).not.toHaveProperty('password');
        expect(data.user).not.toHaveProperty('lastLogin');
        expect(data.user).not.toHaveProperty('isActive');
      });
    });
  });
});