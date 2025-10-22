import { GET, POST } from '../../../app/api/orders/route';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/auth';
import { getEditDeadline } from '../../../lib/utils';
import connectDB from '../../../lib/mongodb';
import User from '../../../models/User';
import Order from '../../../models/Order';
import Product from '../../../models/Product';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

// Mock the auth library
jest.mock('../../../lib/auth');
const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;

// Mock the utils library
jest.mock('../../../lib/utils');
const mockGetEditDeadline = getEditDeadline as jest.MockedFunction<typeof getEditDeadline>;

// Mock MongoDB connection
jest.mock('../../../lib/mongodb');
const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;

describe('/api/orders Route', () => {
  let mongoServer: MongoMemoryServer;
  let testUser: any;
  let testAdmin: any;
  let testProduct1: any;
  let testProduct2: any;
  let testOrder: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    mockConnectDB.mockResolvedValue(mongoose);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
    
    // Create test user
    testUser = await User.create({
      phone: '+1234567890',
      name: 'Test User',
      companyName: 'Test Company',
      email: 'test@example.com',
      address: 'Test Address',
      isActive: true,
      isAdmin: false
    });

    // Create test admin
    testAdmin = await User.create({
      phone: '+0987654321',
      name: 'Test Admin',
      companyName: 'Admin Company',
      email: 'admin@example.com',
      address: 'Admin Address',
      isActive: true,
      isAdmin: true
    });

    // Create test products
    testProduct1 = await Product.create({
      name: { en: 'Test Product 1', ar: 'منتج تجريبي 1' },
      slug: 'test-product-1',
      image: '/images/test1.jpg',
      isAvailable: true,
      order: 1
    });

    testProduct2 = await Product.create({
      name: { en: 'Test Product 2', ar: 'منتج تجريبي 2' },
      slug: 'test-product-2',
      image: '/images/test2.jpg',
      isAvailable: true,
      order: 2
    });

    // Create test order
    testOrder = await Order.create({
      orderNumber: '123456',
      customer: testUser._id,
      customerName: testUser.name,
      customerPhone: testUser.phone,
      items: [{
        product: testProduct1._id,
        quantity: 3
      }],
      totalItems: 3,
      status: 'new',
      message: 'Test order',
      canEdit: true,
      editDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000),
      history: [{
        action: 'created',
        by: testUser._id,
        byName: testUser.name,
        timestamp: new Date()
      }]
    });

    // Mock utils
    mockGetEditDeadline.mockReturnValue(new Date(Date.now() + 2 * 60 * 60 * 1000));
  });

  describe('GET /api/orders', () => {
    describe('Happy Path', () => {
      it('should return user orders for regular user', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const request = new NextRequest('http://localhost:3000/api/orders');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.orders).toHaveLength(1);
        expect(data.orders[0].orderNumber).toBe('123456');
        expect(data.orders[0].customer._id).toBe(testUser._id.toString());
      });

      it('should return all orders for admin user', async () => {
        // Create another order for different user
        await Order.create({
          orderNumber: '654321',
          customer: testAdmin._id,
          customerName: testAdmin.name,
          customerPhone: testAdmin.phone,
          items: [{ product: testProduct2._id, quantity: 2 }],
          totalItems: 2,
          status: 'processing',
          canEdit: false,
          editDeadline: new Date(Date.now() - 1000),
          history: []
        });

        mockRequireAuth.mockResolvedValue({ userId: testAdmin._id.toString(), isAdmin: true });

        const request = new NextRequest('http://localhost:3000/api/orders');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.orders).toHaveLength(2);
      });

      it('should filter orders by status', async () => {
        await Order.create({
          orderNumber: '789012',
          customer: testUser._id,
          customerName: testUser.name,
          customerPhone: testUser.phone,
          items: [{ product: testProduct1._id, quantity: 1 }],
          totalItems: 1,
          status: 'processing',
          canEdit: false,
          editDeadline: new Date(),
          history: []
        });

        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const request = new NextRequest('http://localhost:3000/api/orders?status=processing');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.orders).toHaveLength(1);
        expect(data.orders[0].status).toBe('processing');
      });

      it('should filter orders by date', async () => {
        const today = new Date().toISOString().split('T')[0];
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const request = new NextRequest(`http://localhost:3000/api/orders?date=${today}`);
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.orders).toHaveLength(1);
      });

      it('should return orders sorted by creation date (newest first)', async () => {
        // Create older order
        const olderOrder = await Order.create({
          orderNumber: '111111',
          customer: testUser._id,
          customerName: testUser.name,
          customerPhone: testUser.phone,
          items: [{ product: testProduct1._id, quantity: 1 }],
          totalItems: 1,
          status: 'new',
          canEdit: true,
          editDeadline: new Date(),
          history: [],
          createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        });

        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const request = new NextRequest('http://localhost:3000/api/orders');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.orders).toHaveLength(2);
        expect(new Date(data.orders[0].createdAt).getTime()).toBeGreaterThan(
          new Date(data.orders[1].createdAt).getTime()
        );
      });
    });

    describe('Input Verification', () => {
      it('should handle invalid status filter gracefully', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const request = new NextRequest('http://localhost:3000/api/orders?status=invalid');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.orders).toHaveLength(0); // No orders with invalid status
      });

      it('should handle invalid date filter gracefully', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const request = new NextRequest('http://localhost:3000/api/orders?date=invalid-date');
        const response = await GET(request);

        expect(response.status).toBe(500); // Should handle date parsing error
      });

      it('should handle empty query parameters', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const request = new NextRequest('http://localhost:3000/api/orders?status=&date=');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.orders).toHaveLength(1);
      });
    });

    describe('Exception Handling', () => {
      it('should return 401 for unauthenticated user', async () => {
        mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));

        const request = new NextRequest('http://localhost:3000/api/orders');
        const response = await GET(request);

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: 'Unauthorized' });
      });

      it('should handle database connection errors', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });
        mockConnectDB.mockRejectedValue(new Error('Database connection failed'));

        const request = new NextRequest('http://localhost:3000/api/orders');
        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Internal server error' });
      });

      it('should handle database query errors', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });
        
        // Mock Order.find to throw error
        jest.spyOn(Order, 'find').mockImplementation(() => {
          throw new Error('Database query failed');
        });

        const request = new NextRequest('http://localhost:3000/api/orders');
        const response = await GET(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Internal server error' });
      });
    });

    describe('Data Formatting', () => {
      it('should format orders with populated data correctly', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const request = new NextRequest('http://localhost:3000/api/orders');
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        const order = data.orders[0];
        
        // Check order structure
        expect(order).toHaveProperty('_id');
        expect(order).toHaveProperty('orderNumber');
        expect(order).toHaveProperty('customer');
        expect(order).toHaveProperty('items');
        
        // Check customer data
        expect(order.customer).toHaveProperty('_id');
        expect(order.customer).toHaveProperty('name');
        
        // Check items structure
        expect(order.items[0]).toHaveProperty('product');
        expect(order.items[0].product).toHaveProperty('nameEn');
        expect(order.items[0].product).toHaveProperty('nameAr');
      });
    });
  });

  describe('POST /api/orders', () => {
    describe('Happy Path', () => {
      it('should create new order successfully', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const orderData = {
          items: [
            { product: testProduct1._id.toString(), quantity: 3 },
            { product: testProduct2._id.toString(), quantity: 2 }
          ],
          message: 'Test order message'
        };

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.order).toHaveProperty('_id');
        expect(data.order).toHaveProperty('orderNumber');
        expect(data.order.totalItems).toBe(5);
        expect(data.order.status).toBe('new');
        expect(data.order.message).toBe('Test order message');
        expect(data.order.canEdit).toBe(true);
      });

      it('should create order with minimum items (2)', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const orderData = {
          items: [
            { product: testProduct1._id.toString(), quantity: 2 }
          ]
        };

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        const response = await POST(request);

        expect(response.status).toBe(201);
      });

      it('should create order without message', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const orderData = {
          items: [
            { product: testProduct1._id.toString(), quantity: 3 }
          ]
        };

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.order.message).toBeUndefined();
      });
    });

    describe('Input Verification', () => {
      it('should reject order with less than 2 items', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const orderData = {
          items: [
            { product: testProduct1._id.toString(), quantity: 1 }
          ]
        };

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'Minimum order is 2 items' });
      });

      it('should reject order with non-existent products', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const orderData = {
          items: [
            { product: new mongoose.Types.ObjectId().toString(), quantity: 2 },
            { product: testProduct1._id.toString(), quantity: 1 }
          ]
        };

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        const response = await POST(request);

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: 'Some products not found' });
      });

      it('should reject order with unavailable products', async () => {
        // Create unavailable product
        const unavailableProduct = await Product.create({
          name: { en: 'Unavailable Product', ar: 'منتج غير متاح' },
          slug: 'unavailable-product',
          image: '/images/unavailable.jpg',
          isAvailable: false,
          order: 3
        });

        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const orderData = {
          items: [
            { product: unavailableProduct._id.toString(), quantity: 2 }
          ]
        };

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Some products are unavailable');
        expect(data.unavailableProducts).toHaveLength(1);
      });

      it('should reject order for non-existent user', async () => {
        const fakeUserId = new mongoose.Types.ObjectId().toString();
        mockRequireAuth.mockResolvedValue({ userId: fakeUserId, isAdmin: false });

        const orderData = {
          items: [
            { product: testProduct1._id.toString(), quantity: 2 }
          ]
        };

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        const response = await POST(request);

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: 'User not found' });
      });

      it('should handle invalid JSON in request body', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: 'invalid json'
        });

        const response = await POST(request);

        expect(response.status).toBe(500);
      });

      it('should handle missing items in request body', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify({})
        });

        const response = await POST(request);

        expect(response.status).toBe(500); // Will fail when trying to process items
      });
    });

    describe('Branching', () => {
      it('should handle order with single product multiple quantities', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const orderData = {
          items: [
            { product: testProduct1._id.toString(), quantity: 5 }
          ]
        };

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.order.totalItems).toBe(5);
        expect(data.order.items).toHaveLength(1);
      });

      it('should handle order with multiple products', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const orderData = {
          items: [
            { product: testProduct1._id.toString(), quantity: 2 },
            { product: testProduct2._id.toString(), quantity: 3 }
          ]
        };

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.order.totalItems).toBe(5);
        expect(data.order.items).toHaveLength(2);
      });

      it('should use customer name or phone for customerName field', async () => {
        // Test with user having name
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const orderData = {
          items: [{ product: testProduct1._id.toString(), quantity: 2 }]
        };

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.order.customer.name).toBe(testUser.name);
      });

      it('should generate valid order number', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const orderData = {
          items: [{ product: testProduct1._id.toString(), quantity: 2 }]
        };

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.order.orderNumber).toMatch(/^\d{6}$/);
      });
    });

    describe('Exception Handling', () => {
      it('should return 401 for unauthenticated user', async () => {
        mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify({ items: [] })
        });

        const response = await POST(request);

        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({ error: 'Unauthorized' });
      });

      it('should handle database connection errors', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });
        mockConnectDB.mockRejectedValue(new Error('Database connection failed'));

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify({ items: [{ product: testProduct1._id.toString(), quantity: 2 }] })
        });

        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Internal server error' });
      });

      it('should handle order creation database errors', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        // Mock Order.create to throw error
        jest.spyOn(Order, 'create').mockRejectedValue(new Error('Database error'));

        const orderData = {
          items: [{ product: testProduct1._id.toString(), quantity: 2 }]
        };

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        const response = await POST(request);

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: 'Internal server error' });
      });
    });

    describe('Order History and Audit', () => {
      it('should create order with initial history entry', async () => {
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const orderData = {
          items: [{ product: testProduct1._id.toString(), quantity: 3 }]
        };

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(data.order.history).toHaveLength(1);
        expect(data.order.history[0].action).toBe('created');
        expect(data.order.history[0].by).toBe(testUser._id.toString());
        expect(data.order.history[0].byName).toBe(testUser.name);
        expect(data.order.history[0].timestamp).toBeDefined();
      });

      it('should set correct edit deadline', async () => {
        const expectedDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000);
        mockGetEditDeadline.mockReturnValue(expectedDeadline);
        mockRequireAuth.mockResolvedValue({ userId: testUser._id.toString(), isAdmin: false });

        const orderData = {
          items: [{ product: testProduct1._id.toString(), quantity: 3 }]
        };

        const request = new NextRequest('http://localhost:3000/api/orders', {
          method: 'POST',
          body: JSON.stringify(orderData)
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(201);
        expect(mockGetEditDeadline).toHaveBeenCalledWith(2);
        expect(data.order.editDeadline).toBe(expectedDeadline.toISOString());
        expect(data.order.canEdit).toBe(true);
      });
    });
  });
});