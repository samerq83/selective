'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/Navbar';
import { FaUser, FaPhone, FaMapMarkerAlt, FaCalendar, FaSearch, FaBan, FaCheck, FaPlus, FaEdit, FaTrash, FaTimes, FaShoppingBag, FaBuilding } from 'react-icons/fa';

interface Customer {
  _id: string;
  phone: string;
  name?: string;
  companyName?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  orderCount: number;
  lastOrderDate?: string;
}

export default function CustomersPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, language, dir } = useLanguage();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    phone: '',
    name: '',
    companyName: '',
    email: '',
    address: '',
    isActive: true,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (user && !user.isAdmin) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.isAdmin) {
      fetchCustomers();
    }
  }, [user, page, search, statusFilter]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      if (searchInput !== search) {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        search,
        status: statusFilter,
      });

      const res = await fetch(`/api/admin/customers?${params}`);
      const data = await res.json();

      if (res.ok) {
        setCustomers(data.customers);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomerStatus = async (customerId: string, currentStatus: boolean) => {
    if (!confirm(t('confirmStatusChange'))) return;

    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (res.ok) {
        fetchCustomers();
      }
    } catch (error) {
      console.error('Error updating customer status:', error);
    }
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormData({
      phone: '',
      name: '',
      companyName: '',
      email: '',
      address: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      phone: customer.phone,
      name: customer.name || '',
      companyName: customer.companyName || '',
      email: customer.email || '',
      address: customer.address || '',
      isActive: customer.isActive,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingCustomer 
        ? `/api/admin/customers/${editingCustomer._id}`
        : '/api/admin/customers';
      
      const method = editingCustomer ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchCustomers();
        closeModal();
      } else {
        const data = await res.json();
        alert(data.error || t('errorOccurred'));
      }
    } catch (error) {
      console.error('Error saving customer:', error);
      alert(t('errorOccurred'));
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm(t('confirmDelete'))) return;

    try {
      const res = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchCustomers();
      } else {
        const data = await res.json();
        alert(data.error || t('errorOccurred'));
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert(t('errorOccurred'));
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return t('never');
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={dir}>
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-primary-black mb-2">
              {t('customers')}
            </h1>
            <p className="text-gray-600">
              {t('customersDescription')}
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="btn-primary flex items-center gap-2"
          >
            <FaPlus />
            {t('addCustomer')}
          </button>
        </div>

        {/* Filters */}
        <div className="card mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <FaSearch className="inline mr-2" />
                {t('search')}
              </label>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('searchCustomers')}
                className="input-field px-4"
                autoComplete="off"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('status')}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
                  setPage(1);
                }}
                className="input-field px-4"
              >
                <option value="all">{t('allCustomers')}</option>
                <option value="active">{t('activeCustomers')}</option>
                <option value="inactive">{t('inactiveCustomers')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('customer')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('companyName')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('contact')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('orders')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('joinDate')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      {t('noCustomers')}
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-red text-white rounded-full flex items-center justify-center">
                            <FaUser />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {customer.name || t('noName')}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {customer._id.slice(-6)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {customer.companyName ? (
                          <div className="text-sm text-gray-900 font-medium">
                            <FaBuilding className="inline mr-2 text-gray-400" />
                            {customer.companyName}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <FaPhone className="inline mr-2 text-gray-400" />
                          {customer.phone}
                        </div>
                        {customer.address && (
                          <div className="text-sm text-gray-500 mt-1">
                            <FaMapMarkerAlt className="inline mr-2 text-gray-400" />
                            {customer.address.substring(0, 30)}
                            {customer.address.length > 30 ? '...' : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {customer.orderCount} {t('orders')}
                        </div>
                        {customer.lastOrderDate && (
                          <div className="text-sm text-gray-500">
                            {t('lastOrder')}: {formatDate(customer.lastOrderDate)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <FaCalendar className="inline mr-2 text-gray-400" />
                          {formatDate(customer.createdAt)}
                        </div>
                        {customer.lastLogin && (
                          <div className="text-sm text-gray-500">
                            {t('lastLogin')}: {formatDate(customer.lastLogin)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {customer.isActive ? (
                          <span className="badge badge-received">
                            <FaCheck className="inline mr-1" />
                            {t('active')}
                          </span>
                        ) : (
                          <span className="badge badge-unavailable">
                            <FaBan className="inline mr-1" />
                            {t('inactive')}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => router.push(`/admin/orders?customer=${customer._id}`)}
                            className="text-purple-600 hover:text-purple-900"
                            title={language === 'ar' ? 'عرض الطلبات' : 'View Orders'}
                          >
                            <FaShoppingBag size={18} />
                          </button>
                          <button
                            onClick={() => openEditModal(customer)}
                            className="text-blue-600 hover:text-blue-900"
                            title={t('edit')}
                          >
                            <FaEdit size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(customer._id)}
                            className="text-red-600 hover:text-red-900"
                            title={t('delete')}
                          >
                            <FaTrash size={16} />
                          </button>
                          <button
                            onClick={() => toggleCustomerStatus(customer._id, customer.isActive)}
                            className={`${
                              customer.isActive
                                ? 'text-orange-600 hover:text-orange-900'
                                : 'text-green-600 hover:text-green-900'
                            } font-medium text-xs`}
                          >
                            {customer.isActive ? t('deactivate') : t('activate')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
              <div className="text-sm text-gray-700">
                {t('page')} {page} {t('of')} {totalPages}
              </div>
              <div className="flex space-x-2 rtl:space-x-reverse">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('previous')}
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {t('next')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-primary-black">
                  {editingCustomer ? t('editCustomer') : t('addCustomer')}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <FaTimes size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('phone')} *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-field"
                      required
                      disabled={!!editingCustomer}
                    />
                  </div>

                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('companyName')}
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  {/* Responsible Person */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('responsiblePerson')}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('email')}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="input-field"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('address')}
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="input-field"
                      rows={3}
                    />
                  </div>

                  {/* Status */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-primary-red border-gray-300 rounded focus:ring-primary-red"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm font-medium text-gray-700">
                      {t('activeAccount')}
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-secondary"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingCustomer ? t('saveChanges') : t('addCustomer')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}