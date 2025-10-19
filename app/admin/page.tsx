'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/translations';
import Navbar from '@/components/Navbar';
import { FiPackage, FiShoppingBag, FiCheckCircle, FiUsers, FiTrendingUp, FiCalendar } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Stats {
  todayOrders: number;
  newOrders: number;
  receivedOrders: number;
  totalCustomers: number;
  productStats: Array<{
    product: string;
    quantity: number;
  }>;
}

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    phone: string;
    name?: string;
    companyName?: string;
  };
  items: Array<{
    product: {
      nameEn: string;
      nameAr: string;
    };
    quantity: number;
  }>;
  status: 'new' | 'received';
  createdAt: string;
}

const COLORS = ['#DC2626', '#EF4444', '#F87171', '#FCA5A5', '#FECACA'];

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, direction } = useLanguage();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | 'all' | 'custom'>('today');
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (!user.isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [user]);

  useEffect(() => {
    if (user && user.isAdmin) {
      fetchData();
    }
  }, [dateFilter, customDate]);

  const fetchData = async () => {
    try {
      // Build query params for stats
      let statsUrl = '/api/admin/stats';
      if (dateFilter === 'today') {
        statsUrl += '?filter=today';
      } else if (dateFilter === 'custom' && customDate) {
        statsUrl += `?filter=custom&date=${customDate}`;
      } else if (dateFilter === 'all') {
        statsUrl += '?filter=all';
      }

      // Fetch stats
      const statsRes = await fetch(statsUrl);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch recent orders
      const ordersRes = await fetch('/api/admin/orders?limit=10');
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setRecentOrders(ordersData.orders);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
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
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('adminPanel', language)}
          </h1>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => router.push('/admin/orders')}
              className="btn-primary"
            >
              {t('manageOrders', language)}
            </button>
            <button
              onClick={() => router.push('/admin/products')}
              className="btn-outline"
            >
              {t('manageProducts', language)}
            </button>
            <button
              onClick={() => router.push('/admin/customers')}
              className="btn-outline"
            >
              {t('manageCustomers', language)}
            </button>
            <button
              onClick={() => router.push('/admin/admins')}
              className="btn-outline"
            >
              {language === 'ar' ? 'إدارة المديرين' : 'Manage Admins'}
            </button>
            <button
              onClick={() => router.push('/admin/reports')}
              className="btn-outline"
            >
              {t('reports', language)}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">{t('todayOrders', language)}</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.todayOrders || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FiShoppingBag className="text-2xl text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">{t('newOrders', language)}</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.newOrders || 0}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <FiPackage className="text-2xl text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">{t('receivedOrders', language)}</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.receivedOrders || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FiCheckCircle className="text-2xl text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">{t('customers', language)}</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalCustomers || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FiUsers className="text-2xl text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bar Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FiTrendingUp className="text-primary-red" />
                {t('productAnalysis', language)}
              </h2>
            </div>

            {/* Date Filter Buttons */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                onClick={() => setDateFilter('today')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'today'
                    ? 'bg-primary-red text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('todayOrders', language)}
              </button>
              <button
                onClick={() => setDateFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  dateFilter === 'all'
                    ? 'bg-primary-red text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t('allOrders', language)}
              </button>
              <button
                onClick={() => setDateFilter('custom')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  dateFilter === 'custom'
                    ? 'bg-primary-red text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FiCalendar />
                {t('customDate', language)}
              </button>
            </div>

            {/* Custom Date Picker */}
            {dateFilter === 'custom' && (
              <div className="mb-4">
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
                />
              </div>
            )}
            {stats?.productStats && stats.productStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={stats.productStats} margin={{ bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="product" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="quantity" 
                    fill="#DC2626" 
                    label={{ 
                      position: 'top', 
                      fill: '#374151', 
                      fontWeight: 'bold',
                      fontSize: 14
                    }} 
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">{t('noData', language)}</p>
            )}
          </div>

          {/* Pie Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {t('orderStatus', language)}
            </h2>
            {stats && (stats.newOrders > 0 || stats.receivedOrders > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: t('new', language), value: stats.newOrders },
                      { name: t('received', language), value: stats.receivedOrders },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => {
                      const safePercent = typeof percent === 'number' ? percent : 0;
                      const labelName = typeof name === 'string' ? name : String(name);
                      return `${labelName}: ${(safePercent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[0, 1].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-500 text-center py-12">{t('noData', language)}</p>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {t('recentOrders', language)}
            </h2>
            <button
              onClick={() => router.push('/admin/orders')}
              className="text-primary-red hover:underline"
            >
              {t('viewAll', language)}
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-8">{t('noOrders', language)}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-start py-3 px-4 font-semibold text-gray-900">
                      {t('orderNumber', language)}
                    </th>
                    <th className="text-start py-3 px-4 font-semibold text-gray-900">
                      {t('companyName', language)}
                    </th>
                    <th className="text-start py-3 px-4 font-semibold text-gray-900">
                      {t('items', language)}
                    </th>
                    <th className="text-start py-3 px-4 font-semibold text-gray-900">
                      {t('status', language)}
                    </th>
                    <th className="text-start py-3 px-4 font-semibold text-gray-900">
                      {t('date', language)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map(order => (
                    <tr
                      key={order._id}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/admin/orders/${order._id}`)}
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {order.orderNumber}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {order.customer.companyName || order.customer.name || t('noName', language)}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} {t('pieces', language)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          order.status === 'new'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {t(order.status, language)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700 text-sm">
                        {new Date(order.createdAt).toLocaleDateString('en-GB', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}