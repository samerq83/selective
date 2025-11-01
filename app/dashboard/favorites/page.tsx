'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/Navbar';
import { FaHeart, FaTrash, FaShoppingCart, FaPlus } from 'react-icons/fa';

type ProductNameValue = string | { en?: string; ar?: string };

interface FavoriteItem {
  product: {
    _id: string;
    name: ProductNameValue;
    image: string;
    isAvailable: boolean;
  };
  productName: string;
  quantity: number;
}

type FavoriteItemProduct = FavoriteItem['product'];

interface Favorite {
  _id: string;
  name: string;
  items: FavoriteItem[];
  totalItems: number;
  createdAt: string;
}

const resolveProductName = (name: FavoriteItemProduct['name'], language: 'en' | 'ar'): string => {
  if (typeof name === 'string') {
    return name;
  }

  if (language === 'ar') {
    return name?.ar ?? name?.en ?? 'Unknown Product';
  }

  return name?.en ?? name?.ar ?? 'Unknown Product';
};

export default function FavoritesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user?.isAdmin) {
      router.push('/admin');
    } else if (user) {
      fetchFavorites();
    }
  }, [user, authLoading, router]);

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/favorites');
      const data = await response.json();

      if (response.ok) {
        setFavorites(data.favorites);
      } else {
        setError(data.error || 'Failed to load favorites');
      }
    } catch (error) {
      console.error('Fetch favorites error:', error);
      setError('Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmDeleteFavorite'))) return;

    try {
      const response = await fetch(`/api/favorites/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setFavorites(favorites.filter(f => f._id !== id));
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete favorite');
      }
    } catch (error) {
      console.error('Delete favorite error:', error);
      alert('Failed to delete favorite');
    }
  };

  const handleUseTemplate = (favorite: Favorite) => {
    // Store the favorite items in localStorage to use in new order
    const orderData = {
      items: favorite.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
      })),
    };
    localStorage.setItem('orderTemplate', JSON.stringify(orderData));
    router.push('/dashboard/new-order');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-[calc(100vh-64px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">{t('loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaHeart className="text-3xl text-red-500" />
              <h1 className="text-3xl font-bold text-gray-900">
                {t('favoriteOrders')}
              </h1>
            </div>
            <button
              onClick={() => router.push('/dashboard/new-order')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaPlus />
              {t('newOrder')}
            </button>
          </div>
          <p className="mt-2 text-gray-600">
            {t('favoriteOrdersDescription')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {favorites.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FaHeart className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              {t('noFavorites')}
            </h3>
            <p className="text-gray-500 mb-6">
              {t('noFavoritesDescription')}
            </p>
            <button
              onClick={() => router.push('/dashboard/new-order')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('createFirstOrder')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => (
              <div
                key={favorite._id}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {favorite.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {favorite.totalItems} {t('items')}
                      </p>
                    </div>
                    <FaHeart className="text-red-500 text-xl" />
                  </div>

                  <div className="space-y-2 mb-4">
                    {favorite.items.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{item.product.image}</span>
                          <span className="text-gray-700">
                            {resolveProductName(item.product.name, language)}
                          </span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          ×{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUseTemplate(favorite)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <FaShoppingCart />
                      {t('useTemplate')}
                    </button>
                    <button
                      onClick={() => handleDelete(favorite._id)}
                      className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>

                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    {t('created')}: {new Date(favorite.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      calendar: 'gregory'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {favorites.length > 0 && favorites.length < 10 && (
          <div className="mt-6 text-center text-sm text-gray-500">
            {t('favoritesLimit')}: {favorites.length}/10
          </div>
        )}
      </div>
    </div>
  );
}