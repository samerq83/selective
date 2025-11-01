# 🔄 دليل التراجع (في حالة الطوارئ)

## ⚠️ متى تستخدم هذا الدليل

- إذا ظهرت أخطاء بعد الرفع إلى GitHub
- إذا فشل الاختبار على Netlify
- إذا كان هناك مشاكل في البيانات

---

## 🆘 التراجع السريع (3 خطوات)

### الخطوة 1: استرجع الملفات الأصلية

```bash
cd "c:\Users\Asus\Desktop\selective-trading-essential-backup - Copy"

# استرجع Order.ts
Copy-Item -Path ".zencoder\backups\Order.ts.bak" -Destination "models\Order.ts" -Force
echo "✅ Order.ts تم استرجاعه"

# استرجع orders/route.ts
Copy-Item -Path ".zencoder\backups\orders.route.ts.bak" -Destination "app\api\orders\route.ts" -Force
echo "✅ orders/route.ts تم استرجاعه"
```

### الخطوة 2: احذف الملف الجديد

```bash
# احذف download-file/route.ts
Remove-Item -Path "app\api\orders\download-file" -Recurse -Force
echo "✅ download-file directory تم حذفه"
```

### الخطوة 3: أرفع التغييرات

```bash
git status  # تحقق من التغييرات
git add .
git commit -m "Revert file storage changes - rollback to filesystem"
git push
```

---

## 📋 التراجع التفصيلي

### المرحلة 1: التحقق من الحالة الحالية

```bash
# شاهد الملفات المتغيرة
git diff models/Order.ts
git diff app/api/orders/route.ts

# شاهد الملفات الجديدة
git status app/api/orders/download-file/route.ts
```

### المرحلة 2: إلغاء التغييرات واحدًا تلو الآخر

#### إلغاء تغييرات Order.ts فقط
```bash
git checkout models/Order.ts
echo "✅ Order.ts تم إرجاعه إلى النسخة الأخيرة"
```

#### إلغاء تغييرات route.ts فقط
```bash
git checkout app/api/orders/route.ts
echo "✅ orders/route.ts تم إرجاعه إلى النسخة الأخيرة"
```

#### حذف ملف جديد
```bash
git rm -r app/api/orders/download-file/
echo "✅ download-file directory تم حذفه من Git"
```

### المرحلة 3: الإرسال

```bash
git commit -m "Revert file storage to MongoDB - issue with [حدد المشكلة]"
git push origin main
```

---

## 🔍 التحقق من التراجع

بعد التراجع، تحقق من أن:

1. **الملفات الأصلية موجودة:**
```bash
Get-Content "models\Order.ts" | Select-String "path: String"
Get-Content "app\api\orders\route.ts" | Select-String "writeFile"
```

2. **الملف الجديد مختفى:**
```bash
if (-Not (Test-Path "app\api\orders\download-file")) {
  echo "✅ download-file تم حذفه"
}
```

3. **السيرفر يعمل:**
```bash
npm run dev
# تحقق من عدم وجود أخطاء
```

---

## 🛠️ إذا لزم الأمر: استرجع بدون Git

إذا أردت التراجع **محليًا فقط** بدون رفع:

```bash
# استرجع من النسخ الاحتياطية
Copy-Item ".zencoder\backups\Order.ts.bak" -Destination "models\Order.ts" -Force
Copy-Item ".zencoder\backups\orders.route.ts.bak" -Destination "app\api\orders\route.ts" -Force
Remove-Item "app\api\orders\download-file" -Recurse -Force

# تحقق
npm run dev
```

---

## 📝 نموذج سجل التراجع

في حالة إذا تراجعت:

```markdown
# تاريخ التراجع: [التاريخ]
# السبب: [حدد السبب]
# من: حل MongoDB
# إلى: حل filesystem

## ما تم التراجع عنه:
- [ ] Order.ts - حقول جديدة محذوفة
- [ ] orders/route.ts - كود جديد محذوف
- [ ] download-file/route.ts - ملف جديد محذوف

## الخطوات المتخذة:
1. [استرجع من backups]
2. [رفع إلى GitHub]
3. [اختبار في Netlify]

## النتيجة:
- [ ] السيرفر يعمل محليًا
- [ ] الموقع يعمل على Netlify
- [ ] لا توجد أخطاء
```

---

## ⚡ حالات الطوارئ

### السيناريو 1: البناء يفشل في Netlify

```bash
# 1. تحقق من سجلات البناء
# 2. انسخ الخطأ
# 3. نفذ التراجع
Copy-Item ".zencoder\backups\Order.ts.bak" -Destination "models\Order.ts" -Force
Copy-Item ".zencoder\backups\orders.route.ts.bak" -Destination "app\api\orders\route.ts" -Force
Remove-Item "app\api\orders\download-file" -Recurse -Force

# 4. اختبر محليًا
npm run dev

# 5. ارفع إذا كان يعمل
git add .
git commit -m "Revert: Build failed on Netlify"
git push
```

### السيناريو 2: البيانات القديمة تضيع

إذا اكتشفت أن البيانات القديمة (مع `path`) أُفقدت:

```bash
# لا تقلق! لا يزال يمكنك استرجاع من MongoDB
# البيانات محفوظة في `purchaseOrderFile.path`

# انسخ البيانات من MongoDB يدويًا (اتصل بـ DBA)
```

### السيناريو 3: الملفات الجديدة لم تُحفظ

```bash
# تحقق من أن MongoDB_URI صحيح
echo "MONGODB_URI: $env:MONGODB_URI"

# تحقق من الاتصال
mongosh "$env:MONGODB_URI" --eval "db.orders.countDocuments()"

# إذا فشل: استرجع الحل القديم
Copy-Item ".zencoder\backups\Order.ts.bak" -Destination "models\Order.ts" -Force
```

---

## 📞 قبل التراجع

1. **احفظ معلومات الخطأ:**
   - screenshot من الخطأ
   - console error messages
   - network requests

2. **اتصل بـ support أو المطور**

3. **حاول تصحيح الخطأ أولاً**

4. **التراجع هو الخيار الأخير**

---

## ✅ بعد التراجع الناجح

```bash
# 1. اختبر محليًا
npm run dev

# 2. تحقق من الموقع
# افتح http://localhost:3000

# 3. اختبر الميزات الأساسية
# - الدخول
# - إنشاء طلب
# - رفع ملف (إذا كان الحل القديم يدعمه)

# 4. اختبر على Netlify بعد البناء الجديد
```

---

## 🔐 الملفات الآمنة من التراجع

هذه الملفات **لن** تتأثر بالتراجع:

- ✅ database البيانات في MongoDB
- ✅ env files
- ✅ جميع الملفات الأخرى
- ✅ Git history

---

**تاريخ الإنشاء:** 1 نوفمبر 2024  
**نسخة:** 1.0