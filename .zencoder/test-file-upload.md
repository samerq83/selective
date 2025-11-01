# 🧪 اختبار رفع الملفات في MongoDB

## ✅ الخطوات المطلوبة للاختبار

### 1. تشغيل السيرفر محليًا
```bash
npm run dev
```
السيرفر سيكون متاحًا على: `http://localhost:3000`

### 2. اختبار رفع طلب بملف

استخدم Postman أو curl:

```bash
# إنشاء ملف اختبار
echo "test data" > test-file.txt

# رفع الطلب مع الملف
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "items={\"product\":\"...\",\"quantity\":2}" \
  -F "message=test order" \
  -F "purchaseOrderFile=@test-file.txt"
```

### 3. التحقق من MongoDB

في MongoDB Compass أو mongosh:

```javascript
db.orders.findOne({ "purchaseOrderFile.data": { $exists: true } })
```

يجب أن ترى:
```json
{
  "purchaseOrderFile": {
    "filename": "test-file.txt",
    "contentType": "text/plain",
    "data": "dGVzdCBkYXRhCg==", // base64
    "uploadedAt": "2024-..."
  }
}
```

### 4. اختبار تحميل الملف

```bash
curl -X GET http://localhost:3000/api/orders/download-file?orderId=<ORDER_ID> \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o downloaded-file.txt

cat downloaded-file.txt  # يجب أن ترى "test data"
```

### 5. الاختبار على Netlify

بعد رفع إلى GitHub:
1. انتظر بناء Netlify
2. جرب رفع ملف من `https://selectiveco.netlify.app`
3. تحقق من MongoDB

## 📊 النتائج المتوقعة

✅ الملف يُحفظ في MongoDB كـ base64  
✅ الملف يُحمّل بشكل صحيح عبر API  
✅ لا توجد أخطاء ERR_CONNECTION_CLOSED على Netlify  
✅ الملف يبقى متاحًا بعد إعادة تشغيل الخادم

## ⚠️ ملاحظات

- تأكد من تعيين Token صحيح في Authorization
- MongoDB يجب أن يكون متصل
- البيانات القديمة (مع `path`) ستبقى كما هي (توافق كامل)