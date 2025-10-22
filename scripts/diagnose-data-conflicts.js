const path = require('path');
const fs = require('fs');
const rootDir = path.join(__dirname, '..');

// Set working directory to root
process.chdir(rootDir);

const connectDB = require(path.join(rootDir, 'lib', 'mongodb')).default;
const { readDB } = require(path.join(rootDir, 'lib', 'simple-db'));
const User = require(path.join(rootDir, 'models', 'User')).default;
const Product = require(path.join(rootDir, 'models', 'Product')).default;
const Order = require(path.join(rootDir, 'models', 'Order')).default;

async function diagnoseDataConflicts() {
  console.log('🔍 بدء تشخيص تضارب البيانات...\n');
  
  try {
    // الاتصال بـ MongoDB
    await connectDB();
    console.log('✅ تم الاتصال بـ MongoDB');

    // قراءة البيانات المحلية
    const jsonData = readDB();
    console.log('✅ تم قراءة البيانات المحلية (db.json)');
    
    const report = {
      users: {
        totalJsonUsers: jsonData.users.length,
        totalMongoUsers: 0,
        conflicting: [],
        missingInMongo: [],
        missingInJson: []
      },
      products: {
        totalJsonProducts: jsonData.products.length,
        totalMongoProducts: 0,
        conflicting: [],
        missingInMongo: [],
        missingInJson: []
      },
      orders: {
        totalJsonOrders: jsonData.orders.length,
        totalMongoOrders: 0,
        missingInMongo: [],
        missingInJson: []
      },
      summary: {
        hasConflicts: false,
        recommendedAction: '',
        criticalIssues: []
      }
    };

    // فحص المستخدمين
    console.log('\n👥 فحص المستخدمين...');
    const mongoUsers = await User.find({});
    report.users.totalMongoUsers = mongoUsers.length;

    console.log(`  📊 المستخدمون في JSON: ${report.users.totalJsonUsers}`);
    console.log(`  📊 المستخدمون في MongoDB: ${report.users.totalMongoUsers}`);

    // مقارنة المستخدمين
    for (const jsonUser of jsonData.users) {
      const mongoUser = mongoUsers.find(u => u.phone === jsonUser.phone);
      
      if (!mongoUser) {
        report.users.missingInMongo.push({
          phone: jsonUser.phone,
          name: jsonUser.name,
          email: jsonUser.email,
          isAdmin: jsonUser.isAdmin
        });
      } else {
        // فحص التضارب
        if (mongoUser.email !== jsonUser.email || 
            mongoUser.name !== jsonUser.name ||
            mongoUser.isAdmin !== jsonUser.isAdmin) {
          report.users.conflicting.push({
            phone: jsonUser.phone,
            json: {
              name: jsonUser.name,
              email: jsonUser.email,
              isAdmin: jsonUser.isAdmin,
              address: jsonUser.address
            },
            mongo: {
              name: mongoUser.name,
              email: mongoUser.email,
              isAdmin: mongoUser.isAdmin,
              address: mongoUser.address
            }
          });
        }
      }
    }

    // البحث عن مستخدمين في MongoDB غير موجودين في JSON
    for (const mongoUser of mongoUsers) {
      const jsonUser = jsonData.users.find(u => u.phone === mongoUser.phone);
      if (!jsonUser) {
        report.users.missingInJson.push({
          phone: mongoUser.phone,
          name: mongoUser.name,
          email: mongoUser.email,
          isAdmin: mongoUser.isAdmin
        });
      }
    }

    // فحص المنتجات
    console.log('\n🥛 فحص المنتجات...');
    const mongoProducts = await Product.find({});
    report.products.totalMongoProducts = mongoProducts.length;

    console.log(`  📊 المنتجات في JSON: ${report.products.totalJsonProducts}`);
    console.log(`  📊 المنتجات في MongoDB: ${report.products.totalMongoProducts}`);

    // مقارنة المنتجات بناءً على الـ slug
    for (const jsonProduct of jsonData.products) {
      const mongoProduct = mongoProducts.find(p => p.slug === jsonProduct.slug);
      
      if (!mongoProduct) {
        report.products.missingInMongo.push({
          id: jsonProduct.id,
          name: jsonProduct.name,
          slug: jsonProduct.slug,
          isAvailable: jsonProduct.isAvailable
        });
      } else {
        // فحص التضارب
        if (JSON.stringify(mongoProduct.name) !== JSON.stringify(jsonProduct.name) ||
            mongoProduct.isAvailable !== jsonProduct.isAvailable) {
          report.products.conflicting.push({
            slug: jsonProduct.slug,
            json: {
              name: jsonProduct.name,
              isAvailable: jsonProduct.isAvailable,
              order: jsonProduct.order
            },
            mongo: {
              name: mongoProduct.name,
              isAvailable: mongoProduct.isAvailable,
              order: mongoProduct.order
            }
          });
        }
      }
    }

    // البحث عن منتجات في MongoDB غير موجودة في JSON
    for (const mongoProduct of mongoProducts) {
      const jsonProduct = jsonData.products.find(p => p.slug === mongoProduct.slug);
      if (!jsonProduct) {
        report.products.missingInJson.push({
          slug: mongoProduct.slug,
          name: mongoProduct.name,
          isAvailable: mongoProduct.isAvailable
        });
      }
    }

    // فحص الطلبات
    console.log('\n📦 فحص الطلبات...');
    const mongoOrders = await Order.find({});
    report.orders.totalMongoOrders = mongoOrders.length;

    console.log(`  📊 الطلبات في JSON: ${report.orders.totalJsonOrders}`);
    console.log(`  📊 الطلبات في MongoDB: ${report.orders.totalMongoOrders}`);

    // مقارنة الطلبات بناءً على orderNumber
    for (const jsonOrder of jsonData.orders) {
      const mongoOrder = mongoOrders.find(o => o.orderNumber === jsonOrder.orderNumber);
      if (!mongoOrder) {
        report.orders.missingInMongo.push({
          orderNumber: jsonOrder.orderNumber,
          customerPhone: jsonOrder.customerPhone,
          status: jsonOrder.status,
          totalItems: jsonOrder.totalItems,
          createdAt: jsonOrder.createdAt
        });
      }
    }

    // البحث عن طلبات في MongoDB غير موجودة في JSON
    for (const mongoOrder of mongoOrders) {
      const jsonOrder = jsonData.orders.find(o => o.orderNumber === mongoOrder.orderNumber);
      if (!jsonOrder) {
        report.orders.missingInJson.push({
          orderNumber: mongoOrder.orderNumber,
          customerPhone: mongoOrder.customerPhone,
          status: mongoOrder.status,
          totalItems: mongoOrder.totalItems,
          createdAt: mongoOrder.createdAt
        });
      }
    }

    // تحليل النتائج وإنشاء التوصيات
    const hasUserConflicts = report.users.conflicting.length > 0 || 
                             report.users.missingInMongo.length > 0 ||
                             report.users.missingInJson.length > 0;
    
    const hasProductConflicts = report.products.conflicting.length > 0 ||
                                report.products.missingInMongo.length > 0 ||
                                report.products.missingInJson.length > 0;
    
    const hasOrderConflicts = report.orders.missingInMongo.length > 0 ||
                              report.orders.missingInJson.length > 0;

    report.summary.hasConflicts = hasUserConflicts || hasProductConflicts || hasOrderConflicts;

    // تحديد المشاكل الحرجة
    if (report.users.conflicting.length > 0) {
      report.summary.criticalIssues.push(`${report.users.conflicting.length} مستخدمين لديهم بيانات متضاربة`);
    }
    if (report.products.conflicting.length > 0) {
      report.summary.criticalIssues.push(`${report.products.conflicting.length} منتجات لديها بيانات متضاربة`);
    }
    if (report.orders.missingInMongo.length > 0) {
      report.summary.criticalIssues.push(`${report.orders.missingInMongo.length} طلبات مفقودة في MongoDB`);
    }

    // تحديد التوصية
    if (!report.summary.hasConflicts) {
      report.summary.recommendedAction = 'يمكن المتابعة بأمان - لا توجد تضاربات';
    } else if (report.summary.criticalIssues.length === 0) {
      report.summary.recommendedAction = 'توجد اختلافات بسيطة - يُنصح بالمزامنة';
    } else {
      report.summary.recommendedAction = 'توجد تضاربات حرجة - يجب حلها قبل المتابعة';
    }

    return report;

  } catch (error) {
    console.error('❌ خطأ في التشخيص:', error);
    throw error;
  }
}

function printReport(report) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 تقرير تشخيص تضارب البيانات');
  console.log('='.repeat(60));
  
  // ملخص عام
  console.log('\n🎯 الملخص العام:');
  console.log(`   حالة النظام: ${report.summary.hasConflicts ? '⚠️  توجد مشاكل' : '✅ سليم'}`);
  console.log(`   التوصية: ${report.summary.recommendedAction}`);
  
  if (report.summary.criticalIssues.length > 0) {
    console.log('\n🚨 المشاكل الحرجة:');
    report.summary.criticalIssues.forEach(issue => {
      console.log(`   • ${issue}`);
    });
  }

  // تفاصيل المستخدمين
  console.log('\n👥 المستخدمين:');
  console.log(`   📊 العدد في JSON: ${report.users.totalJsonUsers}`);
  console.log(`   📊 العدد في MongoDB: ${report.users.totalMongoUsers}`);
  console.log(`   ⚠️  متضاربين: ${report.users.conflicting.length}`);
  console.log(`   ❌ مفقودين في MongoDB: ${report.users.missingInMongo.length}`);
  console.log(`   ❌ مفقودين في JSON: ${report.users.missingInJson.length}`);

  if (report.users.conflicting.length > 0) {
    console.log('\n   📝 المستخدمين المتضاربين:');
    report.users.conflicting.forEach(user => {
      console.log(`     رقم الهاتف: ${user.phone}`);
      console.log(`     JSON: ${user.json.name} (${user.json.email})`);
      console.log(`     MongoDB: ${user.mongo.name} (${user.mongo.email})`);
      console.log('     ---');
    });
  }

  if (report.users.missingInMongo.length > 0) {
    console.log('\n   ❌ مستخدمين مفقودين في MongoDB:');
    report.users.missingInMongo.forEach(user => {
      console.log(`     ${user.phone} - ${user.name} (${user.email}) - Admin: ${user.isAdmin}`);
    });
  }

  if (report.users.missingInJson.length > 0) {
    console.log('\n   ❌ مستخدمين مفقودين في JSON:');
    report.users.missingInJson.forEach(user => {
      console.log(`     ${user.phone} - ${user.name} (${user.email}) - Admin: ${user.isAdmin}`);
    });
  }

  // تفاصيل المنتجات
  console.log('\n🥛 المنتجات:');
  console.log(`   📊 العدد في JSON: ${report.products.totalJsonProducts}`);
  console.log(`   📊 العدد في MongoDB: ${report.products.totalMongoProducts}`);
  console.log(`   ⚠️  متضاربة: ${report.products.conflicting.length}`);
  console.log(`   ❌ مفقودة في MongoDB: ${report.products.missingInMongo.length}`);
  console.log(`   ❌ مفقودة في JSON: ${report.products.missingInJson.length}`);

  if (report.products.missingInMongo.length > 0) {
    console.log('\n   ❌ منتجات مفقودة في MongoDB:');
    report.products.missingInMongo.forEach(product => {
      console.log(`     ${product.slug} - ${product.name.ar} (${product.name.en})`);
    });
  }

  // تفاصيل الطلبات
  console.log('\n📦 الطلبات:');
  console.log(`   📊 العدد في JSON: ${report.orders.totalJsonOrders}`);
  console.log(`   📊 العدد في MongoDB: ${report.orders.totalMongoOrders}`);
  console.log(`   ❌ مفقودة في MongoDB: ${report.orders.missingInMongo.length}`);
  console.log(`   ❌ مفقودة في JSON: ${report.orders.missingInJson.length}`);

  if (report.orders.missingInMongo.length > 0) {
    console.log('\n   ❌ طلبات مفقودة في MongoDB:');
    report.orders.missingInMongo.slice(0, 5).forEach(order => {
      console.log(`     ${order.orderNumber} - ${order.customerPhone} (${order.status})`);
    });
    if (report.orders.missingInMongo.length > 5) {
      console.log(`     ... و ${report.orders.missingInMongo.length - 5} طلبات أخرى`);
    }
  }

  console.log('\n' + '='.repeat(60));
}

// تشغيل التشخيص
diagnoseDataConflicts()
  .then(report => {
    printReport(report);
    
    // حفظ التقرير في ملف
    const reportPath = path.join(__dirname, '..', 'data', 'conflict-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 تم حفظ التقرير في: ${reportPath}`);
    
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ فشل التشخيص:', error);
    process.exit(1);
  });