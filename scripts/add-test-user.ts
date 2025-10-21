import connectDB from '../lib/mongodb';
import User from '../models/User';

async function addTestUser() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const testPhone = '90908041'; // رقم الهاتف الذي يحاول المستخدم الدخول به
    
    // تحقق ما إذا كان المستخدم موجوداً
    const existingUser = await User.findOne({ phone: testPhone });
    
    if (existingUser) {
      console.log('ℹ️ Test user already exists:', existingUser);
      process.exit(0);
    }

    // إنشاء مستخدم اختبار
    const testUser = new User({
      phone: testPhone,
      email: 'test@example.com',
      name: 'Test User',
      companyName: 'Test Company',
      address: 'Test Address',
      isAdmin: false,
      isActive: true,
    });

    await testUser.save();
    console.log('✅ Test user created successfully:');
    console.log('   Phone:', testPhone);
    console.log('   Email: test@example.com');
    console.log('   Name: Test User');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding test user:', error);
    process.exit(1);
  }
}

addTestUser();