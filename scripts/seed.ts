import connectDB from '../lib/mongodb';
import User from '../models/User';
import Product from '../models/Product';
import Settings from '../models/Settings';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    // اتصال بقاعدة البيانات
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // إنشاء المسؤول الرئيسي
    const adminPhone = process.env.ADMIN_PHONE || '+966501234567';
    const adminExists = await User.findOne({ phone: adminPhone });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = new User({
        name: 'مدير النظام',
        phone: adminPhone,
        email: 'admin@selective-trading.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true,
      });
      
      await admin.save();
      console.log('✅ Admin user created');
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    // إنشاء المنتجات الافتراضية
    const products = [
      { name: 'حليب لوز', nameEn: 'Almond Milk', price: 15, isAvailable: true, image: '/images/almond.jpg' },
      { name: 'حليب جوز الهند', nameEn: 'Coconut Milk', price: 18, isAvailable: true, image: '/images/coconut.jpg' },
      { name: 'حليب الشوفان', nameEn: 'Oat Milk', price: 12, isAvailable: true, image: '/images/oat.jpg' },
      { name: 'حليب الصويا', nameEn: 'Soy Milk', price: 14, isAvailable: true, image: '/images/soy.jpg' },
      { name: 'حليب خالي اللاكتوز', nameEn: 'Lactose-Free Milk', price: 16, isAvailable: true, image: '/images/lactose.jpg' },
    ];

    const productsCount = await Product.countDocuments();
    if (productsCount === 0) {
      await Product.insertMany(products);
      console.log('✅ Default products created');
    } else {
      console.log('ℹ️ Products already exist');
    }

    // إنشاء إعدادات النظام
    const settingsExist = await Settings.findOne();
    if (!settingsExist) {
      const settings = new Settings({
        orderEditTimeLimit: 2, // ساعتين
        maintenanceMode: false,
        autoArchiveOrders: 30, // 30 يوم
        notificationSound: true,
        maxFavoriteTemplates: 10,
        minOrderQuantity: 2,
      });
      
      await settings.save();
      console.log('✅ System settings created');
    } else {
      console.log('ℹ️ System settings already exist');
    }

    console.log('✅ Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();