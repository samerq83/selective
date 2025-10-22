const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// نماذج MongoDB
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

async function migrateData() {
  console.log('🔄 بدء نقل البيانات المفقودة إلى MongoDB...\n');
  
  try {
    // قراءة اتصال MongoDB
    const envPath = path.join(__dirname, '..', '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const mongodbLine = envContent.split('\n').find(line => line.startsWith('MONGODB_URI='));
    const MONGODB_URI = mongodbLine ? mongodbLine.split('=').slice(1).join('=').trim() : null;
    
    if (!MONGODB_URI) {
      console.log('❌ لم يتم العثور على MONGODB_URI');
      return;
    }
    
    // الاتصال بـ MongoDB
    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
    });
    
    console.log('✅ تم الاتصال بـ MongoDB\n');
    
    // قراءة البيانات المحلية
    const dbPath = path.join(__dirname, '..', 'data', 'db.json');
    const jsonData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    
    console.log('✅ تم قراءة البيانات المحلية\n');
    
    // إحصائيات قبل النقل
    const existingUsers = await User.countDocuments();
    const existingProducts = await Product.countDocuments();
    const existingOrders = await Order.countDocuments();
    
    console.log('📊 الوضع الحالي في MongoDB:');
    console.log(`   👥 مستخدمون: ${existingUsers}`);
    console.log(`   🥛 منتجات: ${existingProducts}`);
    console.log(`   📦 طلبات: ${existingOrders}\n`);
    
    console.log('📊 البيانات في الملف المحلي:');
    console.log(`   👥 مستخدمون: ${jsonData.users.length}`);
    console.log(`   🥛 منتجات: ${jsonData.products.length}`);
    console.log(`   📦 طلبات: ${jsonData.orders.length}\n`);
    
    // 1. نقل المستخدمين المفقودين
    console.log('👥 فحص المستخدمين المفقودين...');
    let addedUsers = 0;
    let updatedUsers = 0;
    
    for (const jsonUser of jsonData.users) {
      const existingUser = await User.findOne({ phone: jsonUser.phone });
      
      if (!existingUser) {
        // إضافة مستخدم جديد
        const newUser = new User({
          phone: jsonUser.phone,
          name: jsonUser.name,
          email: jsonUser.email,
          address: jsonUser.address || '',
          companyName: jsonUser.companyName || '',
          isAdmin: jsonUser.isAdmin || false,
          isActive: jsonUser.isActive !== false,
          lastLogin: jsonUser.lastLogin ? new Date(jsonUser.lastLogin) : null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await newUser.save();
        console.log(`   ✅ أُضيف: ${jsonUser.phone} - ${jsonUser.name}`);
        addedUsers++;
      } else {
        // تحديث البيانات إذا كانت مختلفة
        let needsUpdate = false;
        
        if (existingUser.email !== jsonUser.email) {
          existingUser.email = jsonUser.email;
          needsUpdate = true;
        }
        if (existingUser.name !== jsonUser.name) {
          existingUser.name = jsonUser.name;
          needsUpdate = true;
        }
        if (existingUser.isAdmin !== jsonUser.isAdmin) {
          existingUser.isAdmin = jsonUser.isAdmin;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          existingUser.updatedAt = new Date();
          await existingUser.save();
          console.log(`   🔄 حُدث: ${jsonUser.phone} - ${jsonUser.name}`);
          updatedUsers++;
        }
      }
    }
    
    console.log(`   📊 أُضيف: ${addedUsers}, حُدث: ${updatedUsers}\n`);
    
    // 2. نقل الطلبات المفقودة
    console.log('📦 فحص الطلبات المفقودة...');
    let addedOrders = 0;
    
    for (const jsonOrder of jsonData.orders) {
      const existingOrder = await Order.findOne({ orderNumber: jsonOrder.orderNumber });
      
      if (!existingOrder) {
        // البحث عن معرف المستخدم في MongoDB
        const customer = await User.findOne({ phone: jsonOrder.customerPhone });
        
        if (customer) {
          const newOrder = new Order({
            orderNumber: jsonOrder.orderNumber,
            customer: customer._id.toString(),
            customerName: jsonOrder.customerName,
            customerPhone: jsonOrder.customerPhone,
            items: jsonOrder.items || [],
            totalItems: jsonOrder.totalItems || 0,
            status: jsonOrder.status || 'new',
            message: jsonOrder.message || '',
            canEdit: jsonOrder.canEdit !== false,
            editDeadline: jsonOrder.editDeadline ? new Date(jsonOrder.editDeadline) : new Date(),
            history: (jsonOrder.history || []).map(h => ({
              action: h.action,
              by: h.by,
              byName: h.byName,
              timestamp: new Date(h.timestamp)
            })),
            createdAt: jsonOrder.createdAt ? new Date(jsonOrder.createdAt) : new Date(),
            updatedAt: jsonOrder.updatedAt ? new Date(jsonOrder.updatedAt) : new Date()
          });
          
          await newOrder.save();
          console.log(`   ✅ أُضيف طلب: ${jsonOrder.orderNumber} - ${jsonOrder.customerPhone}`);
          addedOrders++;
        } else {
          console.log(`   ⚠️  لم يتم العثور على المستخدم للطلب: ${jsonOrder.orderNumber} - ${jsonOrder.customerPhone}`);
        }
      }
    }
    
    console.log(`   📊 أُضيف: ${addedOrders} طلب\n`);
    
    // إحصائيات بعد النقل
    const newUserCount = await User.countDocuments();
    const newProductCount = await Product.countDocuments();
    const newOrderCount = await Order.countDocuments();
    
    console.log('📊 الوضع النهائي في MongoDB:');
    console.log(`   👥 مستخدمون: ${newUserCount} (زيادة: +${newUserCount - existingUsers})`);
    console.log(`   🥛 منتجات: ${newProductCount} (زيادة: +${newProductCount - existingProducts})`);
    console.log(`   📦 طلبات: ${newOrderCount} (زيادة: +${newOrderCount - existingOrders})\n`);
    
    // إنشاء تقرير النقل
    const migrationReport = {
      timestamp: new Date().toISOString(),
      before: {
        users: existingUsers,
        products: existingProducts,
        orders: existingOrders
      },
      after: {
        users: newUserCount,
        products: newProductCount,
        orders: newOrderCount
      },
      changes: {
        usersAdded: addedUsers,
        usersUpdated: updatedUsers,
        ordersAdded: addedOrders
      },
      status: 'completed'
    };
    
    // حفظ تقرير النقل
    const reportPath = path.join(__dirname, '..', 'data', 'migration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(migrationReport, null, 2));
    console.log(`💾 تم حفظ تقرير النقل في: ${reportPath}\n`);
    
    console.log('✅ انتهى نقل البيانات بنجاح!');
    
    if (addedOrders > 0 || addedUsers > 0) {
      console.log('\n🎉 تم نقل البيانات المفقودة بنجاح إلى MongoDB');
      console.log('📋 التوصية التالية: تشغيل اختبارات للتأكد من سلامة النظام');
    } else {
      console.log('\n✅ جميع البيانات محدثة ومتزامنة');
    }
    
  } catch (error) {
    console.error('❌ خطأ في نقل البيانات:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔒 تم قطع الاتصال بـ MongoDB');
  }
}

migrateData();