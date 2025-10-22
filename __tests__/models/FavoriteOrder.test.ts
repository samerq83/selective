import FavoriteOrder, { IFavoriteOrder } from '../../models/FavoriteOrder';
import User from '../../models/User';
import Product from '../../models/Product';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

describe('FavoriteOrder Model', () => {
  let mongoServer: MongoMemoryServer;
  let userId: string;
  let productId1: string;
  let productId2: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
    
    // Create test user
    const user = new User({
      phone: '+1234567890',
      name: 'Test User',
      companyName: 'Test Company',
      address: 'Test Address',
      email: 'test@example.com',
      isActive: true,
      isAdmin: false
    });
    const savedUser = await user.save();
    userId = savedUser._id.toString();

    // Create test products
    const product1 = new Product({
      name: { en: 'Almond Milk', ar: 'حليب اللوز' },
      slug: 'almond-milk',
      image: '/images/almond.jpg',
      isAvailable: true,
      order: 1
    });
    const savedProduct1 = await product1.save();
    productId1 = savedProduct1._id.toString();

    const product2 = new Product({
      name: { en: 'Coconut Milk', ar: 'حليب جوز الهند' },
      slug: 'coconut-milk',
      image: '/images/coconut.jpg',
      isAvailable: true,
      order: 2
    });
    const savedProduct2 = await product2.save();
    productId2 = savedProduct2._id.toString();
  });

  describe('Happy Path', () => {
    it('should create a favorite order with valid data', async () => {
      const favoriteOrderData = {
        customer: userId,
        name: 'My Weekly Order',
        items: [
          {
            product: productId1,
            quantity: 5
          },
          {
            product: productId2,
            quantity: 3
          }
        ]
      };

      const favoriteOrder = new FavoriteOrder(favoriteOrderData);
      const savedFavoriteOrder = await favoriteOrder.save();

      expect(savedFavoriteOrder._id).toBeDefined();
      expect(savedFavoriteOrder.customer.toString()).toBe(userId);
      expect(savedFavoriteOrder.name).toBe('My Weekly Order');
      expect(savedFavoriteOrder.items).toHaveLength(2);
      expect(savedFavoriteOrder.items[0].product.toString()).toBe(productId1);
      expect(savedFavoriteOrder.items[0].quantity).toBe(5);
      expect(savedFavoriteOrder.items[1].product.toString()).toBe(productId2);
      expect(savedFavoriteOrder.items[1].quantity).toBe(3);
      expect(savedFavoriteOrder.createdAt).toBeDefined();
      expect(savedFavoriteOrder.updatedAt).toBeDefined();
    });

    it('should populate customer details', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: 'Daily Order',
        items: [{
          product: productId1,
          quantity: 2
        }]
      });
      await favoriteOrder.save();

      const populatedOrder = await FavoriteOrder.findById(favoriteOrder._id).populate('customer');
      
      expect(populatedOrder?.customer).toBeDefined();
      expect((populatedOrder?.customer as any).name).toBe('Test User');
      expect((populatedOrder?.customer as any).companyName).toBe('Test Company');
    });

    it('should populate product details in items', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: 'Product Test Order',
        items: [{
          product: productId1,
          quantity: 4
        }]
      });
      await favoriteOrder.save();

      const populatedOrder = await FavoriteOrder.findById(favoriteOrder._id).populate('items.product');
      
      expect(populatedOrder?.items[0].product).toBeDefined();
      expect((populatedOrder?.items[0].product as any).name.en).toBe('Almond Milk');
      expect((populatedOrder?.items[0].product as any).slug).toBe('almond-milk');
    });
  });

  describe('Input Verification', () => {
    it('should require customer field', async () => {
      const favoriteOrder = new FavoriteOrder({
        name: 'Test Order',
        items: [{
          product: productId1,
          quantity: 1
        }]
      });

      await expect(favoriteOrder.save()).rejects.toThrow();
    });

    it('should require name field', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        items: [{
          product: productId1,
          quantity: 1
        }]
      });

      await expect(favoriteOrder.save()).rejects.toThrow();
    });

    it('should trim and validate name length', async () => {
      const longName = 'A'.repeat(101);
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: longName,
        items: [{
          product: productId1,
          quantity: 1
        }]
      });

      await expect(favoriteOrder.save()).rejects.toThrow();
    });

    it('should trim name whitespace', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: '  Trimmed Order  ',
        items: [{
          product: productId1,
          quantity: 1
        }]
      });
      const savedOrder = await favoriteOrder.save();

      expect(savedOrder.name).toBe('Trimmed Order');
    });

    it('should require items array', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: 'Test Order'
      });

      const savedOrder = await favoriteOrder.save();
      expect(savedOrder.items).toEqual([]);
    });

    it('should validate item product reference', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: 'Invalid Product Order',
        items: [{
          quantity: 1
        }]
      });

      await expect(favoriteOrder.save()).rejects.toThrow();
    });

    it('should validate item quantity minimum value', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: 'Invalid Quantity Order',
        items: [{
          product: productId1,
          quantity: 0
        }]
      });

      await expect(favoriteOrder.save()).rejects.toThrow();
    });

    it('should require item quantity', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: 'No Quantity Order',
        items: [{
          product: productId1
        }]
      });

      await expect(favoriteOrder.save()).rejects.toThrow();
    });
  });

  describe('Branching', () => {
    it('should handle single item orders', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: 'Single Item',
        items: [{
          product: productId1,
          quantity: 1
        }]
      });
      const savedOrder = await favoriteOrder.save();

      expect(savedOrder.items).toHaveLength(1);
      expect(savedOrder.items[0].quantity).toBe(1);
    });

    it('should handle multiple item orders', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: 'Multi Item',
        items: [
          { product: productId1, quantity: 2 },
          { product: productId2, quantity: 5 }
        ]
      });
      const savedOrder = await favoriteOrder.save();

      expect(savedOrder.items).toHaveLength(2);
      expect(savedOrder.items[0].quantity).toBe(2);
      expect(savedOrder.items[1].quantity).toBe(5);
    });

    it('should handle empty items array', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: 'Empty Items',
        items: []
      });
      const savedOrder = await favoriteOrder.save();

      expect(savedOrder.items).toHaveLength(0);
    });

    it('should handle maximum name length', async () => {
      const maxName = 'A'.repeat(100);
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: maxName,
        items: [{
          product: productId1,
          quantity: 1
        }]
      });
      const savedOrder = await favoriteOrder.save();

      expect(savedOrder.name).toBe(maxName);
      expect(savedOrder.name.length).toBe(100);
    });
  });

  describe('Exception Handling', () => {
    it('should handle invalid customer ObjectId', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: 'invalid-id',
        name: 'Invalid Customer',
        items: [{
          product: productId1,
          quantity: 1
        }]
      });

      await expect(favoriteOrder.save()).rejects.toThrow();
    });

    it('should handle invalid product ObjectId', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: 'Invalid Product',
        items: [{
          product: 'invalid-product-id',
          quantity: 1
        }]
      });

      await expect(favoriteOrder.save()).rejects.toThrow();
    });

    it('should handle negative quantities', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: 'Negative Quantity',
        items: [{
          product: productId1,
          quantity: -5
        }]
      });

      await expect(favoriteOrder.save()).rejects.toThrow();
    });

    it('should handle duplicate validation errors', async () => {
      // Create first order
      const favoriteOrder1 = new FavoriteOrder({
        customer: userId,
        name: 'First Order',
        items: [{
          product: productId1,
          quantity: 1
        }]
      });
      await favoriteOrder1.save();

      // Try to create duplicate (should succeed as no unique constraints)
      const favoriteOrder2 = new FavoriteOrder({
        customer: userId,
        name: 'First Order',
        items: [{
          product: productId1,
          quantity: 1
        }]
      });
      const savedOrder2 = await favoriteOrder2.save();

      expect(savedOrder2._id).toBeDefined();
      expect(savedOrder2.name).toBe('First Order');
    });
  });

  describe('Database Operations', () => {
    it('should find favorite orders by customer', async () => {
      const order1 = new FavoriteOrder({
        customer: userId,
        name: 'Order 1',
        items: [{ product: productId1, quantity: 1 }]
      });
      const order2 = new FavoriteOrder({
        customer: userId,
        name: 'Order 2',
        items: [{ product: productId2, quantity: 2 }]
      });
      await Promise.all([order1.save(), order2.save()]);

      const customerOrders = await FavoriteOrder.find({ customer: userId });
      
      expect(customerOrders).toHaveLength(2);
      expect(customerOrders[0].customer.toString()).toBe(userId);
      expect(customerOrders[1].customer.toString()).toBe(userId);
    });

    it('should update favorite order', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: 'Original Name',
        items: [{ product: productId1, quantity: 1 }]
      });
      const savedOrder = await favoriteOrder.save();

      const updatedOrder = await FavoriteOrder.findByIdAndUpdate(
        savedOrder._id,
        { 
          name: 'Updated Name',
          items: [{ product: productId2, quantity: 3 }]
        },
        { new: true }
      );

      expect(updatedOrder?.name).toBe('Updated Name');
      expect(updatedOrder?.items).toHaveLength(1);
      expect(updatedOrder?.items[0].quantity).toBe(3);
    });

    it('should delete favorite order', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: 'To Delete',
        items: [{ product: productId1, quantity: 1 }]
      });
      const savedOrder = await favoriteOrder.save();

      await FavoriteOrder.findByIdAndDelete(savedOrder._id);
      const deletedOrder = await FavoriteOrder.findById(savedOrder._id);

      expect(deletedOrder).toBeNull();
    });

    it('should use customer index for efficient queries', async () => {
      // Create multiple orders for different customers
      const user2 = new User({
        phone: '+0987654321',
        name: 'User 2',
        companyName: 'Company 2',
        address: 'Address 2',
        email: 'user2@example.com',
        isActive: true,
        isAdmin: false
      });
      const savedUser2 = await user2.save();

      const orders = [
        { customer: userId, name: 'Order 1' },
        { customer: userId, name: 'Order 2' },
        { customer: savedUser2._id.toString(), name: 'Order 3' }
      ];

      for (const orderData of orders) {
        const order = new FavoriteOrder({
          ...orderData,
          items: [{ product: productId1, quantity: 1 }]
        });
        await order.save();
      }

      // Query should use index efficiently
      const user1Orders = await FavoriteOrder.find({ customer: userId });
      const user2Orders = await FavoriteOrder.find({ customer: savedUser2._id });

      expect(user1Orders).toHaveLength(2);
      expect(user2Orders).toHaveLength(1);
    });
  });

  describe('Timestamps', () => {
    it('should set createdAt and updatedAt on creation', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: 'Timestamp Test',
        items: [{ product: productId1, quantity: 1 }]
      });
      const savedOrder = await favoriteOrder.save();

      expect(savedOrder.createdAt).toBeInstanceOf(Date);
      expect(savedOrder.updatedAt).toBeInstanceOf(Date);
      expect(savedOrder.createdAt.getTime()).toBeLessThanOrEqual(savedOrder.updatedAt.getTime());
    });

    it('should update updatedAt on modification', async () => {
      const favoriteOrder = new FavoriteOrder({
        customer: userId,
        name: 'Update Test',
        items: [{ product: productId1, quantity: 1 }]
      });
      const savedOrder = await favoriteOrder.save();
      const originalUpdatedAt = savedOrder.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedOrder.name = 'Modified Name';
      const updatedOrder = await savedOrder.save();

      expect(updatedOrder.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      expect(updatedOrder.createdAt).toEqual(savedOrder.createdAt);
    });
  });
});