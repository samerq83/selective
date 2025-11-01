'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { FaMinus, FaPlus, FaSave, FaTimes, FaUpload, FaCheck, FaTimes as FaX } from 'react-icons/fa';
import Image from 'next/image';

interface Product {
  _id: string;
  name: { en: string; ar: string };
  slug: string;
  image: string;
  isAvailable: boolean;
  unitType: 'carton' | 'piece' | 'both';
}

export default function NewOrderPage() {
  const { user, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [selectedUnits, setSelectedUnits] = useState<{ [key: string]: 'carton' | 'piece' }>({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [purchaseOrderFile, setPurchaseOrderFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    } else if (user?.isAdmin) {
      router.push('/admin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    fetchProducts();
    loadTemplate();
    loadReorderData();
  }, []);

  const loadTemplate = () => {
    const template = localStorage.getItem('orderTemplate');
    if (template) {
      try {
        const data = JSON.parse(template);
        const newQuantities: { [key: string]: number } = {};
        data.items.forEach((item: any) => {
          newQuantities[item.product] = item.quantity;
        });
        setQuantities(newQuantities);
        localStorage.removeItem('orderTemplate');
      } catch (error) {
        console.error('Error loading template:', error);
      }
    }
  };

  const loadReorderData = () => {
    const reorderData = localStorage.getItem('reorderData');
    if (reorderData) {
      try {
        const data = JSON.parse(reorderData);
        const newQuantities: { [key: string]: number } = {};
        data.forEach((item: any) => {
          newQuantities[item.productId] = item.quantity;
        });
        setQuantities(newQuantities);
        localStorage.removeItem('reorderData');
      } catch (error) {
        console.error('Error loading reorder data:', error);
      }
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const updateQuantity = (productId: string, change: number) => {
    setQuantities((prev) => {
      const current = prev[productId] || 0;
      const newValue = Math.max(0, current + change);
      return { ...prev, [productId]: newValue };
    });
  };

  const getTotalItems = () => {
    return Object.values(quantities).reduce((sum, qty) => sum + qty, 0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setFileError('');
    
    if (!file) {
      setPurchaseOrderFile(null);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setFileError(language === 'ar' 
        ? 'نوع الملف غير مدعوم. الرجاء رفع صورة (JPG, PNG, GIF) أو PDF'
        : 'File type not supported. Please upload an image (JPG, PNG, GIF) or PDF');
      setPurchaseOrderFile(null);
      return;
    }

    if (file.size > maxSize) {
      setFileError(language === 'ar' 
        ? 'حجم الملف كبير جداً. الحد الأقصى 5 MB'
        : 'File size is too large. Maximum 5 MB');
      setPurchaseOrderFile(null);
      return;
    }

    setPurchaseOrderFile(file);
  };

  const removeFile = () => {
    setPurchaseOrderFile(null);
    setFileError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const totalItems = getTotalItems();
    if (totalItems < 2) {
      setError(t('minimumOrder'));
      return;
    }

    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const product = products.find(p => p._id === productId);
        return {
          product: productId,
          quantity,
          // If product has both option, send the selected unit type, otherwise send the product's unit type
          selectedUnitType: product?.unitType === 'both' 
            ? (selectedUnits[productId] || 'piece')
            : (product?.unitType === 'carton' ? 'carton' : 'piece'),
        };
      });

    if (items.length === 0) {
      setError(t('minimumOrder'));
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('items', JSON.stringify(items));
      formData.append('message', message);
      
      if (purchaseOrderFile) {
        formData.append('purchaseOrderFile', purchaseOrderFile);
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        
        setShowSuccessMessage(true);
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        const data = await response.json();
        console.error('Order submission failed:', data);
        setError(data.error || t('error'));
      }
    } catch (error) {
      console.error('Order submission error:', error);
      setError(t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user || user.isAdmin) {
    return null;
  }

  const totalItems = getTotalItems();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slideDown">
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="font-semibold">{language === 'ar' ? 'تم تقديم الطلب بنجاح!' : 'Order submitted successfully!'}</p>
              <p className="text-sm">{language === 'ar' ? 'جاري التحويل...' : 'Redirecting...'}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-black mb-2">
            {t('newOrder')}
          </h1>
          <p className="text-gray-600">
            {t('minimumOrder')}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {products && products.length > 0 ? products.map((product) => (
              <div
                key={product._id}
                className={`card ${
                  !product.isAvailable ? 'opacity-50' : 'card-hover'
                }`}
              >
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                  <div className="w-20 h-20 bg-white rounded-lg flex items-center justify-center overflow-hidden">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name[language]}
                        width={80}
                        height={80}
                        className="w-full h-full object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="text-4xl">🥛</span>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-primary-black">
                      {product.name[language]}
                    </h3>
                    {!product.isAvailable && (
                      <span className="badge badge-unavailable mt-1">
                        {t('unavailable')}
                      </span>
                    )}
                  </div>
                </div>

                {product.isAvailable && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-600">
                        {t('quantity')}:
                      </span>
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <button
                          type="button"
                          onClick={() => updateQuantity(product._id, -1)}
                          className="w-10 h-10 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <FaMinus />
                        </button>
                        <span className="text-xl font-bold w-12 text-center">
                          {quantities[product._id] || 0}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(product._id, 1)}
                          className="w-10 h-10 bg-primary-red hover:bg-accent-red text-white rounded-lg flex items-center justify-center transition-colors"
                        >
                          <FaPlus />
                        </button>
                      </div>
                    </div>
                    
                    {/* Display Unit Type */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-600">
                        {language === 'ar' ? 'نوع الوحدة' : 'Unit Type'}:
                      </span>
                      
                      {/* If unitType is 'both', show dropdown for selection */}
                      {product.unitType === 'both' ? (
                        <select
                          value={selectedUnits[product._id] || 'carton'}
                          onChange={(e) => setSelectedUnits({
                            ...selectedUnits,
                            [product._id]: e.target.value as 'carton' | 'piece'
                          })}
                          className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent text-sm"
                        >
                          <option value="carton">
                            {language === 'ar' ? 'كرتون' : 'Carton'}
                          </option>
                          <option value="piece">
                            {language === 'ar' ? 'قطعة' : 'Piece'}
                          </option>
                        </select>
                      ) : (
                        /* If unitType is 'carton' or 'piece', display as text */
                        <span className="text-sm font-semibold text-primary-red">
                          {product.unitType === 'carton' 
                            ? (language === 'ar' ? 'كرتون' : 'Carton')
                            : (language === 'ar' ? 'قطعة' : 'Piece')
                          }
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )) : (
              <div className="col-span-2 text-center py-8 text-gray-500">
                {t('noProducts')}
              </div>
            )}
          </div>

          {/* Message */}
          <div className="card mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('addMessage')}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('messagePlaceholder')}
              className="input-field px-4 resize-none"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-2">
              {message.length}/500
            </p>
          </div>

          {/* Purchase Order File Upload */}
          <div className="card mb-8">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {language === 'ar' ? 'طلب الشراء (اختياري)' : 'Purchase Order (Optional)'}
            </label>
            <p className="text-xs text-gray-600 mb-4">
              {language === 'ar' 
                ? 'يمكنك رفع صورة أو ملف PDF لطلب الشراء'
                : 'You can upload an image or PDF file of the purchase order'}
            </p>
            
            {!purchaseOrderFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => document.getElementById('fileInput')?.click()}>
                <FaUpload className="mx-auto text-4xl text-gray-400 mb-3" />
                <p className="text-sm font-semibold text-gray-700">
                  {language === 'ar' ? 'اختر ملف أو اسحبه هنا' : 'Choose a file or drag it here'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {language === 'ar' 
                    ? 'صيغ مدعومة: JPG, PNG, GIF, PDF - الحد الأقصى 5 MB'
                    : 'Supported formats: JPG, PNG, GIF, PDF - Max 5 MB'}
                </p>
                <input
                  id="fileInput"
                  type="file"
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/gif,application/pdf"
                  className="hidden"
                />
              </div>
            ) : (
              <div className="border border-green-300 bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FaCheck className="text-green-600 text-lg" />
                    <div>
                      <p className="font-semibold text-gray-700">{purchaseOrderFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(purchaseOrderFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <FaX />
                  </button>
                </div>
              </div>
            )}
            
            {fileError && (
              <div className="mt-3 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
                {fileError}
              </div>
            )}
          </div>

          {/* Total and Actions */}
          <div className="card bg-gradient-to-r from-black to-gray-900 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm opacity-80">{t('totalItems')}</p>
                <p className="text-4xl font-bold">{totalItems}</p>
              </div>
              {totalItems < 2 && (
                <div className="bg-red-500 bg-opacity-20 px-4 py-2 rounded-lg">
                  <p className="text-sm font-semibold">
                    {t('minimumOrder')}
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500 bg-opacity-20 border border-red-400 text-white px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <div className="flex flex-col space-y-3">
              <div className="flex space-x-4 rtl:space-x-reverse">
                <button
                  type="submit"
                  disabled={submitting || totalItems < 2}
                  className="flex-1 bg-primary-red hover:bg-accent-red disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <div className="spinner border-white border-t-transparent w-5 h-5 mr-2"></div>
                      {t('loading')}
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      {t('createOrder')}
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 flex items-center"
                >
                  <FaTimes className="mr-2" />
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}