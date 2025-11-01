'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/translations';
import AdminNavbar from '@/components/AdminNavbar';
import { FiEdit2, FiArrowLeft, FiPlus, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';

interface Admin {
  id: string;
  phone: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLogin?: string;
}

export default function AdminManagementPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { language, direction } = useLanguage();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    if (!user.isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchAdmins();
  }, [user]);

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admin/admins');
      if (res.ok) {
        const data = await res.json();
        setAdmins(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (adminId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/admins/${adminId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (res.ok) {
        fetchAdmins();
      } else {
        alert(t('error', language));
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      alert(t('error', language));
    }
  };

  const handleEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin);
    setPhone(admin.phone);
    setName(admin.name);
    setEmail(admin.email);
  };

  const handleSaveEdit = async () => {
    if (!editingAdmin || !phone.trim() || !name.trim() || !email.trim()) {
      alert(t('fillAllFields', language));
      return;
    }

    try {
      const res = await fetch(`/api/admin/admins/${editingAdmin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, email }),
      });

      if (res.ok) {
        alert(language === 'ar' ? 'تم تحديث المدير بنجاح' : 'Admin updated successfully');
        setEditingAdmin(null);
        setPhone('');
        setName('');
        setEmail('');
        fetchAdmins();
      } else {
        alert(t('error', language));
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      alert(t('error', language));
    }
  };

  const handleAddAdmin = async () => {
    if (!phone.trim() || !name.trim() || !email.trim()) {
      alert(t('fillAllFields', language));
      return;
    }

    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone, 
          name, 
          email,
          isAdmin: true,
          isActive: true 
        }),
      });

      if (res.ok) {
        alert(language === 'ar' ? 'تم إضافة المدير بنجاح' : 'Admin added successfully');
        setShowAddModal(false);
        setPhone('');
        setName('');
        setEmail('');
        fetchAdmins();
      } else {
        const data = await res.json();
        alert(data.error || t('error', language));
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      alert(t('error', language));
    }
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المدير؟' : 'Are you sure you want to delete this admin?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/admins/${adminId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert(language === 'ar' ? 'تم حذف المدير بنجاح' : 'Admin deleted successfully');
        fetchAdmins();
      } else {
        alert(t('error', language));
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      alert(t('error', language));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <AdminNavbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={direction}>
      <AdminNavbar />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {language === 'ar' ? 'إدارة المديرين' : 'Manage Administrators'}
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <FiPlus />
              {language === 'ar' ? 'إضافة مدير' : 'Add Admin'}
            </button>
            <button
              onClick={() => router.push('/admin')}
              className="btn-outline flex items-center gap-2"
            >
              <FiArrowLeft />
              {t('back', language)}
            </button>
          </div>
        </div>

        {/* Edit Modal */}
        {editingAdmin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {language === 'ar' ? 'تعديل المدير' : 'Edit Admin'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
                    dir="ltr"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'الاسم' : 'Name'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  className="btn-primary flex-1"
                >
                  {t('save', language)}
                </button>
                <button
                  onClick={() => {
                    setEditingAdmin(null);
                    setPhone('');
                    setName('');
                    setEmail('');
                  }}
                  className="btn-outline flex-1"
                >
                  {t('cancel', language)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Admin Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {language === 'ar' ? 'إضافة مدير جديد' : 'Add New Admin'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
                    dir="ltr"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'الاسم' : 'Name'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-red focus:border-transparent"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleAddAdmin}
                  className="btn-primary flex-1"
                >
                  {t('add', language)}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setPhone('');
                    setName('');
                    setEmail('');
                  }}
                  className="btn-outline flex-1"
                >
                  {t('cancel', language)}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admins Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'الاسم' : 'Name'}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'رقم الهاتف' : 'Phone'}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'الحالة' : 'Status'}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'آخر تسجيل دخول' : 'Last Login'}
                  </th>
                  <th className="px-6 py-3 text-start text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {language === 'ar' ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {admins.map(admin => (
                  <tr key={admin.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{admin.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900" dir="ltr">{admin.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900" dir="ltr">{admin.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        admin.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.isActive 
                          ? (language === 'ar' ? 'نشط' : 'Active')
                          : (language === 'ar' ? 'غير نشط' : 'Inactive')
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {admin.lastLogin
                        ? new Date(admin.lastLogin).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            calendar: 'gregory'
                          })
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditAdmin(admin)}
                          className="text-blue-600 hover:text-blue-900"
                          title={t('edit', language)}
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(admin.id, admin.isActive)}
                          className={admin.isActive ? 'text-green-600 hover:text-green-900' : 'text-orange-600 hover:text-orange-900'}
                          title={admin.isActive ? (language === 'ar' ? 'تعطيل' : 'Deactivate') : (language === 'ar' ? 'تفعيل' : 'Activate')}
                        >
                          {admin.isActive ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
                        </button>
                        <button
                          onClick={() => handleDeleteAdmin(admin.id)}
                          className="text-red-600 hover:text-red-900"
                          title={t('delete', language)}
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {admins.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {language === 'ar' ? 'لا يوجد مديرين' : 'No administrators found'}
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
          <p className="text-blue-800 text-sm">
            <strong>{t('note', language)}:</strong> {language === 'ar' 
              ? 'يمكنك إضافة وتعديل وحذف المديرين من هذه الصفحة. المديرون لديهم صلاحيات كاملة للوصول إلى لوحة التحكم.'
              : 'You can add, edit, and delete administrators from this page. Administrators have full access to the admin panel.'
            }
          </p>
        </div>
      </div>
    </div>
  );
}