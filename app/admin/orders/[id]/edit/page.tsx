'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/translations';
import Navbar from '@/components/Navbar';
import { FiSave, FiX, FiPackage, FiMessageSquare } from 'react-icons/fi';

interface OrderItem {
  product: {
    _id: string;
    nameEn: string;
    nameAr: string;
    image: string;
  };
  quantity: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    _id: string;
    phone: string;
    name?: string;
  };
  items: OrderItem[];
  status: 'new' | 'received';
  message?: string;
  editDeadline: string;
  createdAt: string;
}

interface Product {
  _id: string;
  nameEn: string;
  nameAr: string;
  image: string;
  isAvailable: boolean;
  order: number;
}

export default function AdminEditOrderPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { language, direction } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedItems, setEditedItems] = useState<{ [key: string]: number }>({});
  const [editedMessage, setEditedMessage] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (!user.isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchOrder();
    fetchProducts();
  }, [user]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        
        // Check if order can be edited (only 'new' status)
        if (data.status !== 'new') {
          alert(t('cannotEditReceivedOrder', language));
          router.push(`/admin/orders/${params.id}`);
          return;
        }
        
        setOrder(data);
        
        // Initialize edited items
        const items: { [key: string]: number } = {};
        data.items.forEach((item: OrderItem) => {
          items[item.product._id] = item.quantity;
        });
        setEditedItems(items);
        setEditedMessage(data.message || '');
      } else {
        alert(t('orderNotFound', language));
        router.push('/admin/orders');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      alert(t('errorLoadingOrder', language));
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleQuantityChange = (productId: string, change: number) => {
    setEditedItems(prev => {
      const current = prev[productId] || 0;
      const newValue = Math.max(0, current + change);
      return { ...prev, [productId]: newValue };
    });
  };

  const handleSave = async () => {
    // Validate minimum order
    const totalItems = Object.values(editedItems).reduce((sum, qty) => sum + qty, 0);
    if (totalItems < 2) {
      alert(t('minimumOrderQuantity', language));
      return;
    }

    // Prepare items array
    const items = Object.entries(editedItems)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => ({ product: productId, quantity }));

    setSaving(true);
    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          message: editedMessage,
        }),
      });

      if (res.ok) {
        alert(t('orderUpdated', language));
        router.push(`/admin/orders/${params.id}`);
      } else {
        const error = await res.json();
        alert(error.error || t('errorUpdatingOrder', language));
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert(t('errorUpdatingOrder', language));
    } finally {
      setSaving(false);
    }
  };

  const getTotalItems = () => {
    return Object.values(editedItems).reduce((sum, qty) => sum + qty, 0);
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

  if (!order) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={direction}>
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('editOrder', language)}
              </h1>
              <p className="text-gray-600 mt-1">
                {t('orderNumber', language)}: <span className="font-semibold">{order.orderNumber}</span>
              </p>
              <p className="text-gray-600 text-sm mt-1">
                {t('customer', language)}: <span className="font-semibold">{order.customer.name || order.customer.phone}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push(`/admin/orders/${params.id}`)}
                className="btn-outline flex items-center gap-2"
              >
                <FiX />
                {t('cancel', language)}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="spinner border-white border-t-transparent w-4 h-4"></div>
                    {t('saving', language)}
                  </>
                ) : (
                  <>
                    <FiSave />
                    {t('saveChanges', language)}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <FiPackage className={`${direction === 'rtl' ? 'ml-2' : 'mr-2'}`} />
            {t('orderItems', language)}
          </h2>

          <div className="space-y-4">
            {products.map(product => {
              const quantity = editedItems[product._id] || 0;
              return (
                <div
                  key={product._id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                    quantity > 0
                      ? 'border-primary-red bg-red-50'
                      : 'border-gray-200 bg-white'
                  } ${!product.isAvailable ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <img
                      src={product.image}
                      alt={language === 'ar' ? product.nameAr : product.nameEn}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {language === 'ar' ? product.nameAr : product.nameEn}
                      </h3>
                      {!product.isAvailable && (
                        <span className="text-xs text-red-600 font-medium">
                          {t('unavailable', language)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleQuantityChange(product._id, -1)}
                      disabled={!product.isAvailable || quantity === 0}
                      className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold text-xl transition-colors"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-bold text-xl text-gray-900">
                      {quantity}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(product._id, 1)}
                      disabled={!product.isAvailable}
                      className="w-10 h-10 rounded-full bg-primary-red hover:bg-accent-red disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center font-bold text-xl transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total */}
          <div className="mt-6 pt-6 border-t-2 border-gray-200">
            <div className="flex items-center justify-between text-xl font-bold">
              <span className="text-gray-900">{t('total', language)}</span>
              <span className="text-primary-red">
                {getTotalItems()} {t('pieces', language)}
              </span>
            </div>
            {getTotalItems() < 2 && (
              <p className="text-sm text-red-600 mt-2">
                {t('minimumOrderQuantity', language)}
              </p>
            )}
          </div>
        </div>

        {/* Message */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <FiMessageSquare className={`${direction === 'rtl' ? 'ml-2' : 'mr-2'}`} />
            {t('messageOptional', language)}
          </h2>
          <textarea
            value={editedMessage}
            onChange={(e) => setEditedMessage(e.target.value)}
            placeholder={t('messagePlaceholderOptional', language)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-primary-red focus:outline-none resize-none"
            rows={4}
            maxLength={500}
          />
          <p className="text-sm text-gray-500 mt-2">
            {editedMessage.length}/500
          </p>
        </div>
      </div>
    </div>
  );
}