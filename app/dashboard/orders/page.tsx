'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { FiPackage, FiClock, FiCheckCircle, FiRepeat } from 'react-icons/fi';
import Link from 'next/link';
import { t } from '@/lib/translations';

interface OrderItem {
  product: {
    _id: string;
    nameEn: string;
    nameAr: string;
    image?: string;
  };
  productName?: {
    en: string;
    ar: string;
  };
  quantity: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  totalItems: number;
  status: 'new' | 'received';
  createdAt: string;
  message?: string;
  items?: OrderItem[];
}

export default function OrdersPage() {
  const { user, loading } = useAuth();
  const { language, direction } = useLanguage();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'new' | 'received'>('all');
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    } else if (user?.isAdmin) {
      router.push('/admin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && !user.isAdmin) {
      fetchOrders();
    }
  }, [user]);

  useEffect(() => {
    if (filter === 'all') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(o => o.status === filter));
    }
  }, [filter, orders]);

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setFilteredOrders(data.orders || []);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorder = async (order: Order) => {
    if (!order.items || order.items.length === 0) {
      alert(language === 'ar' ? 'لا توجد منتجات في هذا الطلب' : 'No products in this order');
      return;
    }

    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Failed to load products');
      const products = await res.json();

      const itemsWithDetails = order.items.map(item => {
        const product = products.find((p: any) => p._id === item.product._id) || {};
        return {
          ...item,
          product: {
            _id: item.product._id,
            nameEn: product.name?.en || item.product.nameEn,
            nameAr: product.name?.ar || item.product.nameAr,
            image: product.image || item.product.image || '/images/placeholder.png',
          },
        };
      });

      setSelectedOrder({ ...order, items: itemsWithDetails });
      setShowReorderModal(true);
    } catch (error) {
      console.error('Failed to load product details for reorder:', error);
      alert(language === 'ar' ? 'حدث خطأ أثناء تحميل تفاصيل المنتجات' : 'Failed to load product details');
    }
  };

  const confirmReorder = () => {
    if (!selectedOrder || !selectedOrder.items) return;

    // Save order items to localStorage
    const reorderData = selectedOrder.items.map(item => ({
      productId: item.product._id,
      productName: {
        en: item.product.nameEn,
        ar: item.product.nameAr,
      },
      productImage: item.product.image,
      quantity: item.quantity
    }));
    
    localStorage.setItem('reorderData', JSON.stringify(reorderData));
    
    // Show success message
    setShowSuccessMessage(true);
    setShowReorderModal(false);
    
    // Hide success message after 3 seconds and navigate
    setTimeout(() => {
      setShowSuccessMessage(false);
      router.push('/dashboard/new-order');
    }, 2000);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user || user.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={direction}>
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-black mb-2">
            {t('orderHistory', language)}
          </h1>
          <p className="text-gray-600">
            {t('viewAllOrders', language)}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-primary-red text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('all', language)} ({orders.length})
            </button>
            <button
              onClick={() => setFilter('new')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                filter === 'new'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('new', language)} ({orders.filter(o => o.status === 'new').length})
            </button>
            <button
              onClick={() => setFilter('received')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                filter === 'received'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t('received', language)} ({orders.filter(o => o.status === 'received').length})
            </button>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <FiPackage className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-4">
                {filter === 'all' 
                  ? t('noOrders', language)
                  : `${t('no', language)} ${t(filter, language)} ${t('orders', language)}`
                }
              </p>
              <Link href="/dashboard/new-order">
                <button className="btn-primary">
                  {t('createOrder', language)}
                </button>
              </Link>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <Link key={order._id} href={`/dashboard/orders/${order._id}`}>
                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-primary-red">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-full ${
                        order.status === 'new' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {order.status === 'new' ? <FiClock size={24} /> : <FiCheckCircle size={24} />}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {order.orderNumber}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {(() => {
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
                        </p>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                      order.status === 'new' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {t(order.status, language)}
                    </div>
                  </div>

                  {/* Order Items */}
                  {order.items && order.items.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center gap-2 mb-2">
                        <FiPackage className="text-gray-600" />
                        <span className="font-semibold text-gray-700">
                          {t('orderItems', language)}:
                        </span>
                      </div>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="text-sm text-gray-600 flex justify-between">
                            <span>• {item.productName?.[language] || item.productName?.en || 'Unknown'}</span>
                            <span className="font-semibold">{t('quantity', language)}: {item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.message && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        <span className="font-semibold">{t('message', language)}:</span> {order.message}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-4 border-t mt-4">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleReorder(order);
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <FiRepeat />
                      <span>{t('reorder', language)}</span>
                    </button>
                    <span className="text-primary-red font-semibold">
                      {t('viewDetails', language)} →
                    </span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Back to Dashboard */}
        <div className="mt-8 text-center">
          <Link href="/dashboard">
            <button className="btn-outline">
              {t('backToDashboard', language)}
            </button>
          </Link>
        </div>
      </div>

      {/* Reorder Confirmation Modal */}
      {showReorderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <FiRepeat className="text-purple-600 text-3xl" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {language === 'ar' ? 'تأكيد إعادة الطلب' : 'Confirm Reorder'}
              </h3>
              <p className="text-gray-600">
                {language === 'ar' 
                  ? 'هل أنت متأكد من إعادة هذا الطلب؟' 
                  : 'Are you sure you want to reorder this?'}
              </p>
            </div>

            {/* Order Details */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3 pb-3 border-b">
                <span className="font-semibold text-gray-700">
                  {language === 'ar' ? 'رقم الطلب' : 'Order Number'}
                </span>
                <span className="text-purple-600 font-bold">#{selectedOrder.orderNumber}</span>
              </div>
              
              <div className="space-y-2 mb-3">
                <p className="font-semibold text-gray-700 mb-2">
                  {language === 'ar' ? 'المنتجات:' : 'Products:'}
                </p>
                {selectedOrder.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm bg-white rounded p-2">
                    <span className="text-gray-700">
                      • {item.productName?.[language] || item.productName?.en || item.product.nameEn}
                    </span>
                    <span className="font-semibold text-purple-600">
                      {language === 'ar' ? 'الكمية' : 'Qty'}: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <span className="font-semibold text-gray-700">
                  {language === 'ar' ? 'الإجمالي' : 'Total'}
                </span>
                <span className="text-lg font-bold text-purple-600">
                  {selectedOrder.totalItems} {language === 'ar' ? 'قطعة' : 'pieces'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowReorderModal(false)}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirmReorder}
                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                {language === 'ar' ? 'تأكيد' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slideDown">
          <div className="bg-green-500 text-white px-8 py-4 rounded-lg shadow-2xl flex items-center gap-3">
            <FiCheckCircle className="text-2xl" />
            <div>
              <p className="font-bold text-lg">
                {language === 'ar' ? 'تم تقديم الطلب بنجاح!' : 'Order Submitted Successfully!'}
              </p>
              <p className="text-sm opacity-90">
                {language === 'ar' ? 'جاري التحويل إلى صفحة الطلب...' : 'Redirecting to order page...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}