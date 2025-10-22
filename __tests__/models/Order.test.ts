import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Order, { IOrder, IOrderItem, IOrderHistory } from '../../models/Order';
import User from '../../models/User';
import Product from '../../models/Product';
import { connectDatabase, clearDatabase, disconnectDatabase } from '../test-utils';

let mongoServer: MongoMemoryServer;

describe('Order Model', () => {
  let testUser: any;
  let testAdmin: any;
  let testProduct: any;

  beforeAll(async () => {
    mongoServer = await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase(mongoServer);
  });

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      name: 'محمد أحمد',
      phone: '+201234567890',
      businessName: 'متجر محمد',
      businessType: 'retail',
      location: 'القاهرة',
      isVerified: true,
      role: 'customer'
    });

    // Create test admin
    testAdmin = await User.create({
      name: 'Admin User',
      phone: '+201111111111',
      businessName: 'Selective Trading',
      businessType: 'distributor',
      location: 'Cairo',
      isVerified: true,
      role: 'admin'
    });

    // Create test product
    testProduct = await Product.create({
      name: {
        en: 'Almond Milk',
        ar: 'لبن اللوز'
      },
      category: 'Plant-based',
      isActive: true,
      order: 1
    });
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('Order Creation', () => {
    it('should create an order with required fields', async () => {
      const orderData = {
        customer: testUser._id,
        customerName: testUser.name,
        customerPhone: testUser.phone,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 2
        }],
        totalItems: 2,
        history: [{
          action: 'created' as const,
          by: testUser._id,
          byName: testUser.name,
          timestamp: new Date()
        }]
      };

      const order = await Order.create(orderData);

      expect(order).toBeDefined();
      expect(order.customer.toString()).toBe(testUser._id.toString());
      expect(order.customerName).toBe(testUser.name);
      expect(order.customerPhone).toBe(testUser.phone);
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(2);
      expect(order.totalItems).toBe(2);
      expect(order.status).toBe('new');
      expect(order.canEdit).toBe(true);
    });

    it('should auto-generate order number', async () => {
      const orderData = {
        customer: testUser._id,
        customerName: testUser.name,
        customerPhone: testUser.phone,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1
        }],
        totalItems: 1,
        history: [{
          action: 'created' as const,
          by: testUser._id,
          byName: testUser.name
        }]
      };

      const order = await Order.create(orderData);
      expect(order.orderNumber).toBeDefined();
      expect(order.orderNumber).toMatch(/^ST\d{6}-\d{4}$/);
    });

    it('should generate sequential order numbers for same day', async () => {
      const orderData = {
        customer: testUser._id,
        customerName: testUser.name,
        customerPhone: testUser.phone,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1
        }],
        totalItems: 1,
        history: [{
          action: 'created' as const,
          by: testUser._id,
          byName: testUser.name
        }]
      };

      const order1 = await Order.create(orderData);
      const order2 = await Order.create({
        ...orderData,
        customerPhone: '+201234567891' // Make it unique
      });

      expect(order1.orderNumber).toBeDefined();
      expect(order2.orderNumber).toBeDefined();
      expect(order1.orderNumber).not.toBe(order2.orderNumber);
      
      // Extract sequence numbers
      const seq1 = parseInt(order1.orderNumber.split('-')[1]);
      const seq2 = parseInt(order2.orderNumber.split('-')[1]);
      expect(seq2).toBe(seq1 + 1);
    });

    it('should have unique order numbers', async () => {
      const orderData = {
        customer: testUser._id,
        customerName: testUser.name,
        customerPhone: testUser.phone,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1
        }],
        totalItems: 1,
        history: [{
          action: 'created' as const,
          by: testUser._id,
          byName: testUser.name
        }]
      };

      const order1 = await Order.create(orderData);
      
      // Try to create another order with same number (manually set)
      const duplicateOrderData = {
        ...orderData,
        orderNumber: order1.orderNumber,
        customerPhone: '+201234567891'
      };

      await expect(Order.create(duplicateOrderData))
        .rejects
        .toThrow();
    });
  });

  describe('Order Validation', () => {
    it('should require customer field', async () => {
      const orderData = {
        customerName: 'Test Customer',
        customerPhone: '+201234567890',
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1
        }],
        totalItems: 1
      };

      await expect(Order.create(orderData))
        .rejects
        .toThrow();
    });

    it('should require customerName field', async () => {
      const orderData = {
        customer: testUser._id,
        customerPhone: '+201234567890',
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1
        }],
        totalItems: 1
      };

      await expect(Order.create(orderData))
        .rejects
        .toThrow();
    });

    it('should require customerPhone field', async () => {
      const orderData = {
        customer: testUser._id,
        customerName: 'Test Customer',
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1
        }],
        totalItems: 1
      };

      await expect(Order.create(orderData))
        .rejects
        .toThrow();
    });

    it('should validate item quantity minimum', async () => {
      const orderData = {
        customer: testUser._id,
        customerName: testUser.name,
        customerPhone: testUser.phone,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 0 // Invalid quantity
        }],
        totalItems: 0
      };

      await expect(Order.create(orderData))
        .rejects
        .toThrow();
    });

    it('should validate status enum values', async () => {
      const orderData = {
        customer: testUser._id,
        customerName: testUser.name,
        customerPhone: testUser.phone,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1
        }],
        totalItems: 1,
        status: 'invalid_status' as any
      };

      await expect(Order.create(orderData))
        .rejects
        .toThrow();
    });

    it('should validate message length', async () => {
      const longMessage = 'a'.repeat(501); // Exceeds 500 char limit

      const orderData = {
        customer: testUser._id,
        customerName: testUser.name,
        customerPhone: testUser.phone,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1
        }],
        totalItems: 1,
        message: longMessage
      };

      await expect(Order.create(orderData))
        .rejects
        .toThrow();
    });

    it('should validate history action enum', async () => {
      const orderData = {
        customer: testUser._id,
        customerName: testUser.name,
        customerPhone: testUser.phone,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1
        }],
        totalItems: 1,
        history: [{
          action: 'invalid_action' as any,
          by: testUser._id,
          byName: testUser.name
        }]
      };

      await expect(Order.create(orderData))
        .rejects
        .toThrow();
    });
  });

  describe('Order Updates', () => {
    let testOrder: IOrder;

    beforeEach(async () => {
      testOrder = await Order.create({
        customer: testUser._id,
        customerName: testUser.name,
        customerPhone: testUser.phone,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1
        }],
        totalItems: 1,
        history: [{
          action: 'created',
          by: testUser._id,
          byName: testUser.name
        }]
      });
    });

    it('should update order status', async () => {
      testOrder.status = 'received';
      testOrder.history.push({
        action: 'received',
        by: testAdmin._id,
        byName: testAdmin.name,
        timestamp: new Date(),
        changes: 'Order marked as received'
      });

      const updatedOrder = await testOrder.save();
      expect(updatedOrder.status).toBe('received');
      expect(updatedOrder.history).toHaveLength(2);
      expect(updatedOrder.history[1].action).toBe('received');
    });

    it('should update canEdit status', async () => {
      testOrder.canEdit = false;
      const updatedOrder = await testOrder.save();
      expect(updatedOrder.canEdit).toBe(false);
    });

    it('should set edit deadline', async () => {
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 2);

      testOrder.editDeadline = deadline;
      const updatedOrder = await testOrder.save();
      expect(updatedOrder.editDeadline).toEqual(deadline);
    });

    it('should add items to existing order', async () => {
      const newProduct = await Product.create({
        name: {
          en: 'Oat Milk',
          ar: 'لبن الشوفان'
        },
        category: 'Plant-based',
        isActive: true,
        order: 2
      });

      testOrder.items.push({
        product: newProduct._id,
        productName: newProduct.name,
        quantity: 3
      });
      testOrder.totalItems = 4;
      testOrder.history.push({
        action: 'updated',
        by: testUser._id,
        byName: testUser.name,
        timestamp: new Date(),
        changes: 'Added Oat Milk (3 units)'
      });

      const updatedOrder = await testOrder.save();
      expect(updatedOrder.items).toHaveLength(2);
      expect(updatedOrder.totalItems).toBe(4);
    });
  });

  describe('Order Queries', () => {
    beforeEach(async () => {
      // Create multiple orders for testing
      await Order.create({
        customer: testUser._id,
        customerName: testUser.name,
        customerPhone: testUser.phone,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1
        }],
        totalItems: 1,
        status: 'new',
        history: [{
          action: 'created',
          by: testUser._id,
          byName: testUser.name
        }]
      });

      await Order.create({
        customer: testUser._id,
        customerName: testUser.name,
        customerPhone: testUser.phone,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 2
        }],
        totalItems: 2,
        status: 'received',
        history: [{
          action: 'created',
          by: testUser._id,
          byName: testUser.name
        }]
      });
    });

    it('should find orders by customer', async () => {
      const orders = await Order.find({ customer: testUser._id });
      expect(orders).toHaveLength(2);
      orders.forEach(order => {
        expect(order.customer.toString()).toBe(testUser._id.toString());
      });
    });

    it('should find orders by status', async () => {
      const newOrders = await Order.find({ status: 'new' });
      const receivedOrders = await Order.find({ status: 'received' });

      expect(newOrders).toHaveLength(1);
      expect(receivedOrders).toHaveLength(1);
    });

    it('should find orders by order number', async () => {
      const firstOrder = await Order.findOne();
      const foundOrder = await Order.findOne({ orderNumber: firstOrder?.orderNumber });

      expect(foundOrder).toBeDefined();
      expect(foundOrder?.orderNumber).toBe(firstOrder?.orderNumber);
    });

    it('should sort orders by creation date', async () => {
      const orders = await Order.find().sort({ createdAt: -1 });
      expect(orders).toHaveLength(2);
      
      // Check if sorted in descending order
      expect(orders[0].createdAt.getTime()).toBeGreaterThanOrEqual(orders[1].createdAt.getTime());
    });
  });

  describe('Order Population', () => {
    let testOrder: IOrder;

    beforeEach(async () => {
      testOrder = await Order.create({
        customer: testUser._id,
        customerName: testUser.name,
        customerPhone: testUser.phone,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1
        }],
        totalItems: 1,
        history: [{
          action: 'created',
          by: testUser._id,
          byName: testUser.name
        }]
      });
    });

    it('should populate customer details', async () => {
      const populatedOrder = await Order.findById(testOrder._id).populate('customer');
      expect(populatedOrder?.customer).toBeDefined();
      expect((populatedOrder?.customer as any).name).toBe(testUser.name);
    });

    it('should populate product details in items', async () => {
      const populatedOrder = await Order.findById(testOrder._id).populate('items.product');
      expect(populatedOrder?.items[0].product).toBeDefined();
      expect((populatedOrder?.items[0].product as any).name).toEqual(testProduct.name);
    });

    it('should populate history user details', async () => {
      const populatedOrder = await Order.findById(testOrder._id).populate('history.by');
      expect(populatedOrder?.history[0].by).toBeDefined();
      expect((populatedOrder?.history[0].by as any).name).toBe(testUser.name);
    });
  });

  describe('Order History', () => {
    it('should maintain order history', async () => {
      const order = await Order.create({
        customer: testUser._id,
        customerName: testUser.name,
        customerPhone: testUser.phone,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1
        }],
        totalItems: 1,
        history: [{
          action: 'created',
          by: testUser._id,
          byName: testUser.name
        }]
      });

      // Add update history
      order.history.push({
        action: 'updated',
        by: testUser._id,
        byName: testUser.name,
        timestamp: new Date(),
        changes: 'Quantity changed from 1 to 2'
      });

      // Add received history
      order.history.push({
        action: 'received',
        by: testAdmin._id,
        byName: testAdmin.name,
        timestamp: new Date()
      });

      await order.save();
      expect(order.history).toHaveLength(3);
      expect(order.history[0].action).toBe('created');
      expect(order.history[1].action).toBe('updated');
      expect(order.history[2].action).toBe('received');
    });

    it('should set default timestamp for history entries', async () => {
      const order = await Order.create({
        customer: testUser._id,
        customerName: testUser.name,
        customerPhone: testUser.phone,
        items: [{
          product: testProduct._id,
          productName: testProduct.name,
          quantity: 1
        }],
        totalItems: 1,
        history: [{
          action: 'created',
          by: testUser._id,
          byName: testUser.name
          // No timestamp provided - should use default
        }]
      });

      expect(order.history[0].timestamp).toBeDefined();
      expect(order.history[0].timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Database Indexes', () => {
    it('should have proper indexes', async () => {
      const indexes = await Order.collection.getIndexes();
      
      // Check for expected indexes
      expect(indexes).toHaveProperty('orderNumber_1');
      expect(indexes).toHaveProperty('customer_1');
      expect(indexes).toHaveProperty('status_1');
      expect(indexes).toHaveProperty('createdAt_-1');
      expect(indexes).toHaveProperty('items.product_1');
    });
  });
});