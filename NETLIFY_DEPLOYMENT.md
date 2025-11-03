# 🚀 دليل نشر على Netlify

دليل شامل لنشر تطبيق Selective Trading على Netlify مع اتصال GitHub التلقائي.

---

## ✅ المتطلبات الأساسية

- ✅ حساب GitHub (تم رفع المشروع)
- ✅ حساب MongoDB Atlas مع Database URI
- ✅ حساب Gmail مع App Password
- ✅ حساب Netlify

---

## 📝 الخطوة 1: تجهيز البيانات المطلوبة

اجمع المعلومات التالية قبل البدء:

### 1. MongoDB URI
```
mongodb+srv://username:password@cluster.mongodb.net/selective-trading
```
- [احصل على MongoDB Atlas Account](https://www.mongodb.com/cloud/atlas)
- أنشئ Cluster ومستخدم قاعدة بيانات
- انسخ الـ Connection String

### 2. Gmail App Password
```
vofgsomjwkadssjo (مثال - استخدم كلمتك أنت)
```
- انتقل إلى: https://myaccount.google.com/apppasswords
- اختر: Mail / Windows Computer
- ستحصل على 16 حرف

### 3. Secrets العشوائية
أنشئ قيم عشوائية آمنة لـ:
- `JWT_SECRET`: 32 حرف عشوائي على الأقل
- `NEXTAUTH_SECRET`: 32 حرف عشوائي على الأقل
- `COOKIE_SECRET`: 32 حرف عشوائي على الأقل

[استخدم هذا الموقع لتوليد secrets آمنة](https://generatea.name/secret-key-generator)

---

## 🔗 الخطوة 2: ربط GitHub بـ Netlify

1. اذهب إلى [Netlify](https://www.netlify.com)
2. تسجيل الدخول أو إنشاء حساب جديد
3. اضغط **"New site from Git"**
4. اختر **GitHub**
5. فعّل الوصول إلى حسابك و اختر المستودع:
   ```
   https://github.com/samerq83/selective
   ```

---

## ⚙️ الخطوة 3: إعدادات البناء والنشر

### إعدادات Build Settings:

```
Build command:     npm run build
Publish directory: .next
Node version:      18.20.0
```

### Build Environment (متغيرات البيئة):

**في صفحة Site Settings → Build & Deploy → Environment**

أضف المتغيرات التالية:

```
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://your-site.netlify.app
NEXTAUTH_URL=https://your-site.netlify.app
```

---

## 🔐 الخطوة 4: إضافة متغيرات البيئة الحساسة

**في نفس الصفحة، اضغط "Edit variables" وأضف:**

| المتغير | القيمة | الملاحظة |
|---------|--------|---------|
| `MONGODB_URI` | `mongodb+srv://...` | من MongoDB Atlas |
| `JWT_SECRET` | قيمة عشوائية 32 حرف | استخدم موقع التوليد |
| `NEXTAUTH_SECRET` | قيمة عشوائية 32 حرف | استخدم موقع التوليد |
| `COOKIE_SECRET` | قيمة عشوائية 32 حرف | استخدم موقع التوليد |
| `EMAIL_USER` | بريدك@gmail.com | بريدك الإلكتروني |
| `APP_PASSWORD` | 16 حرف من Gmail | من App Passwords |

---

## 🧪 الخطوة 5: مثال عملي كامل

### صورة توضيحية (Environment Variables):

```
MONGODB_URI = mongodb+srv://mr000000_db_user:zohwlq0wOWpwihaK@cluster0.wv2o5h4.mongodb.net/selective-trading
JWT_SECRET = aRfFwD6htynH1Ev0gWKspCZLjAzPlU7QVkiNdMb9SJOexG538ucro2I4TBmYqX
NEXTAUTH_SECRET = L57ogIr0zRC8Z39sGSflTkpJxynYNEcbQUBqXKwhDiuWHFad4mvM6A2jtPV1Oe
COOKIE_SECRET = FdTIu7yJXBApDV8W9meUgCtlH1MShQ0L5xZEckYvsjNoK6P2izGnrab4ORfw3q
EMAIL_USER = mr000000@gmail.com
APP_PASSWORD = vofgsomjwkadssjo
NODE_ENV = production
NEXT_PUBLIC_BASE_URL = https://selectiveco.netlify.app
NEXTAUTH_URL = https://selectiveco.netlify.app
```

---

## 🚀 الخطوة 6: النشر

1. بعد إضافة المتغيرات، اضغط **"Deploy"**
2. انتظر البناء (عادة 2-5 دقائق)
3. تحقق من logs للتأكد من عدم وجود أخطاء

### عرض الـ Logs:
- اذهب إلى: **Deployments → Recent Deployments**
- اختر آخر deployment
- اضغط **"Deploy log"** لعرض التفاصيل

---

## ✅ التحقق من النشر

بعد اكتمال البناء:

1. **فتح الموقع:** اضغط على الرابط الموجود في Netlify
2. **اختبار التسجيل:** 
   - اذهب إلى `/login`
   - أدخل رقم الهاتف
   - تحقق من وصول رمز التحقق
3. **اختبار الـ Admin:** تسجيل الدخول كـ admin

---

## 🔄 التحديثات التلقائية

بعد إعداد الـ GitHub integration، سيحدث التالي تلقائياً:

1. ✅ عند push أي commits إلى `main`:
   ```bash
   git push origin main
   ```

2. ✅ Netlify يستشعر التغيير تلقائياً
3. ✅ يبني النسخة الجديدة
4. ✅ ينشر الموقع الجديد

**لا تحتاج لفعل أي شيء يدويّ!** 🤖

---

## 🐛 حل المشاكل الشائعة

### ❌ خطأ: "MONGODB_URI is not defined"
**الحل:** تأكد من إضافة `MONGODB_URI` في Environment Variables على Netlify

### ❌ خطأ: "Failed to authenticate"
**الحل:** 
- تحقق من صحة MongoDB Connection String
- تأكد من أن IP الخادم مسموح في MongoDB Network Access

### ❌ خطأ: "Email not sent"
**الحل:**
- تأكد من `EMAIL_USER` و `APP_PASSWORD` صحيحة
- تأكد من تفعيل 2FA في Gmail
- أعد إنشاء App Password

### ❌ Deploy متكرر بدون تغييرات
**الحل:** اذهب إلى Netlify Settings وعطّل "Auto publish" إذا لم تكن بحاجة إليها

---

## 📊 مراقبة الأداء

Netlify توفر أدوات مراقبة:

1. **Analytics**: Dashboard → Analytics
2. **Performance**: لعرض سرعة الموقع
3. **Logs**: Deploy Logs و Function Logs

---

## 🔐 نصائح الأمان

⚠️ **تذكيرات أمانية:**

1. ✅ **لا تضع secrets في الكود** - استخدم Environment Variables فقط
2. ✅ **استخدم App Passwords** - لا تستخدم كلمة المرور الأساسية لـ Gmail
3. ✅ **Rotate الـ Secrets** - غيّر الـ secrets بشكل دوري
4. ✅ **محدود الوصول** - قيّد وصول الـ GitHub إلى الأفراد الموثوقين فقط

---

## 📞 الدعم والمساعدة

- 📖 [Netlify Documentation](https://docs.netlify.com)
- 📖 [Next.js on Netlify](https://docs.netlify.com/integrations/frameworks/next-js/)
- 💬 [Netlify Support](https://support.netlify.com)

---

**تم التحديث:** نوفمبر 2024