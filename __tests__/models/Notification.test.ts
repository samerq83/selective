import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Notification, { INotification } from '../../models/Notification';
import User from '../../models/User';
import Order from '../../models/Order';
import { connectDatabase, clearDatabase, disconnectDatabase } from '../test-utils';

let mongoServer: MongoMemoryServer;

describe('Notification Model', () => {
  let testUser: any;
  let testOrder: any;

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

    // Create test order for related notifications
    testOrder = await Order.create({
      customer: testUser._id,
      customerName: testUser.name,
      customerPhone: testUser.phone,
      items: [{
        product: new mongoose.Types.ObjectId(),
        productName: { en: 'Test Product', ar: 'منتج تجريبي' },
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

  afterEach(async () => {
    await clearDatabase();
  });

  describe('Notification Creation', () => {
    it('should create notification with required fields', async () => {
      const notificationData = {
        user: testUser._id,
        title: {
          en: 'Order Received',
          ar: 'تم استلام الطلب'
        },
        message: {
          en: 'Your order has been received and is being processed',
          ar: 'تم استلام طلبكم وهو قيد المعالجة'
        },
        type: 'order' as const,
        relatedOrder: testOrder._id
      };

      const notification = await Notification.create(notificationData);

      expect(notification).toBeDefined();
      expect(notification.user.toString()).toBe(testUser._id.toString());
      expect(notification.title.en).toBe('Order Received');
      expect(notification.title.ar).toBe('تم استلام الطلب');
      expect(notification.message.en).toBe('Your order has been received and is being processed');
      expect(notification.message.ar).toBe('تم استلام طلبكم وهو قيد المعالجة');
      expect(notification.type).toBe('order');
      expect(notification.relatedOrder?.toString()).toBe(testOrder._id.toString());
      expect(notification.isRead).toBe(false);
    });

    it('should create notification with default values', async () => {
      const notificationData = {
        user: testUser._id,
        title: {
          en: 'System Notification',
          ar: 'إشعار النظام'
        },
        message: {
          en: 'System maintenance scheduled',
          ar: 'صيانة النظام مجدولة'
        }
        // type and isRead should use default values
      };

      const notification = await Notification.create(notificationData);

      expect(notification.type).toBe('info');
      expect(notification.isRead).toBe(false);
      expect(notification.relatedOrder).toBeUndefined();
    });

    it('should create system notification', async () => {
      const notification = await Notification.create({
        user: testUser._id,
        title: {
          en: 'System Update',
          ar: 'تحديث النظام'
        },
        message: {
          en: 'New features available',
          ar: 'ميزات جديدة متاحة'
        },
        type: 'system'
      });

      expect(notification.type).toBe('system');
    });

    it('should create info notification', async () => {
      const notification = await Notification.create({
        user: testUser._id,
        title: {
          en: 'Welcome!',
          ar: 'أهلاً وسهلاً!'
        },
        message: {
          en: 'Welcome to our platform',
          ar: 'مرحباً بكم في منصتنا'
        },
        type: 'info'
      });

      expect(notification.type).toBe('info');
    });
  });

  describe('Notification Validation', () => {
    it('should require user field', async () => {
      const notificationData = {
        title: {
          en: 'Test',
          ar: 'اختبار'
        },
        message: {
          en: 'Test message',
          ar: 'رسالة اختبار'
        }
      };

      await expect(Notification.create(notificationData))
        .rejects
        .toThrow();
    });

    it('should require title.en field', async () => {
      const notificationData = {
        user: testUser._id,
        title: {
          ar: 'اختبار'
        },
        message: {
          en: 'Test message',
          ar: 'رسالة اختبار'
        }
      };

      await expect(Notification.create(notificationData))
        .rejects
        .toThrow();
    });

    it('should require title.ar field', async () => {
      const notificationData = {
        user: testUser._id,
        title: {
          en: 'Test'
        },
        message: {
          en: 'Test message',
          ar: 'رسالة اختبار'
        }
      };

      await expect(Notification.create(notificationData))
        .rejects
        .toThrow();
    });

    it('should require message.en field', async () => {
      const notificationData = {
        user: testUser._id,
        title: {
          en: 'Test',
          ar: 'اختبار'
        },
        message: {
          ar: 'رسالة اختبار'
        }
      };

      await expect(Notification.create(notificationData))
        .rejects
        .toThrow();
    });

    it('should require message.ar field', async () => {
      const notificationData = {
        user: testUser._id,
        title: {
          en: 'Test',
          ar: 'اختبار'
        },
        message: {
          en: 'Test message'
        }
      };

      await expect(Notification.create(notificationData))
        .rejects
        .toThrow();
    });

    it('should validate type enum values', async () => {
      const notificationData = {
        user: testUser._id,
        title: {
          en: 'Test',
          ar: 'اختبار'
        },
        message: {
          en: 'Test message',
          ar: 'رسالة اختبار'
        },
        type: 'invalid_type' as any
      };

      await expect(Notification.create(notificationData))
        .rejects
        .toThrow();
    });
  });

  describe('Notification Updates', () => {
    let testNotification: INotification;

    beforeEach(async () => {
      testNotification = await Notification.create({
        user: testUser._id,
        title: {
          en: 'Test Notification',
          ar: 'إشعار تجريبي'
        },
        message: {
          en: 'This is a test notification',
          ar: 'هذا إشعار تجريبي'
        },
        type: 'order',
        relatedOrder: testOrder._id
      });
    });

    it('should mark notification as read', async () => {
      testNotification.isRead = true;
      const updatedNotification = await testNotification.save();

      expect(updatedNotification.isRead).toBe(true);
    });

    it('should update notification title', async () => {
      testNotification.title.en = 'Updated Title';
      testNotification.title.ar = 'عنوان محدث';
      const updatedNotification = await testNotification.save();

      expect(updatedNotification.title.en).toBe('Updated Title');
      expect(updatedNotification.title.ar).toBe('عنوان محدث');
    });

    it('should update notification message', async () => {
      testNotification.message.en = 'Updated message';
      testNotification.message.ar = 'رسالة محدثة';
      const updatedNotification = await testNotification.save();

      expect(updatedNotification.message.en).toBe('Updated message');
      expect(updatedNotification.message.ar).toBe('رسالة محدثة');
    });

    it('should update notification type', async () => {
      testNotification.type = 'system';
      const updatedNotification = await testNotification.save();

      expect(updatedNotification.type).toBe('system');
    });
  });

  describe('Notification Queries', () => {
    beforeEach(async () => {
      // Create multiple notifications for testing
      await Notification.create({
        user: testUser._id,
        title: { en: 'Unread Order', ar: 'طلب غير مقروء' },
        message: { en: 'Your order is ready', ar: 'طلبكم جاهز' },
        type: 'order',
        isRead: false
      });

      await Notification.create({
        user: testUser._id,
        title: { en: 'Read System', ar: 'نظام مقروء' },
        message: { en: 'System updated', ar: 'تم تحديث النظام' },
        type: 'system',
        isRead: true
      });

      await Notification.create({
        user: testUser._id,
        title: { en: 'Unread Info', ar: 'معلومات غير مقروءة' },
        message: { en: 'New features', ar: 'ميزات جديدة' },
        type: 'info',
        isRead: false
      });

      // Create notification for different user
      const anotherUser = await User.create({
        name: 'Another User',
        phone: '+201987654321',
        businessName: 'Another Business',
        businessType: 'retail',
        location: 'Alexandria',
        isVerified: true,
        role: 'customer'
      });

      await Notification.create({
        user: anotherUser._id,
        title: { en: 'Other User', ar: 'مستخدم آخر' },
        message: { en: 'Different user notification', ar: 'إشعار مستخدم مختلف' },
        type: 'info'
      });
    });

    it('should find notifications by user', async () => {
      const notifications = await Notification.find({ user: testUser._id });
      expect(notifications).toHaveLength(3);
      notifications.forEach(notification => {
        expect(notification.user.toString()).toBe(testUser._id.toString());
      });
    });

    it('should find unread notifications', async () => {
      const unreadNotifications = await Notification.find({ 
        user: testUser._id, 
        isRead: false 
      });
      expect(unreadNotifications).toHaveLength(2);
      unreadNotifications.forEach(notification => {
        expect(notification.isRead).toBe(false);
      });
    });

    it('should find read notifications', async () => {
      const readNotifications = await Notification.find({ 
        user: testUser._id, 
        isRead: true 
      });
      expect(readNotifications).toHaveLength(1);
      expect(readNotifications[0].isRead).toBe(true);
    });

    it('should find notifications by type', async () => {
      const orderNotifications = await Notification.find({ 
        user: testUser._id, 
        type: 'order' 
      });
      const systemNotifications = await Notification.find({ 
        user: testUser._id, 
        type: 'system' 
      });
      const infoNotifications = await Notification.find({ 
        user: testUser._id, 
        type: 'info' 
      });

      expect(orderNotifications).toHaveLength(1);
      expect(systemNotifications).toHaveLength(1);
      expect(infoNotifications).toHaveLength(1);
    });

    it('should sort notifications by creation date', async () => {
      const notifications = await Notification.find({ user: testUser._id })
        .sort({ createdAt: -1 });
      
      expect(notifications).toHaveLength(3);
      // Check if sorted in descending order
      for (let i = 0; i < notifications.length - 1; i++) {
        expect(notifications[i].createdAt.getTime())
          .toBeGreaterThanOrEqual(notifications[i + 1].createdAt.getTime());
      }
    });
  });

  describe('Notification Population', () => {
    let testNotification: INotification;

    beforeEach(async () => {
      testNotification = await Notification.create({
        user: testUser._id,
        title: {
          en: 'Order Notification',
          ar: 'إشعار الطلب'
        },
        message: {
          en: 'Your order has been updated',
          ar: 'تم تحديث طلبكم'
        },
        type: 'order',
        relatedOrder: testOrder._id
      });
    });

    it('should populate user details', async () => {
      const populatedNotification = await Notification.findById(testNotification._id)
        .populate('user');
      
      expect(populatedNotification?.user).toBeDefined();
      expect((populatedNotification?.user as any).name).toBe(testUser.name);
    });

    it('should populate related order details', async () => {
      const populatedNotification = await Notification.findById(testNotification._id)
        .populate('relatedOrder');
      
      expect(populatedNotification?.relatedOrder).toBeDefined();
      expect((populatedNotification?.relatedOrder as any).orderNumber).toBe(testOrder.orderNumber);
    });

    it('should populate both user and order', async () => {
      const populatedNotification = await Notification.findById(testNotification._id)
        .populate(['user', 'relatedOrder']);
      
      expect(populatedNotification?.user).toBeDefined();
      expect(populatedNotification?.relatedOrder).toBeDefined();
      expect((populatedNotification?.user as any).name).toBe(testUser.name);
      expect((populatedNotification?.relatedOrder as any).orderNumber).toBe(testOrder.orderNumber);
    });
  });

  describe('Bulk Operations', () => {
    beforeEach(async () => {
      // Create multiple unread notifications
      await Notification.create([
        {
          user: testUser._id,
          title: { en: 'Notification 1', ar: 'إشعار 1' },
          message: { en: 'Message 1', ar: 'رسالة 1' },
          type: 'order',
          isRead: false
        },
        {
          user: testUser._id,
          title: { en: 'Notification 2', ar: 'إشعار 2' },
          message: { en: 'Message 2', ar: 'رسالة 2' },
          type: 'system',
          isRead: false
        },
        {
          user: testUser._id,
          title: { en: 'Notification 3', ar: 'إشعار 3' },
          message: { en: 'Message 3', ar: 'رسالة 3' },
          type: 'info',
          isRead: false
        }
      ]);
    });

    it('should mark all notifications as read', async () => {
      await Notification.updateMany(
        { user: testUser._id, isRead: false },
        { isRead: true }
      );

      const unreadCount = await Notification.countDocuments({
        user: testUser._id,
        isRead: false
      });

      expect(unreadCount).toBe(0);
    });

    it('should delete old notifications', async () => {
      // Create old notification
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 31); // 31 days ago

      await Notification.create({
        user: testUser._id,
        title: { en: 'Old Notification', ar: 'إشعار قديم' },
        message: { en: 'Old message', ar: 'رسالة قديمة' },
        createdAt: oldDate
      });

      // Delete notifications older than 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo }
      });

      const remainingCount = await Notification.countDocuments({
        user: testUser._id
      });

      expect(remainingCount).toBe(3); // Only recent notifications remain
    });
  });

  describe('Database Indexes', () => {
    it('should have proper indexes', async () => {
      const indexes = await Notification.collection.getIndexes();
      
      // Check for expected indexes
      expect(indexes).toHaveProperty('user_1_isRead_1');
      expect(indexes).toHaveProperty('createdAt_-1');
    });
  });
});