const { MongoClient, ServerApiVersion } = require('mongodb');
const bcrypt = require('bcryptjs');

// استخدام رابط الاتصال من المتغيرات البيئية أو استخدام الرابط المقدم مباشرة
const uri = process.env.MONGODB_URI || "mongodb+srv://mr000000_db_user:zohwlq0wOWpwihaK@cluster0.wv2o5h4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// إنشاء عميل MongoDB مع خيارات الاتصال
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function seed() {
  try {
    console.log('🔄 جاري الاتصال بقاعدة البيانات MongoDB Atlas...');
    
    // الاتصال بالخادم
    await client.connect();
    
    // إرسال أمر ping للتأكد من نجاح الاتصال
    await client.db("admin").command({ ping: 1 });
    console.log("✅ تم الاتصال بنجاح بقاعدة البيانات MongoDB Atlas!");
    
    // الوصول إلى قاعدة البيانات
    const db = client.db("selective-trading");
    console.log(`📊 تم الوصول إلى قاعدة البيانات: ${db.databaseName}`);
    
    // إنشاء المجموعات إذا لم تكن موجودة
    const collections = ['users', 'products', 'orders', 'favoriteOrders', 'notifications', 'settings'];
    for (const collName of collections) {
      const exists = await db.listCollections({ name: collName }).hasNext();
      if (!exists) {
        await db.createCollection(collName);
        console.log(`✅ تم إنشاء مجموعة: ${collName}`);
      } else {
        console.log(`ℹ️ مجموعة ${collName} موجودة بالفعل`);
      }
    }
    
    // إنشاء المسؤول الرئيسي
    const adminPhone = process.env.ADMIN_PHONE || '+966501234567';
    const usersCollection = db.collection('users');
    
    const adminExists = await usersCollection.findOne({ phone: adminPhone });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await usersCollection.insertOne({
        name: 'مدير النظام',
        phone: adminPhone,
        email: 'admin@selective-trading.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ تم إنشاء حساب المسؤول الرئيسي');
    } else {
      console.log('ℹ️ حساب المسؤول موجود بالفعل');
    }
    
    // إنشاء المنتجات الافتراضية
    const productsCollection = db.collection('products');
    const productsCount = await productsCollection.countDocuments();
    
    if (productsCount === 0) {
      const products = [
        { name: 'حليب لوز', nameEn: 'Almond Milk', price: 15, isAvailable: true, image: '/images/almond.jpg', createdAt: new Date(), updatedAt: new Date() },
        { name: 'حليب جوز الهند', nameEn: 'Coconut Milk', price: 18, isAvailable: true, image: '/images/coconut.jpg', createdAt: new Date(), updatedAt: new Date() },
        { name: 'حليب الشوفان', nameEn: 'Oat Milk', price: 12, isAvailable: true, image: '/images/oat.jpg', createdAt: new Date(), updatedAt: new Date() },
        { name: 'حليب الصويا', nameEn: 'Soy Milk', price: 14, isAvailable: true, image: '/images/soy.jpg', createdAt: new Date(), updatedAt: new Date() },
        { name: 'حليب خالي اللاكتوز', nameEn: 'Lactose-Free Milk', price: 16, isAvailable: true, image: '/images/lactose.jpg', createdAt: new Date(), updatedAt: new Date() },
      ];
      
      await productsCollection.insertMany(products);
      console.log('✅ تم إنشاء المنتجات الافتراضية');
    } else {
      console.log('ℹ️ المنتجات موجودة بالفعل');
    }
    
    // إنشاء إعدادات النظام
    const settingsCollection = db.collection('settings');
    const settingsExist = await settingsCollection.findOne({});
    
    if (!settingsExist) {
      await settingsCollection.insertOne({
        orderEditTimeLimit: 2, // ساعتين
        maintenanceMode: false,
        autoArchiveOrders: 30, // 30 يوم
        notificationSound: true,
        maxFavoriteTemplates: 10,
        minOrderQuantity: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ تم إنشاء إعدادات النظام');
    } else {
      console.log('ℹ️ إعدادات النظام موجودة بالفعل');
    }
    
    console.log('✅ تمت تهيئة قاعدة البيانات بنجاح!');
    
  } finally {
    // التأكد من إغلاق الاتصال عند الانتهاء/حدوث خطأ
    await client.close();
    console.log('🔒 تم إغلاق الاتصال بقاعدة البيانات');
  }
}

seed().catch(error => {
  console.error('❌ حدث خطأ أثناء تهيئة قاعدة البيانات:', error);
  process.exit(1);
});