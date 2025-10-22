const mongoose = require('mongoose');

// نماذج مبسطة
const userSchema = new mongoose.Schema({
  phone: String,
  name: String,
  email: String,
  address: String,
  companyName: String,
  isAdmin: Boolean,
  isActive: Boolean,
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
  name: {
    en: String,
    ar: String
  },
  slug: String,
  image: String,
  isAvailable: Boolean,
  order: Number,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  orderNumber: String,
  customer: String,
  customerName: String,
  customerPhone: String,
  items: [{
    product: String,
    productName: {
      en: String,
      ar: String
    },
    quantity: Number
  }],
  totalItems: Number,
  status: String,
  message: String,
  canEdit: Boolean,
  editDeadline: Date,
  history: [{
    action: String,
    by: String,
    byName: String,
    timestamp: Date
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);

async function checkMongoDB() {
  console.log('🔗 محاولة الاتصال بـ MongoDB...\n');
  
  try {
    // قراءة الـ URI من ملف .env.local
    const fs = require('fs');
    const path = require('path');
    
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const mongodbLine = envContent.split('\n').find(line => line.startsWith('MONGODB_URI='));
    const MONGODB_URI = mongodbLine ? mongodbLine.split('=').slice(1).join('=').trim() : null;
    
    if (!MONGODB_URI) {
      console.log('❌ متغير MONGODB_URI غير موجود في .env.local');
      return;
    }
    
    console.log('📝 URI المستخدم:', MONGODB_URI.replace(/:[^:@]*@/, ':****@'));
    
    // الاتصال بـ MongoDB
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
    });
    
    console.log('✅ تم الاتصال بـ MongoDB بنجاح!\n');
    
    // فحص المستخدمين
    console.log('👥 فحص المستخدمين في MongoDB:');
    const users = await User.find({});
    console.log(`   📊 عدد المستخدمين: ${users.length}`);
    
    if (users.length > 0) {
      console.log('   📝 قائمة المستخدمين:');
      users.forEach((user, index) => {
        console.log(`     ${index + 1}. ${user.phone} - ${user.name} (${user.email}) - Admin: ${user.isAdmin}`);
      });
    }
    
    // فحص المنتجات
    console.log('\n🥛 فحص المنتجات في MongoDB:');
    const products = await Product.find({});
    console.log(`   📊 عدد المنتجات: ${products.length}`);
    
    if (products.length > 0) {
      console.log('   📝 قائمة المنتجات:');
      products.forEach((product, index) => {
        console.log(`     ${index + 1}. ${product.slug} - ${product.name?.ar} (${product.name?.en})`);
      });
    }
    
    // فحص الطلبات
    console.log('\n📦 فحص الطلبات في MongoDB:');
    const orders = await Order.find({}).limit(5).sort({ createdAt: -1 });
    console.log(`   📊 إجمالي الطلبات: ${await Order.countDocuments()}`);
    
    if (orders.length > 0) {
      console.log('   📝 آخر 5 طلبات:');
      orders.forEach((order, index) => {
        console.log(`     ${index + 1}. ${order.orderNumber} - ${order.customerPhone} - ${order.status}`);
      });
    }
    
    console.log('\n✅ انتهى فحص MongoDB');
    
  } catch (error) {
    console.error('❌ خطأ في الاتصال بـ MongoDB:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔒 تم قطع الاتصال بـ MongoDB');
  }
}

checkMongoDB();