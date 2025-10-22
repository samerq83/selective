# اختبارات سكريپتات الترحيل - Migration Scripts Tests

## نظرة عامة
تحتوي هذه المجموعة على اختبارات شاملة لسكريپتات ترحيل البيانات من JSON إلى MongoDB. تغطي الاختبارات جميع مراحل عملية الترحيل والتأكد من سلامة البيانات.

## هيكل الاختبارات

```
__tests__/scripts/
├── data-migration.test.js          # اختبارات عملية الترحيل الأساسية
├── database-operations.test.js     # اختبارات عمليات قاعدة البيانات
├── migration-integration.test.js   # اختبارات التكامل الكاملة
├── setup.js                       # إعداد الاختبارات والأدوات المساعدة
└── README.md                      # هذا الملف
```

## الاختبارات المتوفرة

### 1. اختبارات ترحيل البيانات (data-migration.test.js)
- **تشخيص تضارب البيانات**: فحص الاختلافات بين JSON و MongoDB
- **ترحيل البيانات المفقودة**: نقل البيانات من JSON إلى MongoDB
- **التحقق من الاتصال**: اختبار الاتصال بقاعدة البيانات
- **إكمال الترحيل**: الخطوات النهائية لتوحيد النظام

### 2. اختبارات عمليات قاعدة البيانات (database-operations.test.js)
- **إنشاء المستخدمين الإداريين**: إضافة وإدارة المدراء
- **مزامنة المنتجات**: تحديث كتالوج المنتجات
- **بذر قاعدة البيانات**: إضافة البيانات الأولية
- **اختبار الأداء**: قياس سرعة العمليات

### 3. اختبارات التكامل (migration-integration.test.js)
- **سير العمل الكامل**: اختبار العملية من النهاية إلى النهاية
- **السيناريوهات الواقعية**: محاكاة حالات الاستخدام الفعلية
- **الأداء والقابلية للتوسع**: اختبار الأحمال الكبيرة
- **سلامة البيانات**: التحقق من صحة المراجع

## كيفية تشغيل الاختبارات

### تشغيل جميع اختبارات السكريپتات
```bash
npm run test:migration
```

### تشغيل سكريپت الاختبار المخصص
```bash
npm run test:scripts
```

### تشغيل اختبارات محددة
```bash
# اختبارات الترحيل فقط
npm test data-migration.test.js

# اختبارات عمليات قاعدة البيانات
npm test database-operations.test.js

# اختبارات التكامل
npm test migration-integration.test.js
```

### تشغيل جميع الاختبارات
```bash
npm run test:all
```

## المتطلبات

### التبعيات المطلوبة
- **Jest**: إطار الاختبار الرئيسي
- **MongoDB Memory Server**: قاعدة بيانات MongoDB في الذاكرة
- **MongoDB Client**: عميل MongoDB للاتصال
- **bcryptjs**: لتشفير كلمات المرور في الاختبارات

### إعداد البيئة
```bash
# تثبيت التبعيات
npm install

# التأكد من وجود جميع المتطلبات
npm run test:scripts
```

## إعداد الاختبارات

### متغيرات البيئة
```javascript
NODE_ENV=test
MONGODB_URI=mongodb://localhost:27017/test_db
JWT_SECRET=test_secret_key
```

### إعداد قاعدة البيانات الوهمية
يستخدم النظام `mongodb-memory-server` لإنشاء قاعدة بيانات في الذاكرة لكل اختبار، مما يضمن:
- عزل الاختبارات عن بعضها
- سرعة تنفيذ الاختبارات
- عدم الحاجة لقاعدة بيانات خارجية

## سيناريوهات الاختبار

### 1. السيناريو الأساسي - الترحيل الكامل
```javascript
// بيانات JSON → تشخيص → ترحيل → تحقق
const jsonData = { users: [...], orders: [...] };
const diagnosis = await diagnosisDataConflicts(db, jsonData);
const migration = await migrateMissingData(db, jsonData);
expect(migration.success).toBe(true);
```

### 2. سيناريو التحديث التزايدي
```javascript
// بيانات موجودة + بيانات محدثة → دمج
await setupExistingData();
const updatedData = getUpdatedJsonData();
const result = await migrateMissingData(db, updatedData);
expect(result.summary.updated).toBeGreaterThan(0);
```

### 3. سيناريو معالجة الأخطاء
```javascript
// بيانات معطوبة → معالجة الخطأ
const invalidData = getInvalidJsonData();
const result = await migrateMissingData(db, invalidData);
expect(result.success).toBe(false);
expect(result.errors).toBeDefined();
```

## التقارير والنتائج

### تقارير الاختبار
- **JSON Report**: تقرير مفصل بصيغة JSON في مجلد `reports/`
- **Text Report**: تقرير نصي قابل للقراءة
- **Console Output**: نتائج مباشرة في الطرفية

### مثال على تقرير الاختبار
```
==========================================================
          تقرير اختبارات ترحيل البيانات
==========================================================

التاريخ: 2023-12-10 10:30:00
المدة الإجمالية: 15.8 ثانية

الملخص:
----------------------------------------
إجمالي الاختبارات: 25
اختبارات ناجحة: 23
اختبارات فاشلة: 2
معدل النجاح: 92.0%
```

## أفضل الممارسات

### كتابة اختبارات جديدة
1. **استخدم البيانات الوهمية**: لا تعتمد على بيانات حقيقية
2. **اختبر الحالات الحدية**: البيانات الفارغة والخاطئة
3. **تأكد من التنظيف**: امسح البيانات بعد كل اختبار
4. **استخدم أسماء وصفية**: اجعل الاختبار يشرح نفسه

### مثال على اختبار جيد
```javascript
test('should migrate orders with proper user references', async () => {
  // Arrange - إعداد البيانات
  await setupTestUsers();
  const ordersData = getValidOrdersData();
  
  // Act - تنفيذ العملية
  const result = await migrateMissingData(database, { orders: ordersData });
  
  // Assert - التحقق من النتيجة
  expect(result.success).toBe(true);
  expect(result.summary.ordersAdded).toBe(ordersData.length);
  
  // Verify - التحقق من قاعدة البيانات
  const savedOrders = await database.collection('orders').find({}).toArray();
  expect(savedOrders).toHaveLength(ordersData.length);
});
```

## استكشاف الأخطاء وإصلاحها

### مشاكل شائعة

#### خطأ في الاتصال بقاعدة البيانات
```
Error: MongoServerError: Connection failed
```
**الحل**: تأكد من تثبيت `mongodb-memory-server`
```bash
npm install --save-dev mongodb-memory-server
```

#### خطأ في تشغيل Jest
```
Error: Cannot find module 'jest'
```
**الحل**: تثبيت Jest
```bash
npm install --save-dev jest @types/jest
```

#### بطء في تشغيل الاختبارات
**الأسباب المحتملة**:
- قاعدة بيانات كبيرة في الذاكرة
- عدم تنظيف البيانات بين الاختبارات
- اختبارات تحتوي على عمليات متزامنة

**الحلول**:
```javascript
// تنظيف البيانات بكفاءة
afterEach(async () => {
  await database.dropDatabase(); // أسرع من حذف كل مجموعة
});

// تحسين الاستعلامات
const users = await database.collection('users')
  .find({}, { projection: { _id: 1, email: 1 } }) // فقط الحقول المطلوبة
  .toArray();
```

### تصحيح الأخطاء
```javascript
// تفعيل وضع التصحيح
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('Migration data:', JSON.stringify(migrationData, null, 2));
}
```

## المساهمة

### إضافة اختبارات جديدة
1. أنشئ ملف اختبار في `__tests__/scripts/`
2. استخدم الإعداد من `setup.js`
3. اتبع نمط التسمية: `*.test.js`
4. أضف وثائق للاختبارات الجديدة

### معايير قبول الاختبارات
- ✅ تغطية اختبار لا تقل عن 80%
- ✅ جميع الاختبارات تمر بنجاح
- ✅ لا توجد اختبارات بطيئة (>5 ثوان)
- ✅ وثائق واضحة للاختبارات

## الأدوات المساعدة

### وظائف مساعدة في `setup.js`
```javascript
// إنشاء بيانات اختبار
const testData = generateMockJsonData({ 
  userCount: 10, 
  orderCount: 50 
});

// فحص سلامة البيانات
const integrityReport = await verifyDataIntegrity(database);

// إنشاء تقرير مخصص
const report = generateTestReport(testResults);
```

### أدوات التشغيل في `run-migration-tests.js`
- فحص البيئة قبل التشغيل
- تشغيل الاختبارات بالتسلسل
- إنشاء تقارير مفصلة
- تنظيف الملفات المؤقتة

## الخلاصة

هذه الاختبارات تضمن:
- ✅ صحة عملية الترحيل
- ✅ سلامة البيانات
- ✅ أداء النظام
- ✅ معالجة الأخطاء
- ✅ التوافق مع السيناريوهات الواقعية

للحصول على مساعدة إضافية أو الإبلاغ عن مشاكل، راجع:
- وثائق Jest: https://jestjs.io/docs/
- وثائق MongoDB Memory Server: https://github.com/nodkz/mongodb-memory-server
- الأسئلة الشائعة في المشروع