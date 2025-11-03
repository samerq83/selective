# 🏪 Selective Trading - نظام إدارة طلبات المنتجات اللبنية

نظام عصري لإدارة طلبات وتسويق منتجات لبنية باستخدام **Next.js 14** و **MongoDB** و **Netlify**.

---

## 📋 المتطلبات

قبل البدء، تأكد من تثبيت:

- **Node.js** (v18 أو أحدث) - [تحميل](https://nodejs.org)
- **MongoDB Atlas Account** - [إنشاء حساب مجاني](https://www.mongodb.com/cloud/atlas)
- **Git** - [تحميل](https://git-scm.com)

---

## 🚀 التثبيت والتشغيل المحلي

### 1. استنساخ المستودع
```bash
git clone https://github.com/samerq83/selective.git
cd selective
```

### 2. تثبيت المكتبات
```bash
npm install
```

### 3. إعداد متغيرات البيئة
```bash
# انسخ الملف النموذجي
cp .env.example .env.local

# ثم عدّل .env.local وأضف قيمك الحقيقية:
# - MONGODB_URI: من MongoDB Atlas
# - JWT_SECRET: مفتاح سري عشوائي
# - EMAIL_USER: بريدك الإلكتروني (Gmail)
# - APP_PASSWORD: كلمة مرور تطبيق Gmail
```

### 4. تشغيل السيرفر
```bash
npm run dev
```

الموقع سيكون متاحاً على: **http://localhost:3000**

---

## 🔧 إعداد MongoDB Atlas

1. انتقل إلى [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. أنشئ مجموعة جديدة (Cluster)
3. أنشئ مستخدم قاعدة بيانات
4. احصل على connection string
5. ضعها في `MONGODB_URI` في ملف `.env.local`

**مثال:**
```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/selective-trading
```

---

## 📧 إعداد Gmail للإشعارات البريدية

1. مكّن [App Passwords في حسابك](https://myaccount.google.com/apppasswords)
2. انسخ كلمة المرور المُنتجة
3. ضعها في `APP_PASSWORD` في ملف `.env.local`

---

## 🌐 النشر على Netlify

### خطوات النشر:

1. **ادفع المشروع إلى GitHub:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **انتقل إلى [Netlify](https://www.netlify.com)**
   - اختر "Import from Git"
   - اختر المستودع
   - اختر فرع `main`

3. **أضف متغيرات البيئة في Netlify:**
   - اذهب إلى **Site Settings → Build & Deploy → Environment**
   - أضف جميع المتغيرات من `.env.example`:
     ```
     MONGODB_URI=...
     JWT_SECRET=...
     NEXTAUTH_SECRET=...
     COOKIE_SECRET=...
     EMAIL_USER=...
     APP_PASSWORD=...
     NEXT_PUBLIC_BASE_URL=https://your-site.netlify.app
     NEXTAUTH_URL=https://your-site.netlify.app
     NODE_ENV=production
     ```

4. **انشر الموقع:**
   - اضغط "Deploy"
   - انتظر اكتمال البناء والنشر

---

## 📁 هيكل المشروع

```
selective-trading/
├── app/
│   ├── api/              # API endpoints (Next.js API Routes)
│   ├── admin/            # صفحات Admin Dashboard
│   ├── dashboard/        # صفحات Customer Dashboard
│   ├── login/            # صفحة التسجيل
│   └── signup/           # صفحة إنشاء حساب
├── components/           # React Components
├── lib/                  # Utility Functions
├── models/               # MongoDB Schemas
├── contexts/             # React Contexts (Auth, Language)
├── public/               # Static Assets
├── tests/                # E2E Tests (Playwright)
├── package.json
├── next.config.js
├── tsconfig.json
└── .env.example          # Example environment variables
```

---

## 🧪 الاختبارات

### اختبارات E2E مع Playwright:
```bash
# تشغيل جميع الاختبارات
npm run test:e2e

# تشغيل اختبار محدد
npx playwright test tests/e2e/admin-download-purchase-order.spec.ts

# وضع Debug
npm run test:e2e:debug
```

---

## 🔐 أمان البيانات

⚠️ **تحذير أمني مهم:**

- **لا تضع بيانات حساسة في Git** - ملف `.gitignore` يستثني جميع ملفات `.env`
- استخدم **متغيرات البيئة فقط** للبيانات الحساسة
- في Netlify، استخدم **Environment Variables** في الإعدادات
- استخدم **secrets** قوية وعشوائية للـ JWT و Cookie

---

## 🌍 دعم اللغات

التطبيق يدعم:
- ✅ **العربية** (RTL)
- ✅ **الإنجليزية** (LTR)

يمكن تغيير اللغة من خلال الواجهة مباشرة.

---

## 🤝 المساهمة

إذا أردت المساهمة:

1. عمّل Fork للمستودع
2. أنشئ فرع جديد: `git checkout -b feature/your-feature`
3. أرسل Pull Request

---

## 📞 الدعم

للمساعدة أو الإبلاغ عن مشاكل، تواصل عبر:
- 📧 البريد: mr000000@gmail.com
- 📱 الهاتف: +966XXXXXXXXX

---

## 📄 الترخيص

هذا المشروع مرخص تحت **MIT License**

---

**آخر تحديث:** نوفمبر 2024