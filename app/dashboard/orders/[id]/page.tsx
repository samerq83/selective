'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t, translations, TranslationKey } from '@/lib/translations';
import Navbar from '@/components/Navbar';
import { FiEdit2, FiTrash2, FiClock, FiPackage, FiMessageSquare, FiDownload } from 'react-icons/fi';

interface OrderItem {
  product: {
    _id: string;
    nameEn: string;
    nameAr: string;
    image: string;
  };
  quantity: number;
  selectedUnitType?: 'carton' | 'piece';
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
  purchaseOrderFile?: {
    filename: string;
    path: string;
  };
  editDeadline: string;
  createdAt: string;
  history: Array<{
    action: string;
    timestamp: string;
    changes?: any;
  }>;
}

interface Product {
  _id: string;
  nameEn: string;
  nameAr: string;
  image: string;
  isAvailable: boolean;
  order: number;
}

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { language, direction } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<{ [key: string]: number }>({});
  const [editedMessage, setEditedMessage] = useState('');
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    fetchOrder();
    fetchProducts();
  }, [user]);

  useEffect(() => {
    if (order) {
      // Customer can edit anytime as long as status is 'new' (not received by admin)
      setCanEdit(order.status === 'new');
    }
  }, [order]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}`);
      if (res.ok) {
        const data = await res.json();
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
        router.push('/dashboard');
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

  const handleSaveEdit = async () => {
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
        setIsEditing(false);
        fetchOrder();
      } else {
        const error = await res.json();
        alert(error.error || t('errorUpdatingOrder', language));
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert(t('errorUpdatingOrder', language));
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('confirmDeleteOrder', language))) return;

    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert(t('orderDeleted', language));
        router.push('/dashboard');
      } else {
        const error = await res.json();
        alert(error.error || t('errorDeletingOrder', language));
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert(t('errorDeletingOrder', language));
    }
  };

  const getTotalItems = () => {
    if (isEditing) {
      return Object.values(editedItems).reduce((sum, qty) => sum + qty, 0);
    }
    return order?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  };

  const resolveHistoryLabel = (action: string, lang: keyof typeof translations): string => {
    const key = action as TranslationKey;
    const translationSet = translations[lang] as typeof translations.en;

    if (Object.prototype.hasOwnProperty.call(translationSet, key)) {
      return translationSet[key];
    }

    if (Object.prototype.hasOwnProperty.call(translations.en, key)) {
      return translations.en[key];
    }

    return action;
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
                {t('orderDetails', language)}
              </h1>
              <p className="text-gray-600 mt-1">
                {t('orderNumber', language)}: <span className="font-semibold">{order.orderNumber}</span>
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
              order.status === 'new' 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-green-100 text-green-800'
            }`}>
              {t(order.status, language)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center text-gray-600">
              <FiClock className={`${direction === 'rtl' ? 'ml-2' : 'mr-2'}`} />
              {t('createdAt', language)}: {(() => {
                const date = new Date(order.createdAt);
                const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                              'July', 'August', 'September', 'October', 'November', 'December'];
                const day = date.getDate();
                const month = months[date.getMonth()];
                const year = date.getFullYear();
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                return `${month} ${day}, ${year} ${hours}:${minutes}`;
              })()}
            </div>
            {canEdit && (
              <div className="flex items-center text-green-600 font-semibold">
                <FiEdit2 className={`${direction === 'rtl' ? 'ml-2' : 'mr-2'}`} />
                {language === 'ar' ? 'يمكنك التعديل على الطلب' : 'You can edit this order'}
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <FiPackage className={`${direction === 'rtl' ? 'ml-2' : 'mr-2'}`} />
            {t('orderItems', language)}
          </h2>

          {isEditing ? (
            <div className="space-y-4">
              {products.map(product => (
                <div key={product._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <img 
                      src={product.image || '/images/placeholder.png'} 
                      alt={language === 'ar' ? product.nameAr : product.nameEn}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {language === 'ar' ? product.nameAr : product.nameEn}
                      </h3>
                      {!product.isAvailable && (
                        <span className="text-xs text-red-600">{t('notAvailable', language)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleQuantityChange(product._id, -1)}
                      className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                      disabled={!product.isAvailable}
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-semibold">
                      {editedItems[product._id] || 0}
                    </span>
                    <button
                      onClick={() => handleQuantityChange(product._id, 1)}
                      className="w-8 h-8 rounded-full bg-primary-red text-white hover:bg-red-700 flex items-center justify-center"
                      disabled={!product.isAvailable}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <img 
                      src={item.product.image || '/images/placeholder.png'} 
                      alt={language === 'ar' ? item.product.nameAr : item.product.nameEn}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <span className="font-medium text-gray-900">
                      {language === 'ar' ? item.product.nameAr : item.product.nameEn}
                    </span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {item.quantity} {item.selectedUnitType === 'carton' 
                      ? (language === 'ar' ? 'كرتون' : 'carton')
                      : t('pieces', language)
                    }
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center text-lg font-bold">
              <span>{t('totalItems', language)}:</span>
              <span className="text-primary-red">
                {getTotalItems()} {order?.items?.[0]?.selectedUnitType === 'carton' 
                  ? (language === 'ar' ? 'كرتون' : 'carton')
                  : t('pieces', language)
                }
              </span>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <FiMessageSquare className={`${direction === 'rtl' ? 'ml-2' : 'mr-2'}`} />
            {t('message', language)}
          </h2>
          {isEditing ? (
            <textarea
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
              rows={3}
              placeholder={t('addMessageOptional', language)}
            />
          ) : (
            <p className="text-gray-700">
              {order.message || <span className="text-gray-400">{t('noMessage', language)}</span>}
            </p>
          )}
        </div>

        {/* Purchase Order File */}
        {order.purchaseOrderFile && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <FiDownload className={`${direction === 'rtl' ? 'ml-2' : 'mr-2'}`} />
              {language === 'ar' ? 'طلب الشراء' : 'Purchase Order'}
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">
                  {order.purchaseOrderFile.filename}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {language === 'ar' ? 'ملف طلب الشراء المرفق' : 'Attached purchase order file'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (order.purchaseOrderFile?.path) {
                    const link = document.createElement('a');
                    link.href = order.purchaseOrderFile.path;
                    link.download = order.purchaseOrderFile.filename || 'purchase-order';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}
                className="btn-primary flex items-center gap-2"
              >
                <FiDownload />
                {language === 'ar' ? 'تحميل' : 'Download'}
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 flex-wrap">
          {isEditing ? (
            <>
              <button
                onClick={handleSaveEdit}
                className="btn-primary flex-1"
              >
                {t('saveChanges', language)}
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  // Reset to original values
                  const items: { [key: string]: number } = {};
                  order.items.forEach((item: OrderItem) => {
                    items[item.product._id] = item.quantity;
                  });
                  setEditedItems(items);
                  setEditedMessage(order.message || '');
                }}
                className="btn-outline flex-1"
              >
                {t('cancel', language)}
              </button>
            </>
          ) : (
            <>
              {canEdit && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <FiEdit2 />
                  {t('editOrder', language)}
                </button>
              )}
              {order.status === 'new' && (
                <button
                  onClick={handleDelete}
                  className="btn-outline border-red-600 text-red-600 hover:bg-red-50 flex-1 flex items-center justify-center gap-2"
                >
                  <FiTrash2 />
                  {t('deleteOrder', language)}
                </button>
              )}
              <button
                onClick={() => router.push('/dashboard')}
                className="btn-outline flex-1"
              >
                {t('back', language)}
              </button>
            </>
          )}
        </div>

        {/* Edit History */}
        {order.history && order.history.length > 1 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {t('editHistory', language)}
            </h2>
            <div className="space-y-3">
              {order.history.slice(1).reverse().map((entry, index) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 bg-primary-red rounded-full mt-2"></div>
                  <div>
                    <p className="text-gray-900 font-medium">
                      {resolveHistoryLabel(entry.action, language)}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {new Date(entry.timestamp).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}