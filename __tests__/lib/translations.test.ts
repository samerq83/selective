import { describe, it, expect } from '@jest/globals';
import { Language } from '../../lib/translations';

// Dynamic import to avoid module issues in tests
const getTranslations = async () => {
  const module = await import('../../lib/translations');
  return {
    t: module.t,
    getDirection: module.getDirection,
    getSupportedLanguages: module.getSupportedLanguages,
    isValidLanguage: module.isValidLanguage
  };
};

describe('Translations Library', () => {
  describe('Language Support', () => {
    it('should support English and Arabic languages', async () => {
      const { getSupportedLanguages } = await getTranslations();
      const supportedLangs = getSupportedLanguages();
      
      expect(supportedLangs).toContain('en');
      expect(supportedLangs).toContain('ar');
      expect(supportedLangs).toHaveLength(2);
    });

    it('should validate language codes', async () => {
      const { isValidLanguage } = await getTranslations();
      
      expect(isValidLanguage('en')).toBe(true);
      expect(isValidLanguage('ar')).toBe(true);
      expect(isValidLanguage('fr')).toBe(false);
      expect(isValidLanguage('invalid')).toBe(false);
      expect(isValidLanguage('')).toBe(false);
    });

    it('should return correct text direction for languages', async () => {
      const { getDirection } = await getTranslations();
      
      expect(getDirection('en')).toBe('ltr');
      expect(getDirection('ar')).toBe('rtl');
    });

    it('should default to ltr for invalid languages', async () => {
      const { getDirection } = await getTranslations();
      
      expect(getDirection('invalid' as Language)).toBe('ltr');
      expect(getDirection('' as Language)).toBe('ltr');
    });
  });

  describe('Translation Function', () => {
    it('should translate common keys in English', async () => {
      const { t } = await getTranslations();
      
      expect(t('welcome', 'en')).toBe('Welcome');
      expect(t('login', 'en')).toBe('Login');
      expect(t('logout', 'en')).toBe('Logout');
      expect(t('save', 'en')).toBe('Save');
      expect(t('cancel', 'en')).toBe('Cancel');
      expect(t('delete', 'en')).toBe('Delete');
      expect(t('edit', 'en')).toBe('Edit');
    });

    it('should translate common keys in Arabic', async () => {
      const { t } = await getTranslations();
      
      expect(t('welcome', 'ar')).toBe('مرحباً');
      expect(t('login', 'ar')).toBe('تسجيل الدخول');
      expect(t('logout', 'ar')).toBe('تسجيل الخروج');
      expect(t('save', 'ar')).toBe('حفظ');
      expect(t('cancel', 'ar')).toBe('إلغاء');
      expect(t('delete', 'ar')).toBe('حذف');
      expect(t('edit', 'ar')).toBe('تعديل');
    });

    it('should translate authentication keys', async () => {
      const { t } = await getTranslations();
      
      // English
      expect(t('phoneNumber', 'en')).toBe('Phone Number');
      expect(t('loginButton', 'en')).toBe('Login / Sign Up');
      expect(t('verifyEmail', 'en')).toBe('Verify Your Email');
      
      // Arabic
      expect(t('phoneNumber', 'ar')).toBe('رقم الهاتف');
      expect(t('loginButton', 'ar')).toBe('دخول / تسجيل جديد');
      expect(t('verifyEmail', 'ar')).toBe('تحقق من بريدك الإلكتروني');
    });

    it('should translate product-related keys', async () => {
      const { t } = await getTranslations();
      
      // English
      expect(t('products', 'en')).toBe('Products');
      expect(t('almond', 'en')).toBe('Almond Milk');
      expect(t('coconut', 'en')).toBe('Coconut Milk');
      expect(t('available', 'en')).toBe('Available');
      
      // Arabic
      expect(t('products', 'ar')).toBe('المنتجات');
      expect(t('almond', 'ar')).toBe('لبن اللوز');
      expect(t('coconut', 'ar')).toBe('لبن جوز الهند');
      expect(t('available', 'ar')).toBe('متوفر');
    });

    it('should translate order-related keys', async () => {
      const { t } = await getTranslations();
      
      // English
      expect(t('orders', 'en')).toBe('Orders');
      expect(t('newOrder', 'en')).toBe('New Order');
      expect(t('orderNumber', 'en')).toBe('Order Number');
      expect(t('quantity', 'en')).toBe('Quantity');
      
      // Arabic
      expect(t('orders', 'ar')).toBe('الطلبات');
      expect(t('newOrder', 'ar')).toBe('طلب جديد');
      expect(t('orderNumber', 'ar')).toBe('رقم الطلب');
      expect(t('quantity', 'ar')).toBe('الكمية');
    });

    it('should translate admin-related keys', async () => {
      const { t } = await getTranslations();
      
      // English
      expect(t('admin', 'en')).toBe('Admin');
      expect(t('adminPanel', 'en')).toBe('Admin Panel');
      expect(t('manageProducts', 'en')).toBe('Manage Products');
      expect(t('customers', 'en')).toBe('Customers');
      
      // Arabic
      expect(t('admin', 'ar')).toBe('المدير');
      expect(t('adminPanel', 'ar')).toBe('لوحة التحكم');
      expect(t('manageProducts', 'ar')).toBe('إدارة المنتجات');
      expect(t('customers', 'ar')).toBe('العملاء');
    });

    it('should handle missing translation keys', async () => {
      const { t } = await getTranslations();
      
      const nonExistentKey = 'nonExistentTranslationKey' as any;
      expect(t(nonExistentKey, 'en')).toBe(nonExistentKey);
      expect(t(nonExistentKey, 'ar')).toBe(nonExistentKey);
    });

    it('should default to English for invalid language codes', async () => {
      const { t } = await getTranslations();
      
      expect(t('welcome', 'invalid' as Language)).toBe('Welcome');
      expect(t('login', 'xyz' as Language)).toBe('Login');
    });

    it('should handle empty string keys', async () => {
      const { t } = await getTranslations();
      
      const emptyKey = '' as any;
      expect(t(emptyKey, 'en')).toBe('');
      expect(t(emptyKey, 'ar')).toBe('');
    });
  });

  describe('Status Translations', () => {
    it('should translate order status values', async () => {
      const { t } = await getTranslations();
      
      // English
      expect(t('new', 'en')).toBe('New');
      expect(t('received', 'en')).toBe('Received');
      
      // Arabic
      expect(t('new', 'ar')).toBe('جديد');
      expect(t('received', 'ar')).toBe('مستلم');
    });

    it('should translate customer status values', async () => {
      const { t } = await getTranslations();
      
      // English
      expect(t('active', 'en')).toBe('Active');
      expect(t('inactive', 'en')).toBe('Inactive');
      
      // Arabic
      expect(t('active', 'ar')).toBe('نشط');
      expect(t('inactive', 'ar')).toBe('غير نشط');
    });
  });

  describe('Message Translations', () => {
    it('should translate success messages', async () => {
      const { t } = await getTranslations();
      
      // English
      expect(t('orderCreated', 'en')).toBe('Order created successfully');
      expect(t('orderUpdated', 'en')).toBe('Order updated successfully');
      expect(t('profileUpdated', 'en')).toBe('Profile updated successfully');
      
      // Arabic
      expect(t('orderCreated', 'ar')).toBe('تم إنشاء الطلب بنجاح');
      expect(t('orderUpdated', 'ar')).toBe('تم تحديث الطلب بنجاح');
      expect(t('profileUpdated', 'ar')).toBe('تم تحديث الملف الشخصي بنجاح');
    });

    it('should translate error messages', async () => {
      const { t } = await getTranslations();
      
      // English
      expect(t('error', 'en')).toBe('An error occurred');
      expect(t('orderNotFound', 'en')).toBe('Order not found');
      expect(t('cannotEdit', 'en')).toBe('Cannot edit order after it has been received');
      
      // Arabic
      expect(t('error', 'ar')).toBe('حدث خطأ');
      expect(t('orderNotFound', 'ar')).toBe('الطلب غير موجود');
      expect(t('cannotEdit', 'ar')).toBe('لا يمكن تعديل الطلب بعد استلامه');
    });
  });

  describe('Form Field Translations', () => {
    it('should translate form labels and placeholders', async () => {
      const { t } = await getTranslations();
      
      // English
      expect(t('fullName', 'en')).toBe('Full Name');
      expect(t('enterName', 'en')).toBe('Enter your full name');
      expect(t('customerPhone', 'en')).toBe('Customer Phone');
      expect(t('messagePlaceholder', 'en')).toBe('Add any special notes or instructions...');
      
      // Arabic
      expect(t('fullName', 'ar')).toBe('الاسم الكامل');
      expect(t('enterName', 'ar')).toBe('أدخل اسمك الكامل');
      expect(t('customerPhone', 'ar')).toBe('هاتف العميل');
      expect(t('messagePlaceholder', 'ar')).toBe('أضف أي ملاحظات أو تعليمات خاصة...');
    });
  });

  describe('Navigation Translations', () => {
    it('should translate navigation items', async () => {
      const { t } = await getTranslations();
      
      // English
      expect(t('dashboard', 'en')).toBe('Dashboard');
      expect(t('profile', 'en')).toBe('Profile');
      expect(t('quickOrder', 'en')).toBe('Quick Order');
      expect(t('favoriteOrders', 'en')).toBe('Favorite Orders');
      
      // Arabic
      expect(t('dashboard', 'ar')).toBe('لوحة التحكم');
      expect(t('profile', 'ar')).toBe('الملف الشخصي');
      expect(t('quickOrder', 'ar')).toBe('طلب سريع');
      expect(t('favoriteOrders', 'ar')).toBe('الطلبات المفضلة');
    });
  });

  describe('Date and Time Translations', () => {
    it('should translate time-related keys', async () => {
      const { t } = await getTranslations();
      
      // English
      expect(t('createdAt', 'en')).toBe('Created at');
      expect(t('orderDate', 'en')).toBe('Order Date');
      expect(t('joinDate', 'en')).toBe('Join Date');
      expect(t('never', 'en')).toBe('Never');
      
      // Arabic
      expect(t('createdAt', 'ar')).toBe('تاريخ الإنشاء');
      expect(t('orderDate', 'ar')).toBe('تاريخ الطلب');
      expect(t('joinDate', 'ar')).toBe('تاريخ الانضمام');
      expect(t('never', 'ar')).toBe('أبداً');
    });
  });

  describe('Notification Translations', () => {
    it('should translate notification-related keys', async () => {
      const { t } = await getTranslations();
      
      // English
      expect(t('notifications', 'en')).toBe('Notifications');
      expect(t('noNotifications', 'en')).toBe('No notifications');
      expect(t('markAllRead', 'en')).toBe('Mark all as read');
      
      // Arabic
      expect(t('notifications', 'ar')).toBe('الإشعارات');
      expect(t('noNotifications', 'ar')).toBe('لا توجد إشعارات');
      expect(t('markAllRead', 'ar')).toBe('تحديد الكل كمقروء');
    });
  });

  describe('Action Buttons Translations', () => {
    it('should translate action button texts', async () => {
      const { t } = await getTranslations();
      
      // English
      expect(t('view', 'en')).toBe('View');
      expect(t('viewDetails', 'en')).toBe('View Details');
      expect(t('saveChanges', 'en')).toBe('Save Changes');
      expect(t('back', 'en')).toBe('Back');
      expect(t('continue', 'en')).toBe('Continue');
      
      // Arabic
      expect(t('view', 'ar')).toBe('عرض');
      expect(t('viewDetails', 'ar')).toBe('عرض التفاصيل');
      expect(t('saveChanges', 'ar')).toBe('حفظ التغييرات');
      expect(t('back', 'ar')).toBe('رجوع');
      expect(t('continue', 'ar')).toBe('متابعة');
    });
  });

  describe('Validation Message Translations', () => {
    it('should translate validation messages', async () => {
      const { t } = await getTranslations();
      
      // English
      expect(t('minimumOrder', 'en')).toBe('Minimum order is 2 items');
      expect(t('fillAllFields', 'en')).toBe('Please fill all fields');
      expect(t('selectProductsFirst', 'en')).toBe('Please select products first');
      
      // Arabic
      expect(t('minimumOrder', 'ar')).toBe('الحد الأدنى للطلب هو قطعتين');
      expect(t('fillAllFields', 'ar')).toBe('يرجى ملء جميع الحقول');
      expect(t('selectProductsFirst', 'ar')).toBe('يرجى اختيار المنتجات أولاً');
    });
  });

  describe('Loading States Translations', () => {
    it('should translate loading and empty states', async () => {
      const { t } = await getTranslations();
      
      // English
      expect(t('loading', 'en')).toBe('Loading...');
      expect(t('saving', 'en')).toBe('Saving...');
      expect(t('noData', 'en')).toBe('No data available');
      expect(t('noOrders', 'en')).toBe('No orders yet');
      
      // Arabic
      expect(t('loading', 'ar')).toBe('جاري التحميل...');
      expect(t('saving', 'ar')).toBe('جاري الحفظ...');
      expect(t('noData', 'ar')).toBe('لا توجد بيانات');
      expect(t('noOrders', 'ar')).toBe('لا توجد طلبات بعد');
    });
  });
});