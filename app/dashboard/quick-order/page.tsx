'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/translations';
import Navbar from '@/components/Navbar';
import { FiStar, FiRefreshCw, FiShoppingCart, FiTrash2 } from 'react-icons/fi';

interface OrderItem {
  product: {
    _id: string;
    nameEn: string;
    nameAr: string;
    image: string;
  };
  quantity: number;
}

interface FavoriteOrder {
  _id: string;
  name: string;
  items: OrderItem[];
  createdAt: string;
}

interface LastOrder {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  createdAt: string;
}

export default function QuickOrderPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, direction } = useLanguage();
  const [favorites, setFavorites] = useState<FavoriteOrder[]>([]);
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch favorites
      const favRes = await fetch('/api/favorites');
      if (favRes.ok) {
        const favData = await favRes.json();
        setFavorites(favData);
      }

      // Fetch last order
      const ordersRes = await fetch('/api/orders?limit=1');
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (ordersData.orders && ordersData.orders.length > 0) {
          setLastOrder(ordersData.orders[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReorderLast = () => {
    if (!lastOrder) return;

    // Save order items to localStorage
    const reorderData = lastOrder.items.map(item => ({
      productId: item.product._id,
      quantity: item.quantity,
    }));

    localStorage.setItem('reorderData', JSON.stringify(reorderData));

    // Show success message
    setShowSuccessMessage(true);

    // Redirect after 1 second
    setTimeout(() => {
      router.push('/dashboard/new-order');
    }, 1000);
  };

  const handleUseFavorite = async (favorite: FavoriteOrder) => {
    const items = favorite.items.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
    }));

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(t('orderCreated', language));
        router.push(`/dashboard/orders/${data._id}`);
      } else {
        const error = await res.json();
        alert(error.error || t('errorCreatingOrder', language));
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert(t('errorCreatingOrder', language));
    }
  };

  const handleDeleteFavorite = async (id: string) => {
    if (!confirm(t('confirmDeleteFavorite', language))) return;

    try {
      const res = await fetch(`/api/favorites/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setFavorites(favorites.filter(f => f._id !== id));
        alert(t('favoriteDeleted', language));
      }
    } catch (error) {
      console.error('Error deleting favorite:', error);
      alert(t('errorDeletingFavorite', language));
    }
  };

  const getTotalItems = (items: OrderItem[]) => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={direction}>
      <Navbar />
      
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slideDown">
          <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="font-semibold">{language === 'ar' ? 'جاري تحميل الطلب...' : 'Loading order...'}</p>
              <p className="text-sm">{language === 'ar' ? 'سيتم التحويل إلى صفحة الطلب الجديد' : 'Redirecting to new order page'}</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {t('quickOrder', language)}
        </h1>

        {/* Reorder Last Order */}
        {lastOrder && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FiRefreshCw className="text-primary-red" />
                {t('reorderLast', language)}
              </h2>
              <button
                onClick={handleReorderLast}
                className="btn-primary flex items-center gap-2"
              >
                <FiShoppingCart />
                {t('reorder', language)}
              </button>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-3">
                {t('orderNumber', language)}: {lastOrder.orderNumber} • {new Date(lastOrder.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {lastOrder.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <img 
                      src={item.product.image || '/images/placeholder.png'} 
                      alt={language === 'ar' ? item.product.nameAr : item.product.nameEn}
                      className="w-10 h-10 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {language === 'ar' ? item.product.nameAr : item.product.nameEn}
                      </p>
                      <p className="text-gray-600">×{item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm font-semibold text-gray-900 mt-3">
                {t('total', language)}: {getTotalItems(lastOrder.items)} {t('pieces', language)}
              </p>
            </div>
          </div>
        )}

        {/* Favorite Orders */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FiStar className="text-primary-red" />
              {t('favoriteOrders', language)}
            </h2>
            <button
              onClick={() => router.push('/dashboard/new-order?saveFavorite=true')}
              className="btn-outline"
            >
              {t('addFavorite', language)}
            </button>
          </div>

          {favorites.length === 0 ? (
            <div className="text-center py-12">
              <FiStar className="mx-auto text-6xl text-gray-300 mb-4" />
              <p className="text-gray-600 mb-4">{t('noFavorites', language)}</p>
              <button
                onClick={() => router.push('/dashboard/new-order?saveFavorite=true')}
                className="btn-primary"
              >
                {t('createFirstFavorite', language)}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {favorites.map(favorite => (
                <div key={favorite._id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900">{favorite.name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUseFavorite(favorite)}
                        className="p-2 text-primary-red hover:bg-red-50 rounded-lg transition-colors"
                        title={t('useThisFavorite', language)}
                      >
                        <FiShoppingCart />
                      </button>
                      <button
                        onClick={() => handleDeleteFavorite(favorite._id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('delete', language)}
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    {favorite.items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <img 
                            src={item.product.image || '/images/placeholder.png'} 
                            alt={language === 'ar' ? item.product.nameAr : item.product.nameEn}
                            className="w-8 h-8 object-cover rounded"
                          />
                          <span className="text-gray-900">
                            {language === 'ar' ? item.product.nameAr : item.product.nameEn}
                          </span>
                        </div>
                        <span className="font-semibold text-gray-900">×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-3 border-t flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      {t('total', language)}: {getTotalItems(favorite.items)} {t('pieces', language)}
                    </span>
                    <button
                      onClick={() => handleUseFavorite(favorite)}
                      className="btn-primary text-sm py-1 px-3"
                    >
                      {t('order', language)}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}