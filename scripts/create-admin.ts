import connectDB from '../lib/mongodb';
import User from '../models/User';

async function createAdmin() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const adminPhone = '97654369';
    const adminEmail = 'samer.q81@gmail.com';
    const adminName = 'Samer Admin';

    // تحقق ما إذا كان المسؤول موجوداً
    const existingAdmin = await User.findOne({ phone: adminPhone });
    
    if (existingAdmin) {
      console.log('⚠️ Admin already exists:', existingAdmin);
      console.log('   Phone:', existingAdmin.phone);
      console.log('   Email:', existingAdmin.email);
      console.log('   Is Admin:', existingAdmin.isAdmin);
      process.exit(0);
    }

    // إنشاء حساب الأدمن
    const admin = new User({
      phone: adminPhone,
      email: adminEmail.toLowerCase(),
      name: adminName,
      isAdmin: true,
      isActive: true,
    });

    await admin.save();
    console.log('✅ Admin created successfully:');
    console.log('   Phone:', adminPhone);
    console.log('   Email:', adminEmail);
    console.log('   Name:', adminName);
    console.log('   Role: admin');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();