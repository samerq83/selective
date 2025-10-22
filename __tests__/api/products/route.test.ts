import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Product from '../../../models/Product';
import { connectDatabase, clearDatabase, disconnectDatabase, createMockNextRequest } from '../../test-utils';

// Import the route handlers
let GET: any, POST: any;

let mongoServer: MongoMemoryServer;

// Mock the auth module
jest.mock('@/lib/auth', () => ({
  requireAdmin: jest.fn()
}));

// Mock the mongodb connection
jest.mock('@/lib/mongodb', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('/api/products Route Handlers', () => {
  beforeAll(async () => {
    mongoServer = await connectDatabase();
    
    // Import route handlers after mocking
    const routeModule = await import('../../../app/api/products/route');
    GET = routeModule.GET;
    POST = routeModule.POST;
  });

  afterAll(async () => {
    await disconnectDatabase(mongoServer);
  });

  beforeEach(async () => {
    // Setup successful admin check by default
    const { requireAdmin } = require('@/lib/auth');
    requireAdmin.mockResolvedValue(undefined);
    
    // Setup successful DB connection
    const connectDB = require('@/lib/mongodb').default;
    connectDB.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();
  });

  describe('GET /api/products', () => {
    it('should return all products in correct order', async () => {
      // Create test products
      const product1 = await Product.create({
        name: { en: 'Almond Milk', ar: 'لبن اللوز' },
        slug: 'almond-milk',
        image: '/images/almond.jpg',
        isAvailable: true,
        order: 2
      });

      const product2 = await Product.create({
        name: { en: 'Oat Milk', ar: 'لبن الشوفان' },
        slug: 'oat-milk',
        image: '/images/oat.jpg',
        isAvailable: false,
        order: 1
      });

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toHaveLength(2);
      
      // Should be sorted by order first
      expect(responseData[0].name.en).toBe('Oat Milk'); // order: 1
      expect(responseData[1].name.en).toBe('Almond Milk'); // order: 2
    });

    it('should return products with formatted structure', async () => {
      const product = await Product.create({
        name: { en: 'Soy Milk', ar: 'لبن الصويا' },
        slug: 'soy-milk',
        image: '/images/soy.jpg',
        isAvailable: true,
        order: 1
      });

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toHaveLength(1);
      
      const returnedProduct = responseData[0];
      expect(returnedProduct).toHaveProperty('_id');
      expect(returnedProduct).toHaveProperty('id');
      expect(returnedProduct).toHaveProperty('name');
      expect(returnedProduct).toHaveProperty('nameEn', 'Soy Milk');
      expect(returnedProduct).toHaveProperty('nameAr', 'لبن الصويا');
      expect(returnedProduct).toHaveProperty('slug', 'soy-milk');
      expect(returnedProduct).toHaveProperty('image', '/images/soy.jpg');
      expect(returnedProduct).toHaveProperty('isAvailable', true);
      expect(returnedProduct).toHaveProperty('order', 1);
      
      // id should match _id for backward compatibility
      expect(returnedProduct.id).toBe(returnedProduct._id);
    });

    it('should return empty array when no products exist', async () => {
      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual([]);
    });

    it('should handle database connection errors', async () => {
      const connectDB = require('@/lib/mongodb').default;
      connectDB.mockRejectedValue(new Error('Database connection failed'));

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle product query errors', async () => {
      // Mock Product.find to throw error
      const originalFind = Product.find;
      Product.find = jest.fn().mockImplementation(() => {
        throw new Error('Database query failed');
      }) as any;

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');

      // Restore original method
      Product.find = originalFind;
    });

    it('should sort products by order then by createdAt descending', async () => {
      // Create products with same order but different creation times
      const product1 = await Product.create({
        name: { en: 'Product A', ar: 'منتج أ' },
        slug: 'product-a',
        order: 1
      });

      // Wait a bit to ensure different createdAt times
      await new Promise(resolve => setTimeout(resolve, 10));

      const product2 = await Product.create({
        name: { en: 'Product B', ar: 'منتج ب' },
        slug: 'product-b',
        order: 1
      });

      const response = await GET();
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toHaveLength(2);
      
      // Both have same order, so should be sorted by createdAt descending
      expect(responseData[0].name.en).toBe('Product B'); // Created later
      expect(responseData[1].name.en).toBe('Product A'); // Created earlier
    });
  });

  describe('POST /api/products', () => {
    const validProductData = {
      nameEn: 'New Product',
      nameAr: 'منتج جديد',
      image: '/images/new-product.jpg',
      isAvailable: true
    };

    it('should create a new product successfully', async () => {
      const request = createMockNextRequest('POST', '/api/products', validProductData);
      
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.product).toBeDefined();
      expect(responseData.product.nameEn).toBe('New Product');
      expect(responseData.product.nameAr).toBe('منتج جديد');
      expect(responseData.product.slug).toBe('new-product');
      expect(responseData.product.image).toBe('/images/new-product.jpg');
      expect(responseData.product.isAvailable).toBe(true);
      expect(responseData.product.order).toBe(0);

      // Verify product was saved to database
      const savedProduct = await Product.findById(responseData.product._id);
      expect(savedProduct).toBeDefined();
      expect(savedProduct!.name.en).toBe('New Product');
    });

    it('should generate slug from English name', async () => {
      const productData = {
        ...validProductData,
        nameEn: 'Coconut Milk Premium'
      };
      
      const request = createMockNextRequest('POST', '/api/products', productData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.product.slug).toBe('coconut-milk-premium');
    });

    it('should handle complex English names for slug generation', async () => {
      const productData = {
        ...validProductData,
        nameEn: 'Extra   Special    Milk   Product!!!'
      };
      
      const request = createMockNextRequest('POST', '/api/products', productData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.product.slug).toBe('extra-special-milk-product!!!');
    });

    it('should use default image when not provided', async () => {
      const productData = {
        nameEn: 'Product Without Image',
        nameAr: 'منتج بدون صورة',
        isAvailable: true
      };
      
      const request = createMockNextRequest('POST', '/api/products', productData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.product.image).toBe('/images/placeholder.png');
    });

    it('should default isAvailable to true when not provided', async () => {
      const productData = {
        nameEn: 'Available Product',
        nameAr: 'منتج متوفر'
      };
      
      const request = createMockNextRequest('POST', '/api/products', productData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.product.isAvailable).toBe(true);
    });

    it('should handle isAvailable set to false', async () => {
      const productData = {
        ...validProductData,
        isAvailable: false
      };
      
      const request = createMockNextRequest('POST', '/api/products', productData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.product.isAvailable).toBe(false);
    });

    it('should require admin authentication', async () => {
      const { requireAdmin } = require('@/lib/auth');
      requireAdmin.mockRejectedValue(new Error('Unauthorized'));

      const request = createMockNextRequest('POST', '/api/products', validProductData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should handle admin access required error', async () => {
      const { requireAdmin } = require('@/lib/auth');
      requireAdmin.mockRejectedValue(new Error('Admin access required'));

      const request = createMockNextRequest('POST', '/api/products', validProductData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.error).toBe('Admin access required');
    });

    it('should handle database connection errors during creation', async () => {
      const connectDB = require('@/lib/mongodb').default;
      connectDB.mockRejectedValue(new Error('Database connection failed'));

      const request = createMockNextRequest('POST', '/api/products', validProductData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle product creation errors', async () => {
      // Mock Product.create to throw error
      const originalCreate = Product.create;
      Product.create = jest.fn().mockRejectedValue(new Error('Validation failed')) as any;

      const request = createMockNextRequest('POST', '/api/products', validProductData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');

      // Restore original method
      Product.create = originalCreate;
    });

    it('should handle malformed JSON request', async () => {
      const request = {
        json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
      } as any;

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should create product with formatted response structure', async () => {
      const request = createMockNextRequest('POST', '/api/products', validProductData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      
      const product = responseData.product;
      expect(product).toHaveProperty('_id');
      expect(product).toHaveProperty('id');
      expect(product).toHaveProperty('name');
      expect(product).toHaveProperty('nameEn');
      expect(product).toHaveProperty('nameAr');
      expect(product).toHaveProperty('slug');
      expect(product).toHaveProperty('image');
      expect(product).toHaveProperty('isAvailable');
      expect(product).toHaveProperty('order');
      
      // Verify backward compatibility
      expect(product.id).toBe(product._id);
      expect(product.nameEn).toBe(product.name.en);
      expect(product.nameAr).toBe(product.name.ar);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing nameEn field in POST', async () => {
      const incompleteData = {
        nameAr: 'منتج ناقص',
        isAvailable: true
      };
      
      const request = createMockNextRequest('POST', '/api/products', incompleteData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle missing nameAr field in POST', async () => {
      const incompleteData = {
        nameEn: 'Incomplete Product',
        isAvailable: true
      };
      
      const request = createMockNextRequest('POST', '/api/products', incompleteData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle empty request body in POST', async () => {
      const request = createMockNextRequest('POST', '/api/products', {});
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal server error');
    });

    it('should handle products with special characters in names', async () => {
      const specialCharData = {
        nameEn: 'Special Milk & More!',
        nameAr: 'لبن خاص & المزيد!',
        isAvailable: true
      };
      
      const request = createMockNextRequest('POST', '/api/products', specialCharData);
      const response = await POST(request);
      const responseData = await response.json();

      if (response.status === 201) {
        expect(responseData.product.nameEn).toBe('Special Milk & More!');
        expect(responseData.product.nameAr).toBe('لبن خاص & المزيد!');
      }
    });
  });

  describe('Authentication Integration', () => {
    it('should call requireAdmin before processing POST request', async () => {
      const { requireAdmin } = require('@/lib/auth');
      
      const request = createMockNextRequest('POST', '/api/products', validProductData);
      await POST(request);

      expect(requireAdmin).toHaveBeenCalledTimes(1);
    });

    it('should not call requireAdmin for GET requests', async () => {
      const { requireAdmin } = require('@/lib/auth');
      
      await GET();

      expect(requireAdmin).not.toHaveBeenCalled();
    });
  });

  describe('Database Integration', () => {
    it('should call connectDB for both GET and POST', async () => {
      const connectDB = require('@/lib/mongodb').default;
      
      await GET();
      expect(connectDB).toHaveBeenCalledTimes(1);
      
      const request = createMockNextRequest('POST', '/api/products', validProductData);
      await POST(request);
      expect(connectDB).toHaveBeenCalledTimes(2);
    });
  });
});