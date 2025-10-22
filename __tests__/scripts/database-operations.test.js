/**
 * اختبارات عمليات قاعدة البيانات - Database Operations Tests
 * 
 * تغطي هذه الاختبارات:
 * - إنشاء وإدارة المستخدمين الإداريين
 * - مزامنة المنتجات
 * - اختبار الاتصالات
 * - عمليات البذر (Seeding)
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// إعداد متغيرات الاختبار
let mongoServer;
let mongoClient;
let database;
const testDatabaseName = 'selective_trading_ops_test';

describe('🗄️ Database Operations Tests', () => {

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    database = mongoClient.db(testDatabaseName);
    process.env.MONGODB_URI = mongoUri + testDatabaseName;
  });

  afterEach(async () => {
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

  describe('👤 Admin User Creation', () => {
    
    test('should create admin user with encrypted password', async () => {
      const adminData = {
        name: 'أحمد الإداري',
        email: 'admin@selective.com',
        password: 'AdminPass123!',
        phone: '+966501234567'
      };

      const result = await createAdminUser(database, adminData);
      
      expect(result.success).toBe(true);
      expect(result.userId).toBeDefined();

      // التحقق من البيانات في قاعدة البيانات
      const admin = await database.collection('users').findOne({ email: adminData.email });
      expect(admin).toBeDefined();
      expect(admin.role).toBe('admin');
      expect(admin.name).toBe(adminData.name);
      expect(admin.password).not.toBe(adminData.password); // يجب أن تكون مشفرة
      
      // التحقق من تشفير كلمة المرور
      const isPasswordValid = await bcrypt.compare(adminData.password, admin.password);
      expect(isPasswordValid).toBe(true);
    });

    test('should prevent duplicate admin emails', async () => {
      const adminData = {
        name: 'أحمد الأول',
        email: 'admin@selective.com',
        password: 'AdminPass123!'
      };

      // إنشاء المدير الأول
      await createAdminUser(database, adminData);

      // محاولة إنشاء مدير ثاني بنفس البريد
      const duplicateAdminData = {
        name: 'أحمد الثاني',
        email: 'admin@selective.com',
        password: 'DifferentPass123!'
      };

      const result = await createAdminUser(database, duplicateAdminData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('email already exists');
    });

    test('should validate admin data before creation', async () => {
      const invalidAdminData = {
        name: '',
        email: 'invalid-email',
        password: '123' // كلمة مرور ضعيفة
      };

      const result = await createAdminUser(database, invalidAdminData);
      
      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors.length).toBeGreaterThan(0);
    });
  });

  describe('🛍️ Products Synchronization', () => {
    
    test('should sync products from JSON to MongoDB', async () => {
      const jsonProducts = [
        {
          id: '1',
          name_ar: 'حليب لوز',
          name_en: 'Almond Milk',
          price: 25,
          category: 'dairy',
          status: 'active',
          image: '/uploads/almond.jpg'
        },
        {
          id: '2',
          name_ar: 'حليب شوفان',
          name_en: 'Oat Milk',
          price: 30,
          category: 'dairy',
          status: 'active',
          image: '/uploads/oat.jpg'
        }
      ];

      const syncResult = await syncProducts(database, jsonProducts);
      
      expect(syncResult.success).toBe(true);
      expect(syncResult.summary.added).toBe(2);
      expect(syncResult.summary.updated).toBe(0);

      // التحقق من المنتجات في قاعدة البيانات
      const products = await database.collection('products').find({}).toArray();
      expect(products).toHaveLength(2);
      
      const almondMilk = products.find(p => p._id === '1');
      expect(almondMilk.name_ar).toBe('حليب لوز');
      expect(almondMilk.price).toBe(25);
    });

    test('should update existing products during sync', async () => {
      // إنشاء منتج موجود
      await database.collection('products').insertOne({
        _id: '1',
        name_ar: 'حليب لوز قديم',
        name_en: 'Old Almond Milk',
        price: 20,
        category: 'dairy',
        status: 'active'
      });

      // بيانات محدثة
      const updatedProducts = [{
        id: '1',
        name_ar: 'حليب لوز محدث',
        name_en: 'Updated Almond Milk',
        price: 25,
        category: 'dairy',
        status: 'active',
        image: '/uploads/almond-new.jpg'
      }];

      const syncResult = await syncProducts(database, updatedProducts);
      
      expect(syncResult.success).toBe(true);
      expect(syncResult.summary.added).toBe(0);
      expect(syncResult.summary.updated).toBe(1);

      // التحقق من التحديث
      const updatedProduct = await database.collection('products').findOne({ _id: '1' });
      expect(updatedProduct.name_ar).toBe('حليب لوز محدث');
      expect(updatedProduct.price).toBe(25);
      expect(updatedProduct.image).toBe('/uploads/almond-new.jpg');
    });

    test('should handle product validation errors', async () => {
      const invalidProducts = [
        {
          id: '1',
          // name_ar مفقود - خطأ
          name_en: 'Invalid Product',
          price: -10, // سعر سالب - خطأ
          category: 'invalid-category'
        }
      ];

      const syncResult = await syncProducts(database, invalidProducts);
      
      expect(syncResult.success).toBe(false);
      expect(syncResult.errors).toBeDefined();
      expect(syncResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('🌱 Database Seeding', () => {
    
    test('should seed database with initial data', async () => {
      const seedData = {
        users: [
          {
            name: 'عميل تجريبي',
            email: 'customer@test.com',
            role: 'customer',
            password: 'password123'
          }
        ],
        products: [
          {
            name_ar: 'منتج تجريبي',
            name_en: 'Test Product',
            price: 50,
            category: 'dairy',
            status: 'active'
          }
        ],
        orders: [
          {
            userId: 'generated_user_id',
            items: [{ productId: 'generated_product_id', quantity: 1 }],
            total: 50,
            status: 'completed'
          }
        ]
      };

      const seedResult = await seedDatabase(database, seedData);
      
      expect(seedResult.success).toBe(true);
      expect(seedResult.summary.usersSeeded).toBe(1);
      expect(seedResult.summary.productsSeeded).toBe(1);
      expect(seedResult.summary.ordersSeeded).toBe(1);

      // التحقق من البيانات المزروعة
      const usersCount = await database.collection('users').countDocuments();
      const productsCount = await database.collection('products').countDocuments();
      const ordersCount = await database.collection('orders').countDocuments();
      
      expect(usersCount).toBe(1);
      expect(productsCount).toBe(1);
      expect(ordersCount).toBe(1);
    });

    test('should not duplicate data during re-seeding', async () => {
      const seedData = {
        users: [{
          name: 'مستخدم ثابت',
          email: 'stable@test.com',
          role: 'customer',
          password: 'password123'
        }]
      };

      // بذر أول
      await seedDatabase(database, seedData);
      
      // بذر ثاني بنفس البيانات
      const secondSeedResult = await seedDatabase(database, seedData);
      
      expect(secondSeedResult.success).toBe(true);
      expect(secondSeedResult.summary.duplicatesSkipped).toBeGreaterThan(0);

      // التحقق من عدم تكرار البيانات
      const usersCount = await database.collection('users').countDocuments();
      expect(usersCount).toBe(1);
    });
  });

  describe('🔗 Connection Testing', () => {
    
    test('should test successful database connection', async () => {
      const connectionTest = await testDatabaseConnection();
      
      expect(connectionTest.success).toBe(true);
      expect(connectionTest.database).toBe(testDatabaseName);
      expect(connectionTest.responseTime).toBeGreaterThan(0);
      expect(connectionTest.collections).toBeDefined();
    });

    test('should handle connection failures gracefully', async () => {
      const originalUri = process.env.MONGODB_URI;
      process.env.MONGODB_URI = 'mongodb://invalid:27017/test';
      
      const connectionTest = await testDatabaseConnection();
      
      expect(connectionTest.success).toBe(false);
      expect(connectionTest.error).toBeDefined();
      
      process.env.MONGODB_URI = originalUri;
    });

    test('should measure connection performance', async () => {
      const startTime = Date.now();
      const connectionTest = await testDatabaseConnection();
      const endTime = Date.now();
      
      expect(connectionTest.success).toBe(true);
      expect(connectionTest.responseTime).toBeLessThanOrEqual(endTime - startTime);
      expect(connectionTest.responseTime).toBeGreaterThan(0);
    });
  });
});

// ===== وظائف مساعدة للاختبار =====

/**
 * إنشاء مستخدم إداري
 */
async function createAdminUser(database, adminData) {
  try {
    // التحقق من صحة البيانات
    const validationErrors = [];
    
    if (!adminData.name || adminData.name.trim().length === 0) {
      validationErrors.push('Name is required');
    }
    
    if (!adminData.email || !adminData.email.includes('@')) {
      validationErrors.push('Valid email is required');
    }
    
    if (!adminData.password || adminData.password.length < 6) {
      validationErrors.push('Password must be at least 6 characters');
    }
    
    if (validationErrors.length > 0) {
      return {
        success: false,
        validationErrors
      };
    }

    // التحقق من عدم وجود بريد مكرر
    const existingUser = await database.collection('users').findOne({ 
      email: adminData.email 
    });
    
    if (existingUser) {
      return {
        success: false,
        error: 'User with this email already exists'
      };
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    
    // إنشاء المستخدم الإداري
    const adminUser = {
      name: adminData.name.trim(),
      email: adminData.email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'admin',
      phone: adminData.phone,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    const insertResult = await database.collection('users').insertOne(adminUser);
    
    return {
      success: true,
      userId: insertResult.insertedId,
      message: 'Admin user created successfully'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * مزامنة المنتجات
 */
async function syncProducts(database, jsonProducts) {
  try {
    const result = {
      success: false,
      summary: {
        added: 0,
        updated: 0,
        skipped: 0
      },
      errors: []
    };

    for (const jsonProduct of jsonProducts) {
      try {
        // التحقق من صحة البيانات
        if (!jsonProduct.name_ar || !jsonProduct.name_en) {
          throw new Error('Product names in both languages are required');
        }
        
        if (!jsonProduct.price || jsonProduct.price < 0) {
          throw new Error('Valid price is required');
        }

        const existingProduct = await database.collection('products').findOne({ 
          _id: jsonProduct.id 
        });

        const productData = {
          _id: jsonProduct.id,
          name_ar: jsonProduct.name_ar,
          name_en: jsonProduct.name_en,
          price: jsonProduct.price,
          category: jsonProduct.category || 'dairy',
          status: jsonProduct.status || 'active',
          image: jsonProduct.image,
          updatedAt: new Date()
        };

        if (existingProduct) {
          await database.collection('products').updateOne(
            { _id: jsonProduct.id },
            { $set: productData }
          );
          result.summary.updated++;
        } else {
          productData.createdAt = new Date();
          await database.collection('products').insertOne(productData);
          result.summary.added++;
        }
      } catch (error) {
        result.errors.push(`Product ${jsonProduct.id}: ${error.message}`);
      }
    }

    result.success = result.errors.length === 0;
    return result;
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      errors: [error.message]
    };
  }
}

/**
 * بذر قاعدة البيانات
 */
async function seedDatabase(database, seedData) {
  try {
    const result = {
      success: false,
      summary: {
        usersSeeded: 0,
        productsSeeded: 0,
        ordersSeeded: 0,
        duplicatesSkipped: 0
      }
    };

    // بذر المستخدمين
    if (seedData.users) {
      for (const user of seedData.users) {
        const existingUser = await database.collection('users').findOne({ 
          email: user.email 
        });
        
        if (!existingUser) {
          const hashedPassword = await bcrypt.hash(user.password, 10);
          await database.collection('users').insertOne({
            ...user,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          result.summary.usersSeeded++;
        } else {
          result.summary.duplicatesSkipped++;
        }
      }
    }

    // بذر المنتجات
    if (seedData.products) {
      for (const product of seedData.products) {
        const existingProduct = await database.collection('products').findOne({ 
          name_ar: product.name_ar 
        });
        
        if (!existingProduct) {
          await database.collection('products').insertOne({
            ...product,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          result.summary.productsSeeded++;
        } else {
          result.summary.duplicatesSkipped++;
        }
      }
    }

    // بذر الطلبات
    if (seedData.orders) {
      for (const order of seedData.orders) {
        await database.collection('orders').insertOne({
          ...order,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        result.summary.ordersSeeded++;
      }
    }

    result.success = true;
    return result;
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * اختبار اتصال قاعدة البيانات
 */
async function testDatabaseConnection() {
  const startTime = Date.now();
  
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    
    const database = client.db();
    const collections = await database.listCollections().toArray();
    
    const endTime = Date.now();
    
    const result = {
      success: true,
      database: database.databaseName,
      responseTime: endTime - startTime,
      collections: collections.map(c => c.name),
      timestamp: new Date().toISOString()
    };

    await client.close();
    return result;
    
  } catch (error) {
    const endTime = Date.now();
    
    return {
      success: false,
      error: error.message,
      responseTime: endTime - startTime,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  createAdminUser,
  syncProducts,
  seedDatabase,
  testDatabaseConnection
};