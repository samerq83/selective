# 🚀 ابدأ من هنا

## المشكلة:
بيانات MongoDB مكشوفة على GitHub - **يجب إصلاحها الآن!**

---

## ⏱️ أقصر طريق (20 دقيقة):

### 1️⃣ MongoDB (5 دقائق)
1. اذهب إلى: https://cloud.mongodb.com
2. Database Access
3. احذف/غيّر المستخدم القديم
4. أنشئ مستخدم جديد
5. انسخ رابط الاتصال الجديد

### 2️⃣ البيئة (2 دقيقة)
```
.env.local → أضف MONGODB_URI الجديد
.env.production → أضف MONGODB_URI الجديد
```

### 3️⃣ Vercel (10 دقائق)
1. اذهب إلى: https://vercel.com/dashboard
2. selective-trading → Settings → Environment Variables
3. حدّث MONGODB_URI
4. اضغط Save ثم Redeploy

### 4️⃣ Git (3 دقائق)
```powershell
cd "c:\Users\Asus\Desktop\selective-trading-essential-backup - Copy"
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch scripts/seed.js' --prune-empty --tag-name-filter cat -- --all
git push origin --force --all
```

---

## 📚 للمزيد من التفاصيل:

| اقرأ | لـ |
|------|-----|
| `SECURITY_QUICK_START.md` | ملخص سريع (5 دقائق) |
| `SECURITY_CHECKLIST.md` | قائمة تفصيلية |
| `SECURITY_FIX_GUIDE.md` | دليل شامل |

---

## 🚀 ابدأ الآن!

👉 **اذهب إلى MongoDB الآن وغيّر البيانات**