'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { FaPlus, FaHistory, FaBolt, FaBox } from 'react-icons/fa';
import { FiPackage, FiClock, FiCheckCircle, FiRepeat } from 'react-icons/fi';
import Link from 'next/link';
import { t } from '@/lib/translations';

interface OrderItem {
  product: {
    _id: string;
    nameEn: string;
    nameAr: string;
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

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { language, direction } = useLanguage();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    received: 0,
  });
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [recentReorder, setRecentReorder] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
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

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        
        // Calculate stats
        setStats({
          total: data.orders.length,
          new: data.orders.filter((o: any) => o.status === 'new').length,
          received: data.orders.filter((o: any) => o.status === 'received').length,
        });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
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

  const confirmReorder = async () => {
    if (!selectedOrder || !selectedOrder.items) return;

    setShowReorderModal(false);
    setShowSuccessMessage(true);

    try {
      // Create the order directly
      const items = selectedOrder.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
      }));

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, message: '' }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Wait 2 seconds then refresh orders and redirect
        setTimeout(async () => {
          setShowSuccessMessage(false);
          // Refresh orders list
          await fetchOrders();
          // Force a hard refresh by reloading the page
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        setShowSuccessMessage(false);
        alert(language === 'ar' ? 'حدث خطأ أثناء إنشاء الطلب' : 'Error creating order');
      }
    } catch (error) {
      console.error('Error creating reorder:', error);
      setShowSuccessMessage(false);
      alert(language === 'ar' ? 'حدث خطأ أثناء إنشاء الطلب' : 'Error creating order');
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-primary-black mb-2">
            {t('welcome', language)}, {user.name || user.phone}!
          </h1>
          <p className="text-gray-600">
            {t('myOrders', language)}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card card-hover bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-semibold">{t('totalOrders', language)}</p>
                <p className="text-4xl font-bold mt-2">{stats.total}</p>
              </div>
              <FaBox className="text-5xl text-blue-200 opacity-50" />
            </div>
          </div>

          <div className="card card-hover bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-semibold">{t('newOrders', language)}</p>
                <p className="text-4xl font-bold mt-2">{stats.new}</p>
              </div>
              <FaBolt className="text-5xl text-green-200 opacity-50" />
            </div>
          </div>

          <div className="card card-hover bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-semibold">{t('receivedOrders', language)}</p>
                <p className="text-4xl font-bold mt-2">{stats.received}</p>
              </div>
              <FaHistory className="text-5xl text-purple-200 opacity-50" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link href="/dashboard/new-order">
            <div className="card card-hover gradient-red text-white cursor-pointer">
              <div className="flex items-center">
                <div className="bg-white bg-opacity-20 p-4 rounded-lg mr-4">
                  <FaPlus className="text-3xl" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{t('newOrder', language)}</h3>
                  <p className="text-sm opacity-90">{t('createOrder', language)}</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/dashboard/quick-order">
            <div className="card card-hover gradient-bg text-white cursor-pointer">
              <div className="flex items-center">
                <div className="bg-white bg-opacity-20 p-4 rounded-lg mr-4">
                  <FaBolt className="text-3xl" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{t('quickOrder', language)}</h3>
                  <p className="text-sm opacity-90">{t('reorderLast', language)}</p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-primary-black">{t('orderHistory', language)}</h2>
            <Link href="/dashboard/orders" className="text-primary-red hover:text-accent-red font-semibold">
              {t('viewAll', language)} →
            </Link>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <FiPackage className="text-6xl text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-4">{t('noOrders', language)}</p>
              <Link href="/dashboard/new-order">
                <button className="btn-primary">
                  {t('createOrder', language)}
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.slice(0, 5).map((order) => (
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reorder Confirmation Modal */}
      {showReorderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {language === 'ar' ? 'تأكيد إعادة الطلب' : 'Confirm Reorder'}
            </h3>
            <p className="text-gray-600 mb-4">
              {language === 'ar' 
                ? `هل تريد إعادة طلب #${selectedOrder.orderNumber}؟` 
                : `Do you want to reorder #${selectedOrder.orderNumber}?`}
            </p>
            
            {/* Order Items Display */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 max-h-60 overflow-y-auto">
              <h4 className="font-semibold text-gray-700 mb-3">
                {language === 'ar' ? 'المنتجات:' : 'Products:'}
              </h4>
              <div className="space-y-2">
                {selectedOrder.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                        <img 
                          src={item.product.image || '/images/placeholder.png'} 
                          alt={language === 'ar' ? item.product.nameAr : item.product.nameEn}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="font-medium text-gray-800">
                        {language === 'ar' ? item.product.nameAr : item.product.nameEn}
                      </span>
                    </div>
                    <span className="font-bold text-purple-600">
                      {item.quantity} {language === 'ar' ? 'قطعة' : 'pcs'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReorderModal(false);
                  setSelectedOrder(null);
                }}
                className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                onClick={confirmReorder}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                {language === 'ar' ? 'تأكيد' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-slideDown">
          <div className="bg-green-500 text-white px-8 py-4 rounded-lg shadow-xl flex items-center gap-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="font-bold text-lg">
                {language === 'ar' ? 'تم إنشاء الطلب بنجاح!' : 'Order Created Successfully!'}
              </p>
              <p className="text-sm text-green-100">
                {language === 'ar' ? 'جاري التحويل إلى صفحة الطلب...' : 'Redirecting to order page...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}