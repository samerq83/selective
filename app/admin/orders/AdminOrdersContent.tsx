'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/translations';
import Navbar from '@/components/Navbar';
import { FiSearch, FiFilter, FiDownload, FiEye, FiCheckCircle } from 'react-icons/fi';
import * as XLSX from 'xlsx';

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    _id: string;
    phone: string;
    companyName?: string;
    name?: string;
  };
  items: Array<{
    product: {
      _id: string;
      nameEn: string;
      nameAr: string;
    };
    quantity: number;
  }>;
  status: 'new' | 'received';
  message?: string;
  createdAt: string;
}

function AdminOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdFromUrl = searchParams.get('customer');
  const { user } = useAuth();
  const { language, direction } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [customerFilter, setCustomerFilter] = useState(customerIdFromUrl || '');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (!user.isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchOrders();
  }, [user, page, statusFilter, startDate, endDate, customerFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (search) params.append('search', search);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (customerFilter) params.append('customerId', customerFilter);

      const res = await fetch(`/api/admin/orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchOrders();
  };

  const handleMarkReceived = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'received' }),
      });

      if (res.ok) {
        alert(t('orderReceived', language));
        fetchOrders();
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert(t('error', language));
    }
  };

  const handleExportExcel = async () => {
    try {
      // Set default date range if not provided (last 30 days)
      const defaultEndDate = new Date().toISOString().split('T')[0];
      const defaultStartDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Fetch matrix data from API
      const params = new URLSearchParams({
        startDate: startDate || defaultStartDate,
        endDate: endDate || defaultEndDate,
      });

      console.log('Fetching reports from:', `/api/admin/reports?${params}`);
      
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
      
      const res = await fetch(`/api/admin/reports?${params}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      console.log('Response status:', res.status);
      
      const reportData = await res.json();
      console.log('Report data:', reportData);

      if (!res.ok || !reportData.customerProductMatrix) {
        console.error('API Error:', reportData);
        alert(t('error', language) + ': ' + (reportData.error || 'Unknown error'));
        return;
      }

      const wb = XLSX.utils.book_new();

      // Helper function to set column widths
      const setColumnWidths = (sheet: any, widths: number[]) => {
        sheet['!cols'] = widths.map(w => ({ wch: w }));
      };

      // Customer-Product Matrix Sheet (Main Report)
      // Get unique products and customers
      const products = Array.from(
        new Set(
          reportData.customerProductMatrix.map((item: any) => 
            language === 'ar' ? item._id.productNameAr : item._id.productNameEn
          )
        )
      ).sort();

      const customers = Array.from(
        new Set(
          reportData.customerProductMatrix.map((item: any) => item._id.customerName || t('noName', language))
        )
      ).sort();

      // Create matrix data structure
      const matrixData: { [customer: string]: { [product: string]: number } } = {};
      
      reportData.customerProductMatrix.forEach((item: any) => {
        const customerName = item._id.customerName || t('noName', language);
        const productName = language === 'ar' ? item._id.productNameAr : item._id.productNameEn;
        
        if (!matrixData[customerName]) {
          matrixData[customerName] = {};
        }
        matrixData[customerName][productName] = item.quantity;
      });

      // Build Excel data
      const matrixExcelData: any[][] = [];
      
      // Header row
      const headerRow = [...products, t('customer', language)];
      matrixExcelData.push(headerRow);

      // Customer rows
      customers.forEach((customer: any) => {
        const row: any[] = [];
        products.forEach((product: any) => {
          row.push(matrixData[customer]?.[product] || 0);
        });
        row.push(customer); // Customer name at the end
        matrixExcelData.push(row);
      });

      // Total row
      const totalRow: any[] = [];
      products.forEach((product: any) => {
        const total = customers.reduce((sum: number, customer: any) => {
          return sum + (matrixData[customer]?.[product] || 0);
        }, 0);
        totalRow.push(total);
      });
      
      // Calculate grand total
      const grandTotal = totalRow.reduce((sum: number, val: number) => sum + val, 0);
      totalRow.push(grandTotal);
      
      // Add empty row before totals
      matrixExcelData.push([]);
      
      // Add totals label row
      const totalLabelRow = products.map(() => t('total', language));
      totalLabelRow.push(t('grandTotal', language));
      matrixExcelData.push(totalLabelRow);
      
      // Add totals values row
      matrixExcelData.push(totalRow);

      const matrixSheet = XLSX.utils.aoa_to_sheet(matrixExcelData);
      
      // Set column widths - products columns narrower, customer column wider
      const colWidths = products.map(() => 15);
      colWidths.push(30); // Customer column
      setColumnWidths(matrixSheet, colWidths);
      
      XLSX.utils.book_append_sheet(wb, matrixSheet, language === 'ar' ? 'تقرير المنتجات' : 'Products Report');

      // Export
      const fileName = `orders_matrix_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error: any) {
      console.error('Error exporting Excel:', error);
      if (error.name === 'AbortError') {
        alert(language === 'ar' ? 'انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.' : 'Request timeout. Please try again.');
      } else {
        alert(t('error', language) + ': ' + (error.message || 'Unknown error'));
      }
    }
  };

  const getTotalItems = (items: Order['items']) => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (loading && orders.length === 0) {
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
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('manageOrders', language)}
          </h1>
          <button
            onClick={handleExportExcel}
            className="btn-primary flex items-center gap-2"
            disabled={orders.length === 0}
          >
            <FiDownload />
            {t('exportExcel', language)}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('search', language)}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder={t('orderNumber', language)}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
                />
                <button
                  onClick={handleSearch}
                  className="btn-primary flex items-center gap-2"
                >
                  <FiSearch />
                  {t('search', language)}
                </button>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('status', language)}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
              >
                <option value="all">{t('all', language)}</option>
                <option value="new">{t('new', language)}</option>
                <option value="received">{t('received', language)}</option>
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('dateRange', language)}
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className="flex-1 px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-red focus:border-transparent"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className="flex-1 px-2 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-red focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Customer Filter Info */}
        {customerFilter && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiFilter className="text-blue-600" />
              <span className="text-blue-800 font-medium">
                {language === 'ar' ? 'عرض طلبات عميل محدد' : 'Showing orders for specific customer'}
              </span>
            </div>
            <button
              onClick={() => {
                setCustomerFilter('');
                router.push('/admin/orders');
              }}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              {language === 'ar' ? 'إلغاء الفلتر' : 'Clear Filter'}
            </button>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('noOrders', language)}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {t('orderNumber', language)}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {t('customer', language)}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {t('items', language)}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {t('status', language)}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {t('date', language)}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        {t('actions', language)}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {orders.map((order) => (
                      <tr key={order._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.orderNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order.customer.name || order.customer.phone}</div>
                          <div className="text-xs text-gray-500">{order.customer.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getTotalItems(order.items)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            order.status === 'received' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.status === 'received' ? t('received', language) : t('new', language)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <FiEye />
                          </button>
                          {order.status === 'new' && (
                            <button
                              onClick={() => handleMarkReceived(order._id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              <FiCheckCircle />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  {language === 'ar' ? 'السابق' : 'Previous'}
                </button>
                <span className="text-sm text-gray-700">
                  {language === 'ar' 
                    ? `الصفحة ${page} من ${totalPages}`
                    : `Page ${page} of ${totalPages}`
                  }
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 disabled:opacity-50"
                >
                  {language === 'ar' ? 'التالي' : 'Next'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminOrdersContent;