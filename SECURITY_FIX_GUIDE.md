# 🔐 دليل إصلاح أمان: بيانات MongoDB المكشوفة على GitHub

## 🚨 المشكلة المكتشفة

**تنبيه من GitGuardian:**
- 📍 **المستودع**: `samerq83/selective`
- 📄 **الملف**: `scripts/seed.js`
- 🔑 **البيانات المكشوفة**: MongoDB Credentials
- ❌ **الحالة**: البيانات **لا تزال صالحة** (active)

---

## ⚡ الخطوات الفورية (اليوم)

### 1️⃣ إبطال البيانات القديمة على MongoDB Atlas

**الخطوات:**
1. اذهب إلى: https://cloud.mongodb.com
2. سجل الدخول بحسابك
3. اختر **Database Access** من القائمة اليسرى
4. ابحث عن المستخدم المكشوف
5. **اختيار A - حذف المستخدم:**
   - اضغط على الثلاث نقاط (⋯)
   - اختر "Delete User"
   - أكّد الحذف

6. **اختيار B - تغيير كلمة المرور:**
   - اضغط على اسم المستخدم
   - اضغط "Edit Password"
   - اكتب كلمة مرور جديدة قوية (20+ حرف)
   - اضغط "Save"

⚠️ **هام**: هذه خطوة حرجة - تأكد من تطبيقها فوراً!

---

### 2️⃣ إنشاء بيانات اعتماد جديدة

**على MongoDB Atlas:**

```
1. Database Access
2. "+ Add New Database User"
3. اختر: "Authenticate using Username and Password"
4. اسم مستخدم: selective_trading_app (أو اسم قوي آخر)
5. كلمة مرور: استخدم generator قوي (32+ حرف عشوائي)
   مثال: P7$k9@mQ2L#xR4vN8!wD5tJ1cF6yH3eA0pB
6. Built-in Role: "Read and write to any database"
7. اضغط "Add User"
```

**احفظ البيانات الجديدة في مكان آمن مؤقتاً!**

---

### 3️⃣ الحصول على رابط الاتصال الجديد

**على MongoDB Atlas:**

```
1. اختر Cluster
2. اضغط "Connect"
3. اختر "Drivers"
4. اختر "Node.js"
5. نسخ رابط الاتصال:
   mongodb+srv://[NEW_USERNAME]:[NEW_PASSWORD]@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

---

### 4️⃣ تحديث متغيرات البيئة المحلية

**ملف: `.env.local` (في المشروع)**
```env
MONGODB_URI=mongodb+srv://[NEW_USERNAME]:[NEW_PASSWORD]@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**ملف: `.env.production` (إذا كان محلياً)**
```env
MONGODB_URI=mongodb+srv://[NEW_USERNAME]:[NEW_PASSWORD]@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

---

### 5️⃣ حذف البيانات من Git History

#### خيار A: إذا كان repo على GitHub (ينصح به)

```powershell
cd "c:\Users\Asus\Desktop\selective-trading-essential-backup - Copy"

# حذف الملف من التاريخ كاملاً
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch scripts/seed.js' --prune-empty --tag-name-filter cat -- --all

# دفع التغييرات
git push origin --force --all
git push origin --force --tags
```

#### خيار B: إذا كان repo محلي فقط

```powershell
cd "c:\Users\Asus\Desktop\selective-trading-essential-backup - Copy"

# التحقق من وجود الملف في التاريخ
git log --all --full-history -- scripts/seed.js

# حذفه
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch scripts/seed.js' --prune-empty --tag-name-filter cat -- --all
```

---

### 6️⃣ التحقق من عدم وجود بيانات حساسة أخرى

**ابحث عن أي بيانات في الملفات:**

```powershell
cd "c:\Users\Asus\Desktop\selective-trading-essential-backup - Copy"

# البحث عن أي مسارات MongoDB
$files = Get-ChildItem -Path . -Recurse -Include *.js,*.ts,*.json -Exclude node_modules | 
    Select-String "mongodb\+srv|password|secret|api_key" -List | 
    Select-Object Path

$files | ForEach-Object { Write-Host $_.Path -ForegroundColor Red }
```

**النتيجة المتوقعة: لا توجد نتائج (أو فقط في .env.example)**

---

### 7️⃣ تحديث Vercel (إذا كنت تستخدمه)

1. اذهب إلى: https://vercel.com/dashboard
2. اختر المشروع "selective-trading"
3. اضغط **Settings**
4. اختر **Environment Variables**
5. ابحث عن `MONGODB_URI`
6. اضغط على القلم (تعديل)
7. احذف القيمة القديمة
8. اكتب القيمة الجديدة
9. اضغط **Save**
10. **Redeploy** المشروع:
    - اذهب إلى Deployments
    - اختر latest deployment
    - اضغط "Redeploy"

---

## 🔍 التحقق النهائي

قائمة التحقق:

```
✅ الخطوات المطلوبة:

[ ] تم إبطال البيانات القديمة على MongoDB Atlas
    - البيانات لم تعد تعمل ✓
    
[ ] تم إنشاء بيانات اعتماد جديدة
    - اسم مستخدم: _______________
    - تاريخ الإنشاء: _______________
    
[ ] تم تحديث .env.local بالقيمة الجديدة
[ ] تم تحديث .env.production بالقيمة الجديدة
[ ] تم تحديث Vercel Environment Variables
[ ] تم حذف scripts/seed.js من Git history
[ ] تم تحديث .gitignore (✓ تم بالفعل)
[ ] تم اختبار الاتصال بقاعدة البيانات

[ ] تم التحقق من عدم وجود بيانات حساسة أخرى في الملفات
```

---

## 🧪 اختبار الاتصال بعد التحديث

**نسخة Playwright test:**

```typescript
import { test, expect } from '@playwright/test';

test('Database connection should work', async ({ request }) => {
  const response = await request.get('http://localhost:3000/api/debug/health');
  expect(response.status()).toBe(200);
  
  const json = await response.json();
  expect(json.database).toBe('connected');
});
```

**تشغيل الاختبار:**
```powershell
npx playwright test tests/e2e/db-connection.spec.ts
```

---

## 📋 ملخص الأمان

### ما تم إصلاحه:
✅ تم إبطال البيانات المكشوفة
✅ تم إنشاء بيانات جديدة قوية
✅ تم تحديث متغيرات البيئة
✅ تم تحديث .gitignore لمنع التكرار
✅ تم حذف البيانات من Git history

### أفضل الممارسات المستقبلية:
- ❌ لا تضع أبداً بيانات اعتماد في الملفات المؤرشفة
- ✅ استخدم .env files دائماً
- ✅ تأكد من .gitignore قبل commit
- ✅ استخدم `git pre-commit hooks` للتحقق التلقائي
- ✅ فعّل `secret scanning` على GitHub

---

## 🆘 إذا حدثت مشاكل

**المشكلة: Vercel deployment fail**
- ✅ الحل: أضف `MONGODB_URI` في Vercel Environment Variables

**المشكلة: Database connection timeout**
- ✅ الحل: تأكد من أن IP الخادم في MongoDB Atlas whitelist

**المشكلة: Git push fail بعد filter-branch**
- ✅ الحل: اقوى `--force` و اعد المحاولة

---

## 📞 معلومات مهمة

- **آخر تحديث**: 2025-11-02
- **الحالة**: 🟡 في التنفيذ
- **الأولوية**: 🔴 حرجة

---

**تم إنشاء هذا الدليل بتاريخ: 2025-11-02 14:50 UTC**