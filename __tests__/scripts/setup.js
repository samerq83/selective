/**
 * إعداد اختبارات السكريپتات - Scripts Tests Setup
 * 
 * هذا الملف يحتوي على:
 * - إعدادات Jest للاختبارات
 * - وظائف مساعدة مشتركة
 * - متغيرات البيئة للاختبار
 * - إعداد قاعدة البيانات الوهمية
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

// إعداد متغيرات البيئة للاختبار
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_for_selective_trading';

// متغيرات عامة للاختبارات
let globalMongoServer;
let globalMongoClient;
let globalDatabase;

/**
 * إعداد قاعدة البيانات العامة للاختبارات
 */
async function setupTestDatabase() {
  try {
    // بدء خادم MongoDB في الذاكرة
    globalMongoServer = await MongoMemoryServer.create({
      instance: {
        port: 27017,
        dbName: 'selective_trading_test'
      }
    });

    const mongoUri = globalMongoServer.getUri();
    console.log(`🔧 Test MongoDB started at: ${mongoUri}`);

    // الاتصال بقاعدة البيانات
    globalMongoClient = new MongoClient(mongoUri);
    await globalMongoClient.connect();
    globalDatabase = globalMongoClient.db('selective_trading_test');

    // تعيين متغير البيئة
    process.env.MONGODB_URI = mongoUri + 'selective_trading_test';

    return {
      mongoServer: globalMongoServer,
      mongoClient: globalMongoClient,
      database: globalDatabase
    };
  } catch (error) {
    console.error('❌ Failed to setup test database:', error);
    throw error;
  }
}

/**
 * تنظيف قاعدة البيانات بعد الاختبارات
 */
async function teardownTestDatabase() {
  try {
    if (globalMongoClient) {
      await globalMongoClient.close();
      console.log('🔌 MongoDB client disconnected');
    }

    if (globalMongoServer) {
      await globalMongoServer.stop();
      console.log('🛑 Test MongoDB server stopped');
    }
  } catch (error) {
    console.error('❌ Error during database teardown:', error);
  }
}

/**
 * مسح جميع المجموعات في قاعدة البيانات
 */
async function clearTestDatabase() {
  if (!globalDatabase) return;

  try {
    const collections = await globalDatabase.listCollections().toArray();
    
    for (const collection of collections) {
      await globalDatabase.collection(collection.name).deleteMany({});
    }
    
    console.log('🧹 Test database cleared');
  } catch (error) {
    console.error('❌ Error clearing test database:', error);
  }
}

/**
 * إنشاء بيانات اختبار أساسية
 */
async function createTestData() {
  if (!globalDatabase) {
    throw new Error('Test database not initialized');
  }

  const testUsers = [
    {
      _id: 'test_user_1',
      name: 'أحمد الاختبار',
      email: 'ahmed.test@example.com',
      role: 'customer',
      phone: '+966501111111',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'test_admin_1',
      name: 'مدير الاختبار',
      email: 'admin.test@example.com',
      role: 'admin',
      phone: '+966502222222',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const testProducts = [
    {
      _id: 'test_product_1',
      name_ar: 'حليب لوز تجريبي',
      name_en: 'Test Almond Milk',
      price: 25,
      category: 'dairy_alternatives',
      status: 'active',
      image: '/uploads/test-almond.jpg',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      _id: 'test_product_2',
      name_ar: 'حليب شوفان تجريبي',
      name_en: 'Test Oat Milk',
      price: 30,
      category: 'dairy_alternatives',
      status: 'active',
      image: '/uploads/test-oat.jpg',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const testOrders = [
    {
      _id: 'test_order_1',
      userId: 'test_user_1',
      items: [
        {
          productId: 'test_product_1',
          name: 'حليب لوز تجريبي',
          quantity: 2,
          price: 25
        }
      ],
      total: 50,
      status: 'completed',
      deliveryDate: '2023-12-15',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // إدراج البيانات التجريبية
  await globalDatabase.collection('users').insertMany(testUsers);
  await globalDatabase.collection('products').insertMany(testProducts);
  await globalDatabase.collection('orders').insertMany(testOrders);

  console.log('📝 Test data created');
  
  return {
    users: testUsers,
    products: testProducts,
    orders: testOrders
  };
}

/**
 * التحقق من حالة قاعدة البيانات
 */
async function checkDatabaseHealth() {
  if (!globalDatabase) {
    return { healthy: false, error: 'Database not initialized' };
  }

  try {
    // محاولة عملية بسيطة للتحقق من الاتصال
    await globalDatabase.admin().ping();
    
    const collections = await globalDatabase.listCollections().toArray();
    const stats = {};
    
    for (const collection of collections) {
      const count = await globalDatabase.collection(collection.name).countDocuments();
      stats[collection.name] = count;
    }
    
    return {
      healthy: true,
      database: globalDatabase.databaseName,
      collections: stats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * إعداد المؤقتات الوهمية للاختبار
 */
function setupFakeTimers() {
  // تعيين تاريخ ثابت للاختبارات
  const FIXED_DATE = new Date('2023-12-01T10:00:00.000Z');
  jest.useFakeTimers();
  jest.setSystemTime(FIXED_DATE);
  
  console.log(`⏰ Fake timers set to: ${FIXED_DATE.toISOString()}`);
}

/**
 * استعادة المؤقتات الحقيقية
 */
function restoreRealTimers() {
  jest.useRealTimers();
  console.log('⏰ Real timers restored');
}

/**
 * إنشاء بيانات JSON وهمية للاختبار
 */
function generateMockJsonData(options = {}) {
  const {
    userCount = 5,
    productCount = 3,
    orderCount = 10
  } = options;

  const users = [];
  const products = [];
  const orders = [];

  // إنشاء مستخدمين وهميين
  for (let i = 1; i <= userCount; i++) {
    users.push({
      id: `mock_user_${i}`,
      name: `مستخدم وهمي ${i}`,
      email: `mock${i}@example.com`,
      phone: `+96650${String(i).padStart(7, '0')}`,
      role: i === 1 ? 'admin' : 'customer',
      createdAt: new Date(2023, 0, i).toISOString()
    });
  }

  // إنشاء منتجات وهمية
  const productNames = [
    { ar: 'حليب لوز وهمي', en: 'Mock Almond Milk' },
    { ar: 'حليب شوفان وهمي', en: 'Mock Oat Milk' },
    { ar: 'حليب جوز هند وهمي', en: 'Mock Coconut Milk' }
  ];

  for (let i = 1; i <= productCount; i++) {
    const nameIndex = (i - 1) % productNames.length;
    products.push({
      id: `mock_product_${i}`,
      name_ar: `${productNames[nameIndex].ar} ${i}`,
      name_en: `${productNames[nameIndex].en} ${i}`,
      price: 20 + (i * 5),
      category: 'dairy_alternatives',
      status: 'active',
      image: `/uploads/mock-product-${i}.jpg`
    });
  }

  // إنشاء طلبات وهمية
  for (let i = 1; i <= orderCount; i++) {
    const userId = `mock_user_${Math.floor(Math.random() * userCount) + 1}`;
    const productId = `mock_product_${Math.floor(Math.random() * productCount) + 1}`;
    const quantity = Math.floor(Math.random() * 3) + 1;
    const price = 20 + (Math.floor(Math.random() * productCount) + 1) * 5;

    orders.push({
      id: `mock_order_${String(i).padStart(3, '0')}`,
      userId,
      items: [{
        productId,
        name: `منتج وهمي ${productId.split('_')[2]}`,
        quantity,
        price
      }],
      total: price * quantity,
      status: Math.random() > 0.3 ? 'completed' : 'pending',
      deliveryDate: new Date(2023, 11, i + 10).toISOString().split('T')[0],
      createdAt: new Date(2023, 10, i).toISOString()
    });
  }

  return { users, products, orders };
}

/**
 * إنشاء تقرير اختبار مخصص
 */
function generateTestReport(testResults) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0
    },
    details: testResults || [],
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      mongodbVersion: 'memory-server',
      testDatabase: globalDatabase?.databaseName
    }
  };

  // حساب الإحصائيات
  if (testResults && Array.isArray(testResults)) {
    report.summary.totalTests = testResults.length;
    report.summary.passedTests = testResults.filter(t => t.status === 'passed').length;
    report.summary.failedTests = testResults.filter(t => t.status === 'failed').length;
    report.summary.skippedTests = testResults.filter(t => t.status === 'skipped').length;
  }

  return report;
}

// تصدير الوظائف المساعدة
module.exports = {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
  createTestData,
  checkDatabaseHealth,
  setupFakeTimers,
  restoreRealTimers,
  generateMockJsonData,
  generateTestReport,
  
  // متغيرات عامة
  getGlobalDatabase: () => globalDatabase,
  getGlobalMongoClient: () => globalMongoClient,
  getGlobalMongoServer: () => globalMongoServer
};

// إعداد معالج الأخطاء العامة للاختبارات
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection in tests:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception in tests:', error);
  process.exit(1);
});