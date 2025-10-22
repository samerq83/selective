import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/notifications/route';

// Mock modules
jest.mock('@/lib/mongodb', () => jest.fn());
jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
  requireAdmin: jest.fn(),
}));
jest.mock('@/models/Notification', () => ({
  find: jest.fn(),
  create: jest.fn(),
}));

// Mock imports
const mockRequireAuth = jest.mocked(require('@/lib/auth').requireAuth);
const mockRequireAdmin = jest.mocked(require('@/lib/auth').requireAdmin);
const mockNotification = jest.mocked(require('@/models/Notification'));

// Mock data
const mockUserAuth = {
  userId: 'user1',
  isAdmin: false,
};

const mockAdminAuth = {
  userId: 'admin1',
  isAdmin: true,
};

const mockNotifications = [
  {
    _id: 'notification1',
    user: 'user1',
    title: { en: 'Order Updated', ar: 'تم تحديث الطلب' },
    message: { en: 'Your order status has been updated', ar: 'تم تحديث حالة طلبك' },
    type: 'order',
    relatedOrder: 'order1',
    isRead: false,
    createdAt: new Date('2024-01-02').toISOString(),
  },
  {
    _id: 'notification2',
    user: 'user1',
    title: { en: 'Welcome', ar: 'مرحباً' },
    message: { en: 'Welcome to our platform', ar: 'مرحباً بك في منصتنا' },
    type: 'info',
    isRead: false,
    createdAt: new Date('2024-01-01').toISOString(),
  },
];

const mockNotificationQuery = {
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(mockNotifications),
};

describe('/api/notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  describe('GET /api/notifications', () => {
    describe('Happy Path', () => {
      it('should return user notifications successfully', async () => {
        mockRequireAuth.mockResolvedValue(mockUserAuth);
        mockNotification.find.mockReturnValue(mockNotificationQuery);

        const request = new NextRequest('http://localhost:3000/api/notifications');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({ notifications: mockNotifications });
        expect(mockNotification.find).toHaveBeenCalledWith({ user: 'user1' });
        expect(mockNotificationQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(mockNotificationQuery.limit).toHaveBeenCalledWith(50);
        expect(mockNotificationQuery.lean).toHaveBeenCalled();
      });

      it('should return empty array for user with no notifications', async () => {
        mockRequireAuth.mockResolvedValue(mockUserAuth);
        const emptyNotificationQuery = {
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          lean: jest.fn().mockResolvedValue([]),
        };
        mockNotification.find.mockReturnValue(emptyNotificationQuery);

        const request = new NextRequest('http://localhost:3000/api/notifications');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({ notifications: [] });
      });

      it('should work for admin users viewing their own notifications', async () => {
        mockRequireAuth.mockResolvedValue(mockAdminAuth);
        mockNotification.find.mockReturnValue(mockNotificationQuery);

        const request = new NextRequest('http://localhost:3000/api/notifications');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({ notifications: mockNotifications });
        expect(mockNotification.find).toHaveBeenCalledWith({ user: 'admin1' });
      });
    });

    describe('Input Verification', () => {
      it('should limit results to 50 notifications', async () => {
        mockRequireAuth.mockResolvedValue(mockUserAuth);
        mockNotification.find.mockReturnValue(mockNotificationQuery);

        const request = new NextRequest('http://localhost:3000/api/notifications');
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(mockNotificationQuery.limit).toHaveBeenCalledWith(50);
      });

      it('should sort notifications by creation date descending', async () => {
        mockRequireAuth.mockResolvedValue(mockUserAuth);
        mockNotification.find.mockReturnValue(mockNotificationQuery);

        const request = new NextRequest('http://localhost:3000/api/notifications');
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(mockNotificationQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      });
    });

    describe('Exception Handling', () => {
      it('should handle unauthorized access', async () => {
        mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));

        const request = new NextRequest('http://localhost:3000/api/notifications');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result).toEqual({ error: 'Unauthorized' });
        expect(console.error).toHaveBeenCalledWith('Notifications fetch error:', expect.any(Error));
      });

      it('should handle database errors', async () => {
        mockRequireAuth.mockResolvedValue(mockUserAuth);
        mockNotification.find.mockImplementation(() => {
          throw new Error('Database error');
        });

        const request = new NextRequest('http://localhost:3000/api/notifications');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Internal server error' });
        expect(console.error).toHaveBeenCalledWith('Notifications fetch error:', expect.any(Error));
      });

      it('should handle query chain errors', async () => {
        mockRequireAuth.mockResolvedValue(mockUserAuth);
        const failingQuery = {
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          lean: jest.fn().mockRejectedValue(new Error('Query error')),
        };
        mockNotification.find.mockReturnValue(failingQuery);

        const request = new NextRequest('http://localhost:3000/api/notifications');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Internal server error' });
      });
    });
  });

  describe('POST /api/notifications', () => {
    const validRequestBody = {
      userId: 'user1',
      title: { en: 'New Order', ar: 'طلب جديد' },
      message: { en: 'A new order has been placed', ar: 'تم إنشاء طلب جديد' },
      type: 'order',
      relatedOrder: 'order1',
    };

    const mockCreatedNotification = {
      _id: 'notification3',
      user: 'user1',
      ...validRequestBody,
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    describe('Happy Path', () => {
      it('should create notification successfully with all fields', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminAuth);
        mockNotification.create.mockResolvedValue(mockCreatedNotification);

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({
          success: true,
          notification: mockCreatedNotification,
        });
        expect(mockNotification.create).toHaveBeenCalledWith({
          user: 'user1',
          title: validRequestBody.title,
          message: validRequestBody.message,
          type: 'order',
          relatedOrder: 'order1',
        });
      });

      it('should create notification with default type when not specified', async () => {
        const bodyWithoutType = { ...validRequestBody };
        delete bodyWithoutType.type;

        mockRequireAdmin.mockResolvedValue(mockAdminAuth);
        mockNotification.create.mockResolvedValue(mockCreatedNotification);

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify(bodyWithoutType),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(mockNotification.create).toHaveBeenCalledWith({
          user: 'user1',
          title: validRequestBody.title,
          message: validRequestBody.message,
          type: 'info',
          relatedOrder: 'order1',
        });
      });

      it('should create notification without relatedOrder', async () => {
        const bodyWithoutRelatedOrder = { ...validRequestBody };
        delete bodyWithoutRelatedOrder.relatedOrder;

        mockRequireAdmin.mockResolvedValue(mockAdminAuth);
        mockNotification.create.mockResolvedValue(mockCreatedNotification);

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify(bodyWithoutRelatedOrder),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(mockNotification.create).toHaveBeenCalledWith({
          user: 'user1',
          title: validRequestBody.title,
          message: validRequestBody.message,
          type: 'order',
          relatedOrder: undefined,
        });
      });

      it('should create notification with simple string title and message', async () => {
        const simpleBody = {
          userId: 'user1',
          title: 'Simple Title',
          message: 'Simple Message',
          type: 'info',
        };

        mockRequireAdmin.mockResolvedValue(mockAdminAuth);
        mockNotification.create.mockResolvedValue({
          ...mockCreatedNotification,
          title: 'Simple Title',
          message: 'Simple Message',
        });

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify(simpleBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(mockNotification.create).toHaveBeenCalledWith({
          user: 'user1',
          title: 'Simple Title',
          message: 'Simple Message',
          type: 'info',
          relatedOrder: undefined,
        });
      });
    });

    describe('Input Verification', () => {
      it('should reject request without userId', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminAuth);

        const bodyWithoutUserId = { ...validRequestBody };
        delete bodyWithoutUserId.userId;

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify(bodyWithoutUserId),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result).toEqual({ error: 'Missing required fields' });
        expect(mockNotification.create).not.toHaveBeenCalled();
      });

      it('should reject request without title', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminAuth);

        const bodyWithoutTitle = { ...validRequestBody };
        delete bodyWithoutTitle.title;

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify(bodyWithoutTitle),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result).toEqual({ error: 'Missing required fields' });
        expect(mockNotification.create).not.toHaveBeenCalled();
      });

      it('should reject request without message', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminAuth);

        const bodyWithoutMessage = { ...validRequestBody };
        delete bodyWithoutMessage.message;

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify(bodyWithoutMessage),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result).toEqual({ error: 'Missing required fields' });
        expect(mockNotification.create).not.toHaveBeenCalled();
      });

      it('should reject request with empty userId', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminAuth);

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify({ ...validRequestBody, userId: '' }),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result).toEqual({ error: 'Missing required fields' });
      });

      it('should reject request with empty title', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminAuth);

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify({ ...validRequestBody, title: '' }),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result).toEqual({ error: 'Missing required fields' });
      });

      it('should reject request with empty message', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminAuth);

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify({ ...validRequestBody, message: '' }),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result).toEqual({ error: 'Missing required fields' });
      });
    });

    describe('Branching', () => {
      it('should handle different notification types', async () => {
        const types = ['info', 'warning', 'error', 'order', 'system'];

        for (const type of types) {
          mockRequireAdmin.mockResolvedValue(mockAdminAuth);
          mockNotification.create.mockResolvedValue({
            ...mockCreatedNotification,
            type,
          });

          const request = new NextRequest('http://localhost:3000/api/notifications', {
            method: 'POST',
            body: JSON.stringify({ ...validRequestBody, type }),
          });

          const response = await POST(request);
          expect(response.status).toBe(200);
          expect(mockNotification.create).toHaveBeenCalledWith(
            expect.objectContaining({ type })
          );
        }
      });

      it('should handle null values for optional fields', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminAuth);
        mockNotification.create.mockResolvedValue(mockCreatedNotification);

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify({
            ...validRequestBody,
            type: null,
            relatedOrder: null,
          }),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(mockNotification.create).toHaveBeenCalledWith({
          user: 'user1',
          title: validRequestBody.title,
          message: validRequestBody.message,
          type: 'info',
          relatedOrder: null,
        });
      });
    });

    describe('Exception Handling', () => {
      it('should handle unauthorized access (not admin)', async () => {
        mockRequireAdmin.mockRejectedValue(new Error('Admin access required'));

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result).toEqual({ error: 'Unauthorized' });
        expect(mockNotification.create).not.toHaveBeenCalled();
      });

      it('should handle unauthorized access (no auth)', async () => {
        mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'));

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result).toEqual({ error: 'Unauthorized' });
      });

      it('should handle database creation errors', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminAuth);
        mockNotification.create.mockRejectedValue(new Error('Database error'));

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Internal server error' });
        expect(console.error).toHaveBeenCalledWith('Notification creation error:', expect.any(Error));
      });

      it('should handle invalid JSON in request body', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminAuth);

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: 'invalid json',
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Internal server error' });
      });

      it('should handle validation errors during creation', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminAuth);
        const validationError = new Error('Validation failed');
        validationError.name = 'ValidationError';
        mockNotification.create.mockRejectedValue(validationError);

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Internal server error' });
        expect(console.error).toHaveBeenCalledWith('Notification creation error:', validationError);
      });
    });

    describe('Response Format', () => {
      it('should return success flag and created notification', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminAuth);
        mockNotification.create.mockResolvedValue(mockCreatedNotification);

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('notification');
        expect(result.notification).toEqual(mockCreatedNotification);
      });
    });

    describe('Bilingual Support', () => {
      it('should handle Arabic title and message', async () => {
        const arabicBody = {
          userId: 'user1',
          title: { en: 'Order Status', ar: 'حالة الطلب' },
          message: { en: 'Your order has been processed', ar: 'تم معالجة طلبك' },
          type: 'order',
        };

        mockRequireAdmin.mockResolvedValue(mockAdminAuth);
        mockNotification.create.mockResolvedValue({
          ...mockCreatedNotification,
          title: arabicBody.title,
          message: arabicBody.message,
        });

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify(arabicBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(mockNotification.create).toHaveBeenCalledWith({
          user: 'user1',
          title: arabicBody.title,
          message: arabicBody.message,
          type: 'order',
          relatedOrder: undefined,
        });
      });

      it('should handle mixed language scenarios', async () => {
        const mixedBody = {
          userId: 'user1',
          title: 'English Title',
          message: { en: 'English message', ar: 'رسالة عربية' },
          type: 'info',
        };

        mockRequireAdmin.mockResolvedValue(mockAdminAuth);
        mockNotification.create.mockResolvedValue({
          ...mockCreatedNotification,
          title: mixedBody.title,
          message: mixedBody.message,
        });

        const request = new NextRequest('http://localhost:3000/api/notifications', {
          method: 'POST',
          body: JSON.stringify(mixedBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(mockNotification.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'English Title',
            message: mixedBody.message,
          })
        );
      });
    });
  });
});