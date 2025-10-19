'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { FaMinus, FaPlus, FaSave, FaTimes, FaHeart } from 'react-icons/fa';
import Image from 'next/image';

interface Product {
  _id: string;
  name: { en: string; ar: string };
  slug: string;
  image: string;
  isAvailable: boolean;
}

export default function NewOrderPage() {
  const { user, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

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
      .map(([productId, quantity]) => ({
        product: productId,
        quantity,
      }));

    if (items.length === 0) {
      setError(t('minimumOrder'));
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, message }),
      });

      if (response.ok) {
        // Show success message
        setShowSuccessMessage(true);
        
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || t('error'));
      }
    } catch (error) {
      setError(t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert(t('enterTemplateName'));
      return;
    }

    const totalItems = getTotalItems();
    if (totalItems === 0) {
      alert(t('selectProductsFirst'));
      return;
    }

    const items = Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({
        product: productId,
        quantity,
      }));

    setSavingTemplate(true);

    try {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName, items }),
      });

      if (response.ok) {
        alert(t('templateSaved'));
        setShowSaveTemplate(false);
        setTemplateName('');
      } else {
        const data = await response.json();
        alert(data.error || t('error'));
      }
    } catch (error) {
      alert(t('error'));
    } finally {
      setSavingTemplate(false);
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
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
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
                  <div className="mt-4 flex items-center justify-between">
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

          {/* Total and Actions */}
          <div className="card bg-gradient-to-r from-primary-black to-dark-gray text-white">
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

              <button
                type="button"
                onClick={() => setShowSaveTemplate(true)}
                disabled={totalItems === 0}
                className="w-full bg-white bg-opacity-10 hover:bg-opacity-20 disabled:bg-opacity-5 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center"
              >
                <FaHeart className="mr-2" />
                {t('saveAsTemplate')}
              </button>
            </div>
          </div>
        </form>

        {/* Save Template Modal */}
        {showSaveTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {t('saveAsTemplate')}
              </h3>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder={t('templateNamePlaceholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                maxLength={50}
              />
              <div className="flex space-x-3 rtl:space-x-reverse">
                <button
                  onClick={handleSaveTemplate}
                  disabled={savingTemplate}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {savingTemplate ? t('saving') : t('save')}
                </button>
                <button
                  onClick={() => {
                    setShowSaveTemplate(false);
                    setTemplateName('');
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}