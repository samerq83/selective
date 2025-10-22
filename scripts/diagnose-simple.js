const fs = require('fs');
const path = require('path');

// قراءة البيانات من JSON فقط كخطوة أولى
async function diagnoseSimple() {
  console.log('🔍 فحص البيانات المحلية...\n');
  
  try {
    const dbPath = path.join(__dirname, '..', 'data', 'db.json');
    const jsonData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    
    console.log('✅ تم قراءة البيانات المحلية بنجاح');
    console.log('\n📊 إحصائيات البيانات المحلية:');
    console.log(`   👥 المستخدمون: ${jsonData.users.length}`);
    console.log(`   🥛 المنتجات: ${jsonData.products.length}`);
    console.log(`   📦 الطلبات: ${jsonData.orders.length}`);
    
    // عرض تفاصيل المستخدمين
    console.log('\n👥 قائمة المستخدمين:');
    jsonData.users.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.phone} - ${user.name} (${user.email}) - Admin: ${user.isAdmin}`);
    });
    
    // عرض تفاصيل المنتجات
    console.log('\n🥛 قائمة المنتجات:');
    jsonData.products.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.slug} - ${product.name.ar} (${product.name.en}) - متاح: ${product.isAvailable}`);
    });
    
    // عرض آخر 5 طلبات
    console.log('\n📦 آخر الطلبات:');
    const recentOrders = jsonData.orders.slice(-5);
    recentOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. ${order.orderNumber} - ${order.customerPhone} - ${order.status} - عدد القطع: ${order.totalItems}`);
    });
    
    // فحص البيانات للمشاكل الواضحة
    console.log('\n🔍 فحص المشاكل:');
    
    // فحص المستخدمين المكررين
    const phoneNumbers = jsonData.users.map(u => u.phone);
    const duplicatePhones = phoneNumbers.filter((phone, index) => phoneNumbers.indexOf(phone) !== index);
    if (duplicatePhones.length > 0) {
      console.log(`   ⚠️  أرقام هواتف مكررة: ${duplicatePhones.join(', ')}`);
    } else {
      console.log('   ✅ لا توجد أرقام هواتف مكررة');
    }
    
    // فحص الايميلات المكررة
    const emails = jsonData.users.map(u => u.email);
    const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
    if (duplicateEmails.length > 0) {
      console.log(`   ⚠️  إيميلات مكررة: ${duplicateEmails.join(', ')}`);
    } else {
      console.log('   ✅ لا توجد إيميلات مكررة');
    }
    
    // فحص المنتجات المكررة
    const productSlugs = jsonData.products.map(p => p.slug);
    const duplicateSlugs = productSlugs.filter((slug, index) => productSlugs.indexOf(slug) !== index);
    if (duplicateSlugs.length > 0) {
      console.log(`   ⚠️  منتجات مكررة: ${duplicateSlugs.join(', ')}`);
    } else {
      console.log('   ✅ لا توجد منتجات مكررة');
    }
    
    console.log('\n✅ انتهى الفحص المبسط');
    console.log('\n📝 التوصية التالية: الآن نحتاج لمقارنة هذه البيانات مع MongoDB');
    
  } catch (error) {
    console.error('❌ خطأ في قراءة البيانات:', error);
  }
}

diagnoseSimple();