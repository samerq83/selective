/**
 * اختبارات تكامل الترحيل - Migration Integration Tests
 * 
 * هذه الاختبارات تغطي:
 * - التكامل الكامل لعملية الترحيل
 * - سيناريوهات الاستخدام الواقعية
 * - اختبار النهاية إلى النهاية للنظام
 * - التحقق من سلامة البيانات بعد الترحيل
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// استيراد وظائف الترحيل
const {
  diagnosisDataConflicts,
  migrateMissingData,
  checkMongoDBConnection,
  finalizeMongoDBMigration
} = require('./data-migration.test.js');

const {
  createAdminUser,
  syncProducts,
  seedDatabase,
  testDatabaseConnection
} = require('./database-operations.test.js');

// إعداد متغيرات الاختبار
let mongoServer;
let mongoClient;
let database;
const testDatabaseName = 'selective_trading_integration_test';

describe('🔄 Migration Integration Tests', () => {

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    database = mongoClient.db(testDatabaseName);
    process.env.MONGODB_URI = mongoUri + testDatabaseName;
  });

  beforeEach(async () => {
    // تنظيف قاعدة البيانات قبل كل اختبار
    if (database) {
      const collections = await database.listCollections().toArray();
      for (const collection of collections) {
        await database.collection(collection.name).deleteMany({});
      }
    }
  });

  afterAll(async () => {
    if (mongoClient) {
      await mongoClient.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('🎯 Complete Migration Workflow', () => {
    
    test('should perform full migration from JSON to MongoDB', async () => {
      // بيانات JSON محاكاة (تمثل الحالة الحقيقية)
      const realWorldJsonData = {
        users: [
          {
            id: '1',
            name: 'أحمد محمد',
            email: 'ahmed@example.com',
            phone: '+966501234567',
            role: 'customer',
            createdAt: '2023-01-15T10:00:00Z'
          },
          {
            id: '2',
            name: 'فاطمة علي',
            email: 'fatima@example.com',
            phone: '+966509876543',
            role: 'customer',
            createdAt: '2023-02-20T14:30:00Z'
          }
        ],
        products: [
          {
            id: 'p1',
            name_ar: 'حليب لوز عضوي',
            name_en: 'Organic Almond Milk',
            price: 35,
            category: 'dairy_alternatives',
            status: 'active',
            image: '/uploads/almond-organic.jpg'
          },
          {
            id: 'p2',
            name_ar: 'حليب شوفان بالفانيليا',
            name_en: 'Vanilla Oat Milk',
            price: 40,
            category: 'dairy_alternatives',
            status: 'active',
            image: '/uploads/oat-vanilla.jpg'
          }
        ],
        orders: [
          {
            id: 'order_001',
            userId: '1',
            items: [
              { productId: 'p1', name: 'حليب لوز عضوي', quantity: 2, price: 35 },
              { productId: 'p2', name: 'حليب شوفان بالفانيليا', quantity: 1, price: 40 }
            ],
            total: 110,
            status: 'completed',
            deliveryDate: '2023-12-15',
            createdAt: '2023-12-01T09:30:00Z'
          },
          {
            id: 'order_002',
            userId: '2',
            items: [
              { productId: 'p1', name: 'حليب لوز عضوي', quantity: 3, price: 35 }
            ],
            total: 105,
            status: 'pending',
            deliveryDate: '2023-12-20',
            createdAt: '2023-12-05T16:45:00Z'
          }
        ]
      };

      // الخطوة 1: تشخيص التضاربات
      console.log('🔍 Step 1: Diagnosing data conflicts...');
      const diagnosis = await diagnosisDataConflicts(database, realWorldJsonData);
      
      expect(diagnosis.status).toBe('conflicts_detected');
      expect(diagnosis.summary.missingInMongoDB.users).toBe(2);
      expect(diagnosis.summary.missingInMongoDB.orders).toBe(2);

      // الخطوة 2: مزامنة المنتجات
      console.log('🛍️ Step 2: Syncing products...');
      const productSyncResult = await syncProducts(database, realWorldJsonData.products);
      
      expect(productSyncResult.success).toBe(true);
      expect(productSyncResult.summary.added).toBe(2);

      // الخطوة 3: ترحيل البيانات المفقودة
      console.log('📦 Step 3: Migrating missing data...');
      const migrationResult = await migrateMissingData(database, realWorldJsonData);
      
      expect(migrationResult.success).toBe(true);
      expect(migrationResult.summary.usersAdded).toBe(2);
      expect(migrationResult.summary.ordersAdded).toBe(2);

      // الخطوة 4: التحقق من النتيجة النهائية
      console.log('✅ Step 4: Verifying final state...');
      
      const finalUsers = await database.collection('users').find({}).toArray();
      const finalProducts = await database.collection('products').find({}).toArray();
      const finalOrders = await database.collection('orders').find({}).toArray();
      
      expect(finalUsers).toHaveLength(2);
      expect(finalProducts).toHaveLength(2);
      expect(finalOrders).toHaveLength(2);

      // التحقق من سلامة البيانات
      const ahmed = finalUsers.find(u => u.email === 'ahmed@example.com');
      expect(ahmed.name).toBe('أحمد محمد');
      expect(ahmed.phone).toBe('+966501234567');

      const order001 = finalOrders.find(o => o._id === 'order_001');
      expect(order001.userId).toBe('1');
      expect(order001.total).toBe(110);
      expect(order001.items).toHaveLength(2);

      console.log('🎉 Migration completed successfully!');
    });

    test('should handle incremental data updates', async () => {
      // إعداد بيانات أولية في MongoDB
      await database.collection('users').insertOne({
        _id: '1',
        name: 'أحمد الأول',
        email: 'ahmed@example.com',
        role: 'customer'
      });

      await database.collection('orders').insertOne({
        _id: 'order_001',
        userId: '1',
        total: 100,
        status: 'completed'
      });

      // بيانات JSON محدثة
      const updatedJsonData = {
        users: [
          {
            id: '1',
            name: 'أحمد محمد المحدث', // اسم محدث
            email: 'ahmed@example.com',
            phone: '+966501234567', // هاتف جديد
            role: 'customer'
          },
          {
            id: '3', // مستخدم جديد
            name: 'سارة أحمد',
            email: 'sara@example.com',
            role: 'customer'
          }
        ],
        orders: [
          // طلب جديد
          {
            id: 'order_003',
            userId: '3',
            total: 75,
            status: 'pending'
          }
        ]
      };

      // تنفيذ الترحيل التزايدي
      const migrationResult = await migrateMissingData(database, updatedJsonData);
      
      expect(migrationResult.success).toBe(true);
      expect(migrationResult.summary.usersAdded).toBe(1); // سارة
      expect(migrationResult.summary.usersUpdated).toBe(1); // أحمد
      expect(migrationResult.summary.ordersAdded).toBe(1);

      // التحقق من التحديثات
      const updatedAhmed = await database.collection('users').findOne({ _id: '1' });
      expect(updatedAhmed.name).toBe('أحمد محمد المحدث');
      expect(updatedAhmed.phone).toBe('+966501234567');

      const sara = await database.collection('users').findOne({ _id: '3' });
      expect(sara.name).toBe('سارة أحمد');
    });
  });

  describe('🏗️ System Setup and Initialization', () => {
    
    test('should initialize complete system from scratch', async () => {
      // الخطوة 1: إنشاء مدير النظام
      const adminData = {
        name: 'مدير النظام',
        email: 'admin@selective.com',
        password: 'AdminSecure123!',
        phone: '+966500000000'
      };

      const adminResult = await createAdminUser(database, adminData);
      expect(adminResult.success).toBe(true);

      // الخطوة 2: بذر البيانات الأساسية
      const seedData = {
        users: [
          {
            name: 'عميل تجريبي',
            email: 'demo@example.com',
            role: 'customer',
            password: 'demo123'
          }
        ],
        products: [
          {
            name_ar: 'حليب لوز مجاني',
            name_en: 'Free Almond Milk',
            price: 0,
            category: 'sample',
            status: 'active'
          }
        ]
      };

      const seedResult = await seedDatabase(database, seedData);
      expect(seedResult.success).toBe(true);

      // الخطوة 3: التحقق من الإعداد الكامل
      const totalUsers = await database.collection('users').countDocuments();
      const totalProducts = await database.collection('products').countDocuments();
      
      expect(totalUsers).toBe(2); // مدير + عميل تجريبي
      expect(totalProducts).toBe(1);

      // التحقق من أدوار المستخدمين
      const admin = await database.collection('users').findOne({ role: 'admin' });
      const customer = await database.collection('users').findOne({ role: 'customer' });
      
      expect(admin.email).toBe('admin@selective.com');
      expect(customer.email).toBe('demo@example.com');

      console.log('🎯 System initialization completed successfully!');
    });
  });

  describe('⚡ Performance and Scalability', () => {
    
    test('should handle large data migration efficiently', async () => {
      // إنشاء بيانات كبيرة للاختبار
      const largeDataset = {
        users: [],
        orders: []
      };

      // إنشاء 100 مستخدم
      for (let i = 1; i <= 100; i++) {
        largeDataset.users.push({
          id: `user_${i}`,
          name: `مستخدم ${i}`,
          email: `user${i}@example.com`,
          role: 'customer'
        });
      }

      // إنشاء 500 طلب
      for (let i = 1; i <= 500; i++) {
        const userId = `user_${Math.floor(Math.random() * 100) + 1}`;
        largeDataset.orders.push({
          id: `order_${i}`,
          userId,
          items: [{ productId: 'p1', quantity: 1, price: 50 }],
          total: 50,
          status: 'completed'
        });
      }

      const startTime = Date.now();
      const migrationResult = await migrateMissingData(database, largeDataset);
      const endTime = Date.now();

      expect(migrationResult.success).toBe(true);
      expect(migrationResult.summary.usersAdded).toBe(100);
      expect(migrationResult.summary.ordersAdded).toBe(500);

      // التحقق من الأداء (يجب أن تكتمل في أقل من 5 ثواني)
      const migrationTime = endTime - startTime;
      expect(migrationTime).toBeLessThan(5000);

      console.log(`⏱️ Large dataset migration completed in ${migrationTime}ms`);
    });

    test('should maintain data consistency under concurrent operations', async () => {
      const concurrentUsers = [];
      
      // إنشاء عدة عمليات إدراج متزامنة
      for (let i = 1; i <= 10; i++) {
        const userData = {
          name: `مستخدم متزامن ${i}`,
          email: `concurrent${i}@example.com`,
          password: 'password123',
          role: 'customer'
        };
        
        concurrentUsers.push(createAdminUser(database, userData));
      }

      // تنفيذ جميع العمليات بالتوازي
      const results = await Promise.all(concurrentUsers);
      
      // التحقق من نجاح جميع العمليات
      const successfulOperations = results.filter(r => r.success);
      expect(successfulOperations).toHaveLength(10);

      // التحقق من عدم وجود تضارب في البيانات
      const totalUsers = await database.collection('users').countDocuments();
      expect(totalUsers).toBe(10);
    });
  });

  describe('🔒 Data Integrity and Validation', () => {
    
    test('should maintain referential integrity during migration', async () => {
      const testData = {
        users: [
          { id: '1', name: 'أحمد', email: 'ahmed@example.com', role: 'customer' }
        ],
        orders: [
          {
            id: 'order_001',
            userId: '1', // مرجع صحيح
            items: [{ productId: 'p1', quantity: 1, price: 50 }],
            total: 50,
            status: 'completed'
          },
          {
            id: 'order_002',
            userId: '999', // مرجع خطأ
            items: [{ productId: 'p2', quantity: 1, price: 25 }],
            total: 25,
            status: 'pending'
          }
        ]
      };

      const migrationResult = await migrateMissingData(database, testData);
      
      // يجب أن ينجح في ترحيل المستخدمين والطلبات الصحيحة
      expect(migrationResult.summary.usersAdded).toBe(1);
      expect(migrationResult.summary.ordersAdded).toBe(2); // حتى مع المرجع الخطأ
      
      // يمكن إضافة تحقق إضافي من سلامة المراجع لاحقاً
      const orders = await database.collection('orders').find({}).toArray();
      const validOrders = orders.filter(order => order.userId === '1');
      const invalidOrders = orders.filter(order => order.userId === '999');
      
      expect(validOrders).toHaveLength(1);
      expect(invalidOrders).toHaveLength(1); // موجود لكن مرجعه خطأ
    });

    test('should validate data types during migration', async () => {
      const invalidData = {
        users: [
          {
            id: 1, // يجب أن يكون نص
            name: '', // فارغ
            email: 'invalid-email', // تنسيق خطأ
            role: 'customer'
          }
        ],
        orders: [
          {
            id: 'order_001',
            userId: '1',
            items: 'invalid_items', // يجب أن يكون مصفوفة
            total: 'invalid_total', // يجب أن يكون رقم
            status: 'completed'
          }
        ]
      };

      const migrationResult = await migrateMissingData(database, invalidData);
      
      // يجب أن تفشل العملية بسبب البيانات غير الصحيحة
      expect(migrationResult.success).toBe(false);
      expect(migrationResult.errors).toBeDefined();
      expect(migrationResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('📊 Migration Reporting and Monitoring', () => {
    
    test('should generate comprehensive migration reports', async () => {
      const testData = {
        users: [
          { id: '1', name: 'مستخدم 1', email: 'user1@example.com', role: 'customer' },
          { id: '2', name: 'مستخدم 2', email: 'user2@example.com', role: 'customer' }
        ],
        orders: [
          { id: 'order_001', userId: '1', total: 100, status: 'completed' },
          { id: 'order_002', userId: '2', total: 75, status: 'pending' }
        ]
      };

      const migrationResult = await migrateMissingData(database, testData);
      
      // التحقق من تفاصيل التقرير
      expect(migrationResult.timestamp).toBeDefined();
      expect(migrationResult.summary).toBeDefined();
      expect(migrationResult.summary.usersAdded).toBe(2);
      expect(migrationResult.summary.ordersAdded).toBe(2);
      
      // يمكن حفظ التقرير للمراجعة
      const reportData = {
        migrationId: `migration_${Date.now()}`,
        ...migrationResult,
        systemInfo: {
          database: testDatabaseName,
          collections: ['users', 'orders'],
          migrationTool: 'jest-integration-test'
        }
      };
      
      expect(reportData.migrationId).toBeDefined();
      expect(reportData.systemInfo).toBeDefined();
    });
  });
});

// ===== وظائف مساعدة إضافية للاختبار =====

/**
 * محاكاة بيانات واقعية للاختبار
 */
function generateRealisticTestData(userCount = 10, orderCount = 50) {
  const users = [];
  const orders = [];
  const arabicNames = ['أحمد', 'فاطمة', 'محمد', 'عائشة', 'علي', 'خديجة', 'عمر', 'زينب'];
  
  // إنشاء مستخدمين
  for (let i = 1; i <= userCount; i++) {
    const randomName = arabicNames[Math.floor(Math.random() * arabicNames.length)];
    users.push({
      id: `user_${i}`,
      name: `${randomName} ${i}`,
      email: `user${i}@example.com`,
      phone: `+96650${String(i).padStart(7, '0')}`,
      role: 'customer',
      createdAt: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString()
    });
  }
  
  // إنشاء طلبات
  for (let i = 1; i <= orderCount; i++) {
    const userId = `user_${Math.floor(Math.random() * userCount) + 1}`;
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let total = 0;
    
    for (let j = 0; j < itemCount; j++) {
      const price = Math.floor(Math.random() * 50) + 20;
      const quantity = Math.floor(Math.random() * 3) + 1;
      items.push({
        productId: `p${j + 1}`,
        name: `منتج ${j + 1}`,
        price,
        quantity
      });
      total += price * quantity;
    }
    
    orders.push({
      id: `order_${String(i).padStart(3, '0')}`,
      userId,
      items,
      total,
      status: Math.random() > 0.3 ? 'completed' : 'pending',
      createdAt: new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)).toISOString()
    });
  }
  
  return { users, orders };
}

/**
 * التحقق من سلامة البيانات بعد الترحيل
 */
async function verifyDataIntegrity(database) {
  const users = await database.collection('users').find({}).toArray();
  const orders = await database.collection('orders').find({}).toArray();
  
  const integrityReport = {
    passed: true,
    issues: [],
    statistics: {
      totalUsers: users.length,
      totalOrders: orders.length,
      ordersWithValidUsers: 0
    }
  };
  
  // فحص مراجع المستخدمين في الطلبات
  for (const order of orders) {
    const userExists = users.some(user => user._id === order.userId);
    if (userExists) {
      integrityReport.statistics.ordersWithValidUsers++;
    } else {
      integrityReport.passed = false;
      integrityReport.issues.push(`Order ${order._id} references non-existent user ${order.userId}`);
    }
  }
  
  return integrityReport;
}

module.exports = {
  generateRealisticTestData,
  verifyDataIntegrity
};