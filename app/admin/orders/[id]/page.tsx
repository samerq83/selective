'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/translations';
import Navbar from '@/components/Navbar';
import { FiPrinter, FiCheckCircle, FiTrash2, FiEdit2, FiArrowLeft } from 'react-icons/fi';
import { useReactToPrint } from 'react-to-print';

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
    companyName?: string;
  };
  items: OrderItem[];
  status: 'new' | 'received';
  message?: string;
  editDeadline: string;
  createdAt: string;
  history: Array<{
    action: string;
    timestamp: string;
    changes?: any;
    byName?: string;
  }>;
}

export default function AdminOrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { language, direction } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

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
  }, [user]);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
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

  const handleMarkReceived = async () => {
    if (!confirm(t('confirmMarkReceived', language))) return;

    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'received' }),
      });

      if (res.ok) {
        alert(t('orderReceived', language));
        fetchOrder();
      } else {
        const error = await res.json();
        alert(error.error || t('error', language));
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert(t('error', language));
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
        router.push('/admin/orders');
      } else {
        const error = await res.json();
        alert(error.error || t('errorDeletingOrder', language));
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      alert(t('errorDeletingOrder', language));
    }
  };

  const handleEdit = () => {
    // Navigate to edit order page (we'll create this page)
    router.push(`/admin/orders/${params.id}/edit`);
  };

  const getTotalItems = () => {
    return order?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
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
        {/* Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/admin/orders')}
            className="btn-outline flex items-center gap-2"
          >
            <FiArrowLeft />
            {t('back', language)}
          </button>
          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="btn-outline flex items-center gap-2"
            >
              <FiPrinter />
              {t('printInvoice', language)}
            </button>
            {order.status === 'new' && (
              <>
                <button
                  onClick={handleEdit}
                  className="btn-outline border-blue-600 text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                >
                  <FiEdit2 />
                  {t('edit', language)}
                </button>
                <button
                  onClick={handleMarkReceived}
                  className="btn-primary flex items-center gap-2"
                >
                  <FiCheckCircle />
                  {t('markReceived', language)}
                </button>
                <button
                  onClick={handleDelete}
                  className="btn-outline border-red-600 text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <FiTrash2 />
                  {t('delete', language)}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Printable Content */}
        <div ref={printRef} className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="border-b pb-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Selective Trading
                </h1>
                <p className="text-gray-600">{t('invoice', language)}</p>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                order.status === 'new' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {t(order.status, language)}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">{t('orderNumber', language)}:</p>
                <p className="font-semibold text-gray-900">{order.orderNumber}</p>
              </div>
              <div>
                <p className="text-gray-600">{t('orderDate', language)}:</p>
                <p className="font-semibold text-gray-900">
                  {(() => {
                    const date = new Date(order.createdAt);
                    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                    const day = date.getDate();
                    const month = months[date.getMonth()];
                    const year = date.getFullYear();
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    return `${month} ${day}, ${year} ${hours}:${minutes}`;
                  })()}
                </p>
              </div>
              <div>
                <p className="text-gray-600">{t('customerPhone', language)}:</p>
                <p className="font-semibold text-gray-900">{order.customer.phone}</p>
              </div>
              {order.customer.name && (
                <div>
                  <p className="text-gray-600">{t('customerName', language)}:</p>
                  <p className="font-semibold text-gray-900">{order.customer.name}</p>
                </div>
              )}
              {order.customer.companyName && (
                <div>
                  <p className="text-gray-600">{t('companyName', language)}:</p>
                  <p className="font-semibold text-gray-900">{order.customer.companyName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {t('orderItems', language)}
            </h2>
            <table className="w-full">
              <thead className="border-b-2">
                <tr>
                  <th className="text-start py-3 font-semibold text-gray-900">
                    {t('product', language)}
                  </th>
                  <th className="text-center py-3 font-semibold text-gray-900">
                    {t('quantity', language)}
                  </th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 text-gray-900">
                      {language === 'ar' ? item.product.nameAr : item.product.nameEn}
                    </td>
                    <td className="py-3 text-center text-gray-900">
                      {item.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2">
                <tr>
                  <td className="py-3 font-bold text-gray-900">
                    {t('total', language)}
                  </td>
                  <td className="py-3 text-center font-bold text-primary-red">
                    {getTotalItems()} {t('pieces', language)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Message */}
          {order.message && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {t('message', language)}
              </h2>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                {order.message}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-6 text-center text-gray-600 text-sm print-only">
            <p>{t('thankYou', language)}</p>
            <p className="mt-2">Selective Trading - {t('milkProducts', language)}</p>
          </div>
        </div>

        {/* Edit History (Not printed) */}
        {order.history && order.history.length > 1 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6 no-print">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {t('editHistory', language)}
            </h2>
            <div className="space-y-3">
              {order.history.map((entry, index) => (
                <div key={index} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 bg-primary-red rounded-full mt-2"></div>
                  <div>
                    <p className="text-gray-900 font-medium">
                      {(() => {
                        switch (entry.action) {
                          case 'created':
                            return t('orderCreatedEntry', language).replace('{{name}}', entry.byName || t('unknownHistoryAction', language));
                          case 'status_changed':
                            return t('statusChangedBy', language).replace('{{name}}', entry.byName || t('unknownHistoryAction', language));
                          case 'items_updated':
                            return t('itemsUpdatedBy', language).replace('{{name}}', entry.byName || t('unknownHistoryAction', language));
                          case 'message_updated':
                            return t('messageUpdatedBy', language).replace('{{name}}', entry.byName || t('unknownHistoryAction', language));
                          case 'order_received':
                            return t('orderReceivedBy', language).replace('{{name}}', entry.byName || t('unknownHistoryAction', language));
                          case 'updated':
                            return t('unknownHistoryAction', language);
                          default:
                            return t('unknownHistoryAction', language);
                        }
                      })()}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {(() => {
                        const date = new Date(entry.timestamp);
                        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
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
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}