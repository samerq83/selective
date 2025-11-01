'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/translations';
import AdminNavbar from '@/components/AdminNavbar';
import { FiEdit2, FiToggleLeft, FiToggleRight, FiArrowLeft, FiPlus, FiTrash2 } from 'react-icons/fi';

interface Product {
  _id: string;
  name: {
    en: string;
    ar: string;
  };
  image: string;
  isAvailable: boolean;
  unitType: 'carton' | 'piece' | 'both';
  order: number;
}

export default function AdminProductsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, direction } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [unitType, setUnitType] = useState<'carton' | 'piece' | 'both'>('carton');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (!user.isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchProducts();
  }, [user]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !currentStatus }),
      });

      if (res.ok) {
        fetchProducts();
      } else {
        alert(t('error', language));
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert(t('error', language));
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNameEn(product.name.en);
    setNameAr(product.name.ar);
    setImageUrl(product.image || '');
    setUnitType(product.unitType || 'carton');
  };

  const handleSaveEdit = async () => {
    if (!editingProduct || !nameEn.trim() || !nameAr.trim()) {
      alert(t('fillAllFields', language));
      return;
    }

    try {
      const res = await fetch(`/api/products/${editingProduct._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nameEn, nameAr, image: imageUrl, unitType }),
      });

      if (res.ok) {
        alert(t('productUpdated', language));
        setEditingProduct(null);
        setNameEn('');
        setNameAr('');
        setImageUrl('');
        setUnitType('carton');
        fetchProducts();
      } else {
        alert(t('error', language));
      }
    } catch (error) {
      console.error('Error updating product:', error);
      alert(t('error', language));
    }
  };

  const handleAddProduct = async () => {
    if (!nameEn.trim() || !nameAr.trim()) {
      alert(t('fillAllFields', language));
      return;
    }

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nameEn, 
          nameAr, 
          image: imageUrl || '/images/placeholder.png',
          unitType,
          isAvailable: true 
        }),
      });

      if (res.ok) {
        alert(t('productAdded', language));
        setShowAddModal(false);
        setNameEn('');
        setNameAr('');
        setImageUrl('');
        setUnitType('carton');
        fetchProducts();
      } else {
        alert(t('error', language));
      }
    } catch (error) {
      console.error('Error adding product:', error);
      alert(t('error', language));
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm(t('confirmDelete', language))) {
      return;
    }

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert(t('productDeleted', language));
        fetchProducts();
      } else {
        alert(t('error', language));
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(t('error', language));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(language === 'ar' ? 'يرجى اختيار صورة فقط' : 'Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(language === 'ar' ? 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت' : 'Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setImageUrl(data.url);
      } else {
        alert(t('error', language));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(t('error', language));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={direction}>
      <AdminNavbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('manageProducts', language)}
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <FiPlus />
              {t('addProduct', language)}
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="btn-outline flex items-center gap-2"
            >
              <FiArrowLeft />
              {t('back', language)}
            </button>
          </div>
        </div>

        {/* Edit Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('editProduct', language)}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('nameEnglish', language)}
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('nameArabic', language)}
                  </label>
                  <input
                    type="text"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'صورة المنتج' : 'Product Image'}
                  </label>
                  
                  {/* Image Preview */}
                  {imageUrl && (
                    <div className="mb-3">
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                  
                  {/* Upload Button */}
                  <div className="flex gap-2">
                    <label className="btn-primary cursor-pointer flex items-center gap-2 flex-1 justify-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      {uploading ? (
                        <span>{language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}</span>
                      ) : (
                        <span>{language === 'ar' ? 'اختر صورة' : 'Choose Image'}</span>
                      )}
                    </label>
                  </div>
                  
                  {/* Optional: Manual URL Input */}
                  <div className="mt-2">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent text-sm"
                      placeholder={language === 'ar' ? 'أو أدخل رابط الصورة' : 'Or enter image URL'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'نوع الوحدة' : 'Unit Type'}
                  </label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value as 'carton' | 'piece' | 'both')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
                  >
                    <option value="carton">
                      {language === 'ar' ? 'كرتون' : 'Carton'}
                    </option>
                    <option value="piece">
                      {language === 'ar' ? 'قطعة' : 'Piece'}
                    </option>
                    <option value="both">
                      {language === 'ar' ? 'كرتون وقطعة' : 'Carton & Piece'}
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  className="btn-primary flex-1"
                >
                  {t('save', language)}
                </button>
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setNameEn('');
                    setNameAr('');
                    setImageUrl('');
                    setUnitType('carton');
                  }}
                  className="btn-outline flex-1"
                >
                  {t('cancel', language)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Product Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {t('addProduct', language)}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('nameEnglish', language)}
                  </label>
                  <input
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('nameArabic', language)}
                  </label>
                  <input
                    type="text"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'صورة المنتج' : 'Product Image'}
                  </label>
                  
                  {/* Image Preview */}
                  {imageUrl && (
                    <div className="mb-3">
                      <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="w-32 h-32 object-cover rounded-lg border"
                      />
                    </div>
                  )}
                  
                  {/* Upload Button */}
                  <div className="flex gap-2">
                    <label className="btn-primary cursor-pointer flex items-center gap-2 flex-1 justify-center">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      {uploading ? (
                        <span>{language === 'ar' ? 'جاري الرفع...' : 'Uploading...'}</span>
                      ) : (
                        <span>{language === 'ar' ? 'اختر صورة' : 'Choose Image'}</span>
                      )}
                    </label>
                  </div>
                  
                  {/* Optional: Manual URL Input */}
                  <div className="mt-2">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent text-sm"
                      placeholder={language === 'ar' ? 'أو أدخل رابط الصورة' : 'Or enter image URL'}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'نوع الوحدة' : 'Unit Type'}
                  </label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value as 'carton' | 'piece' | 'both')}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
                  >
                    <option value="carton">
                      {language === 'ar' ? 'كرتون' : 'Carton'}
                    </option>
                    <option value="piece">
                      {language === 'ar' ? 'قطعة' : 'Piece'}
                    </option>
                    <option value="both">
                      {language === 'ar' ? 'كرتون وقطعة' : 'Carton & Piece'}
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddProduct}
                  className="btn-primary flex-1"
                >
                  {t('add', language)}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNameEn('');
                    setNameAr('');
                    setImageUrl('');
                    setUnitType('carton');
                  }}
                  className="btn-outline flex-1"
                >
                  {t('cancel', language)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {products.map(product => (
            <div
              key={product._id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <img
                  src={product.image || '/images/placeholder.png'}
                  alt={language === 'ar' ? product.name.ar : product.name.en}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">
                    {language === 'ar' ? product.name.ar : product.name.en}
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {language === 'ar' ? product.name.en : product.name.ar}
                  </p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <FiEdit2 />
                      {t('edit', language)}
                    </button>
                    
                    <button
                      onClick={() => handleDeleteProduct(product._id)}
                      className="flex items-center gap-1 px-2 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <FiTrash2 />
                      {t('delete', language)}
                    </button>
                    
                    <button
                      onClick={() => handleToggleAvailability(product._id, product.isAvailable)}
                      className={`flex items-center gap-1 px-2 py-1 text-sm rounded-lg transition-colors ${
                        product.isAvailable
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-orange-600 hover:bg-orange-50'
                      }`}
                    >
                      {product.isAvailable ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
                      {product.isAvailable ? t('available', language) : t('unavailable', language)}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
          <p className="text-blue-800 text-sm">
            <strong>{t('note', language)}:</strong> {t('productAvailabilityNote', language)}
          </p>
        </div>
      </div>
    </div>
  );
}