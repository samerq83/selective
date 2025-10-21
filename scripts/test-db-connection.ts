import connectDB from '../lib/mongodb';

async function testConnection() {
  try {
    console.log('🔄 جاري الاتصال بقاعدة البيانات MongoDB Atlas...');
    const mongoose = await connectDB();
    
    // اختبار الاتصال بإرسال أمر ping
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection is not available');
    }
    const adminDb = db.admin();
    const result = await adminDb.ping();
    
    console.log('✅ تم الاتصال بنجاح بقاعدة البيانات MongoDB Atlas!');
    console.log('📊 معلومات الاتصال:');
    console.log(`- اسم قاعدة البيانات: ${db.databaseName}`);
    console.log(`- حالة الاتصال: ${mongoose.connection.readyState === 1 ? 'متصل' : 'غير متصل'}`);
    console.log(`- نتيجة الاختبار: ${JSON.stringify(result)}`);
    
    // إغلاق الاتصال
    await mongoose.connection.close();
    console.log('🔒 تم إغلاق الاتصال بقاعدة البيانات');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ حدث خطأ أثناء الاتصال بقاعدة البيانات:', error);
    process.exit(1);
  }
}

testConnection();