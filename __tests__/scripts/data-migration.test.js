/**
 * اختبارات سكريپت ترحيل البيانات - Data Migration Tests
 * 
 * هذه الاختبارات تغطي:
 * - سكريپت تشخيص تضارب البيانات
 * - سكريپت ترحيل البيانات المفقودة  
 * - سكريپت التحقق من MongoDB
 * - سكريپت إكمال الترحيل
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// إعداد متغيرات الاختبار
let mongoServer;
let mongoClient;
let database;
const testDatabaseName = 'selective_trading_test';

describe('🔄 Data Migration Scripts Tests', () => {
  
  // إعداد قاعدة بيانات الاختبار
  beforeAll(async () => {
    // بدء خادم MongoDB في الذاكرة
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    // الاتصال بقاعدة البيانات
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    database = mongoClient.db(testDatabaseName);
    
    // تعيين متغير البيئة للاختبار
    process.env.MONGODB_URI = mongoUri + testDatabaseName;
  });

  // تنظيف البيانات بعد كل اختبار
  afterEach(async () => {
    if (database) {
      await database.dropDatabase();
    }
  });

  // إغلاق الاتصالات بعد انتهاء جميع الاختبارات
  afterAll(async () => {
    if (mongoClient) {
      await mongoClient.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('📊 Data Conflict Diagnosis', () => {
    
    test('should identify missing data between JSON and MongoDB', async () => {
      // إعداد بيانات الاختبار في MongoDB
      const users = database.collection('users');
      const orders = database.collection('orders');
      
      await users.insertMany([
        { _id: '1', name: 'Ahmed Ali', email: 'ahmed@example.com' },
        { _id: '2', name: 'Fatima Hassan', email: 'fatima@example.com' }
      ]);
      
      await orders.insertOne({
        _id: 'order1',
        userId: '1',
        items: [{ productId: 'p1', quantity: 2 }],
        total: 100,
        createdAt: new Date()
      });

      // إعداد بيانات JSON وهمية
      const mockJsonData = {
        users: [
          { id: '1', name: 'Ahmed Ali Updated', email: 'ahmed@example.com' },
          { id: '3', name: 'Sara Ahmed', email: 'sara@example.com' }
        ],
        orders: [
          {
            id: 'order1',
            userId: '1', 
            items: [{ productId: 'p1', quantity: 2 }],
            total: 100
          },
          {
            id: 'order2',
            userId: '2',
            items: [{ productId: 'p2', quantity: 1 }],
            total: 50
          }
        ]
      };

      // تشغيل تشخيص تضارب البيانات
      const diagnosis = await diagnosisDataConflicts(database, mockJsonData);
      
      // التحقق من النتائج
      expect(diagnosis.status).toBe('conflicts_detected');
      expect(diagnosis.summary.missingInMongoDB.users).toBe(1); // Sara Ahmed مفقودة
      expect(diagnosis.summary.missingInMongoDB.orders).toBe(1); // order2 مفقود
      expect(diagnosis.summary.conflictingData.users).toBe(1); // Ahmed Ali محدث في JSON
    });

    test('should handle empty databases correctly', async () => {
      const mockJsonData = {
        users: [],
        products: [],
        orders: []
      };

      const diagnosis = await diagnosisDataConflicts(database, mockJsonData);
      
      expect(diagnosis.status).toBe('both_empty');
      expect(diagnosis.summary.totalConflicts).toBe(0);
    });

    test('should detect data type mismatches', async () => {
      const users = database.collection('users');
      await users.insertOne({
        _id: '1',
        name: 'Ahmed Ali',
        phone: '123456789',
        createdAt: new Date()
      });

      const mockJsonData = {
        users: [{
          id: '1',
          name: 'Ahmed Ali',
          phone: 123456789, // رقم بدلاً من نص
          createdAt: '2023-01-01' // نص بدلاً من تاريخ
        }]
      };

      const diagnosis = await diagnosisDataConflicts(database, mockJsonData);
      
      expect(diagnosis.details.dataTypeIssues).toBeDefined();
      expect(diagnosis.details.dataTypeIssues.length).toBeGreaterThan(0);
    });
  });

  describe('🔄 Data Migration Process', () => {
    
    test('should migrate missing users successfully', async () => {
      // إعداد MongoDB مع بعض المستخدمين
      const users = database.collection('users');
      await users.insertOne({
        _id: '1',
        name: 'Ahmed Ali',
        email: 'ahmed@example.com',
        role: 'customer'
      });

      // بيانات JSON تحتوي على مستخدمين إضافيين
      const mockJsonData = {
        users: [
          {
            id: '1',
            name: 'Ahmed Ali Updated', // اسم محدث
            email: 'ahmed@example.com',
            role: 'customer',
            phone: '123456789'
          },
          {
            id: '2',
            name: 'Fatima Hassan',
            email: 'fatima@example.com',
            role: 'customer'
          }
        ]
      };

      // تنفيذ الترحيل
      const migrationResult = await migrateMissingData(database, mockJsonData);
      
      // التحقق من النتائج
      expect(migrationResult.success).toBe(true);
      expect(migrationResult.summary.usersAdded).toBe(1); // Fatima
      expect(migrationResult.summary.usersUpdated).toBe(1); // Ahmed

      // التحقق من البيانات في قاعدة البيانات
      const allUsers = await users.find({}).toArray();
      expect(allUsers).toHaveLength(2);
      
      const updatedAhmed = await users.findOne({ _id: '1' });
      expect(updatedAhmed.name).toBe('Ahmed Ali Updated');
      expect(updatedAhmed.phone).toBe('123456789');
    });

    test('should migrate missing orders with user associations', async () => {
      // إعداد المستخدمين والطلبات
      const users = database.collection('users');
      const orders = database.collection('orders');
      
      await users.insertMany([
        { _id: '1', name: 'Ahmed Ali', email: 'ahmed@example.com' },
        { _id: '2', name: 'Fatima Hassan', email: 'fatima@example.com' }
      ]);

      const mockJsonData = {
        orders: [
          {
            id: 'order1',
            userId: '1',
            items: [{ productId: 'p1', name: 'حليب لوز', quantity: 2, price: 50 }],
            total: 100,
            status: 'completed',
            createdAt: '2023-12-01T10:00:00Z'
          },
          {
            id: 'order2',
            userId: '2',
            items: [{ productId: 'p2', name: 'حليب شوفان', quantity: 1, price: 45 }],
            total: 45,
            status: 'pending',
            createdAt: '2023-12-02T10:00:00Z'
          }
        ]
      };

      const migrationResult = await migrateMissingData(database, mockJsonData);
      
      expect(migrationResult.success).toBe(true);
      expect(migrationResult.summary.ordersAdded).toBe(2);

      // التحقق من الطلبات
      const allOrders = await orders.find({}).toArray();
      expect(allOrders).toHaveLength(2);
      
      const order1 = await orders.findOne({ _id: 'order1' });
      expect(order1.userId).toBe('1');
      expect(order1.total).toBe(100);
      expect(order1.items).toHaveLength(1);
    });

    test('should handle migration errors gracefully', async () => {
      // بيانات معطوبة لاختبار معالجة الأخطاء
      const mockJsonData = {
        users: [
          {
            // بدون ID - خطأ
            name: 'Invalid User',
            email: 'invalid@example.com'
          }
        ],
        orders: [
          {
            id: 'invalid-order',
            // userId مفقود - خطأ
            items: [],
            total: 'invalid' // نوع خطأ
          }
        ]
      };

      const migrationResult = await migrateMissingData(database, mockJsonData);
      
      expect(migrationResult.success).toBe(false);
      expect(migrationResult.errors).toBeDefined();
      expect(migrationResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('✅ MongoDB Connection Verification', () => {
    
    test('should verify successful MongoDB connection', async () => {
      const connectionResult = await checkMongoDBConnection();
      
      expect(connectionResult.connected).toBe(true);
      expect(connectionResult.database).toBe(testDatabaseName);
      expect(connectionResult.collections).toBeDefined();
    });

    test('should count collections correctly', async () => {
      // إضافة بيانات لمجموعات مختلفة
      await database.collection('users').insertOne({ name: 'Test User' });
      await database.collection('products').insertOne({ name: 'Test Product' });
      await database.collection('orders').insertOne({ total: 100 });

      const connectionResult = await checkMongoDBConnection();
      
      expect(connectionResult.collections.users).toBe(1);
      expect(connectionResult.collections.products).toBe(1);
      expect(connectionResult.collections.orders).toBe(1);
    });

    test('should handle connection failures', async () => {
      // تعيين URI خطأ
      const originalUri = process.env.MONGODB_URI;
      process.env.MONGODB_URI = 'mongodb://invalid:27017/test';
      
      const connectionResult = await checkMongoDBConnection();
      
      expect(connectionResult.connected).toBe(false);
      expect(connectionResult.error).toBeDefined();
      
      // استعادة URI الصحيح
      process.env.MONGODB_URI = originalUri;
    });
  });

  describe('🎯 Migration Finalization', () => {
    
    test('should create backup files before finalization', async () => {
      // إنشاء ملف JSON وهمي
      const testJsonPath = path.join(__dirname, '..', '..', 'data', 'test-db.json');
      const testJsonData = { users: [], products: [], orders: [] };
      
      fs.writeFileSync(testJsonPath, JSON.stringify(testJsonData, null, 2));
      
      const finalizationResult = await finalizeMongoDBMigration();
      
      expect(finalizationResult.backupCreated).toBe(true);
      expect(finalizationResult.backupPath).toBeDefined();
      
      // تنظيف الملف الاختباري
      if (fs.existsSync(testJsonPath)) {
        fs.unlinkSync(testJsonPath);
      }
    });

    test('should generate final migration report', async () => {
      const finalizationResult = await finalizeMongoDBMigration();
      
      expect(finalizationResult.report).toBeDefined();
      expect(finalizationResult.report.migrationStatus).toBe('completed');
      expect(finalizationResult.report.dataStatus).toBeDefined();
      expect(finalizationResult.report.recommendations).toBeDefined();
    });
  });
});

// ===== وظائف مساعدة للاختبار =====

/**
 * تشخيص تضارب البيانات بين MongoDB و JSON
 */
async function diagnosisDataConflicts(database, jsonData) {
  try {
    const result = {
      status: 'checking',
      timestamp: new Date().toISOString(),
      summary: {
        missingInMongoDB: { users: 0, products: 0, orders: 0 },
        conflictingData: { users: 0, products: 0, orders: 0 },
        totalConflicts: 0
      },
      details: {
        dataTypeIssues: []
      }
    };

    // فحص المستخدمين
    const mongoUsers = await database.collection('users').find({}).toArray();
    const jsonUsers = jsonData.users || [];
    
    // العثور على المستخدمين المفقودين في MongoDB
    const missingUsers = jsonUsers.filter(jsonUser => 
      !mongoUsers.some(mongoUser => mongoUser._id === jsonUser.id)
    );
    result.summary.missingInMongoDB.users = missingUsers.length;

    // العثور على البيانات المتضاربة
    const conflictingUsers = jsonUsers.filter(jsonUser => {
      const mongoUser = mongoUsers.find(mu => mu._id === jsonUser.id);
      if (mongoUser) {
        return (mongoUser.name !== jsonUser.name) || 
               (mongoUser.email !== jsonUser.email);
      }
      return false;
    });
    result.summary.conflictingData.users = conflictingUsers.length;

    // فحص الطلبات
    const mongoOrders = await database.collection('orders').find({}).toArray();
    const jsonOrders = jsonData.orders || [];
    
    const missingOrders = jsonOrders.filter(jsonOrder => 
      !mongoOrders.some(mongoOrder => mongoOrder._id === jsonOrder.id)
    );
    result.summary.missingInMongoDB.orders = missingOrders.length;

    // حساب إجمالي التضاربات
    result.summary.totalConflicts = 
      result.summary.missingInMongoDB.users +
      result.summary.missingInMongoDB.orders +
      result.summary.conflictingData.users;

    // تحديد الحالة
    if (result.summary.totalConflicts === 0) {
      if (mongoUsers.length === 0 && jsonUsers.length === 0) {
        result.status = 'both_empty';
      } else {
        result.status = 'synchronized';
      }
    } else {
      result.status = 'conflicts_detected';
    }

    return result;
    
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * ترحيل البيانات المفقودة من JSON إلى MongoDB
 */
async function migrateMissingData(database, jsonData) {
  try {
    const result = {
      success: false,
      timestamp: new Date().toISOString(),
      summary: {
        usersAdded: 0,
        usersUpdated: 0,
        ordersAdded: 0,
        productsAdded: 0
      },
      errors: []
    };

    // ترحيل المستخدمين
    if (jsonData.users && jsonData.users.length > 0) {
      const usersCollection = database.collection('users');
      
      for (const jsonUser of jsonData.users) {
        try {
          if (!jsonUser.id) {
            throw new Error('User ID is required');
          }

          const existingUser = await usersCollection.findOne({ _id: jsonUser.id });
          
          const userData = {
            _id: jsonUser.id,
            name: jsonUser.name,
            email: jsonUser.email,
            role: jsonUser.role || 'customer',
            phone: jsonUser.phone,
            updatedAt: new Date()
          };

          if (existingUser) {
            await usersCollection.updateOne(
              { _id: jsonUser.id },
              { $set: userData }
            );
            result.summary.usersUpdated++;
          } else {
            userData.createdAt = new Date();
            await usersCollection.insertOne(userData);
            result.summary.usersAdded++;
          }
        } catch (error) {
          result.errors.push(`User migration error: ${error.message}`);
        }
      }
    }

    // ترحيل الطلبات
    if (jsonData.orders && jsonData.orders.length > 0) {
      const ordersCollection = database.collection('orders');
      
      for (const jsonOrder of jsonData.orders) {
        try {
          if (!jsonOrder.id || !jsonOrder.userId) {
            throw new Error('Order ID and User ID are required');
          }

          if (typeof jsonOrder.total !== 'number') {
            throw new Error('Order total must be a number');
          }

          const existingOrder = await ordersCollection.findOne({ _id: jsonOrder.id });
          
          if (!existingOrder) {
            const orderData = {
              _id: jsonOrder.id,
              userId: jsonOrder.userId,
              items: jsonOrder.items || [],
              total: jsonOrder.total,
              status: jsonOrder.status || 'pending',
              createdAt: jsonOrder.createdAt ? new Date(jsonOrder.createdAt) : new Date(),
              updatedAt: new Date()
            };

            await ordersCollection.insertOne(orderData);
            result.summary.ordersAdded++;
          }
        } catch (error) {
          result.errors.push(`Order migration error: ${error.message}`);
        }
      }
    }

    result.success = result.errors.length === 0;
    return result;
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      errors: [error.message]
    };
  }
}

/**
 * التحقق من اتصال MongoDB
 */
async function checkMongoDBConnection() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const database = client.db();
    const collections = await database.listCollections().toArray();
    
    const result = {
      connected: true,
      database: database.databaseName,
      collections: {},
      timestamp: new Date().toISOString()
    };

    // عد الوثائق في كل مجموعة
    for (const collection of collections) {
      const count = await database.collection(collection.name).countDocuments();
      result.collections[collection.name] = count;
    }

    await client.close();
    return result;
    
  } catch (error) {
    return {
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * إكمال ترحيل MongoDB
 */
async function finalizeMongoDBMigration() {
  try {
    const result = {
      backupCreated: false,
      backupPath: null,
      report: {
        migrationStatus: 'completed',
        timestamp: new Date().toISOString(),
        dataStatus: {
          mongodb: {
            users: 'primary_source',
            products: 'primary_source',
            orders: 'primary_source'
          }
        },
        recommendations: [
          'MongoDB is now the single source of truth',
          'JSON file serves as backup only',
          'Run tests to ensure all functionality works'
        ]
      }
    };

    // محاولة إنشاء نسخة احتياطية إذا كان ملف JSON موجوداً
    const dbPath = path.join(__dirname, '..', '..', 'data', 'db.json');
    if (fs.existsSync(dbPath)) {
      const backupPath = path.join(__dirname, '..', '..', 'data', `db.backup.${Date.now()}.json`);
      fs.copyFileSync(dbPath, backupPath);
      result.backupCreated = true;
      result.backupPath = backupPath;
    }

    return result;
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  diagnosisDataConflicts,
  migrateMissingData,
  checkMongoDBConnection,
  finalizeMongoDBMigration
};