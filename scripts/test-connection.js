const { MongoClient, ServerApiVersion } = require('mongodb');

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

async function run() {
  try {
    console.log('🔄 جاري الاتصال بقاعدة البيانات MongoDB Atlas...');
    
    // الاتصال بالخادم
    await client.connect();
    
    // إرسال أمر ping للتأكد من نجاح الاتصال
    await client.db("admin").command({ ping: 1 });
    console.log("✅ تم الاتصال بنجاح بقاعدة البيانات MongoDB Atlas!");
    
    // إنشاء قاعدة البيانات selective-trading إذا لم تكن موجودة
    const db = client.db("selective-trading");
    console.log(`📊 تم الوصول إلى قاعدة البيانات: ${db.databaseName}`);
    
    // التحقق من المجموعات الموجودة
    const collections = await db.listCollections().toArray();
    console.log(`📋 المجموعات الموجودة: ${collections.length > 0 ? collections.map(c => c.name).join(', ') : 'لا توجد مجموعات'}`);
    
  } finally {
    // التأكد من إغلاق الاتصال عند الانتهاء/حدوث خطأ
    await client.close();
    console.log('🔒 تم إغلاق الاتصال بقاعدة البيانات');
  }
}

run().catch(error => {
  console.error('❌ حدث خطأ أثناء الاتصال بقاعدة البيانات:', error);
  process.exit(1);
});