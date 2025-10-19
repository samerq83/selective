'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminNavbar from '@/components/AdminNavbar';
import { FaBell, FaSave, FaDatabase, FaEnvelope } from 'react-icons/fa';

interface Settings {
  notifications: {
    soundEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
  };
  orders: {
    editTimeLimit: number; // in hours
    autoArchiveDays: number;
  };
  system: {
    maintenanceMode: boolean;
    backupEnabled: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
  };
}

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [settings, setSettings] = useState<Settings>({
    notifications: {
      soundEnabled: true,
      emailEnabled: false,
      smsEnabled: false,
    },
    orders: {
      editTimeLimit: 2,
      autoArchiveDays: 30,
    },
    system: {
      maintenanceMode: false,
      backupEnabled: true,
      backupFrequency: 'daily',
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();

      if (res.ok && data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage(t('settingsSaved'));
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(t('error'));
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage(t('error'));
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        setMessage(t('backupCreated'));
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(t('error'));
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      setMessage(t('error'));
    }
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
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-black mb-2">
            {t('settings')}
          </h1>
          <p className="text-gray-600">
            {t('settingsDescription')}
          </p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message === t('error') 
              ? 'bg-red-50 border border-red-200 text-red-700'
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            {message}
          </div>
        )}

        {/* Notifications Settings */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-primary-black mb-4 flex items-center">
            <FaBell className="mr-2" />
            {t('notificationSettings')}
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{t('soundNotifications')}</p>
                <p className="text-sm text-gray-600">{t('soundNotificationsDesc')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.soundEnabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: {
                      ...settings.notifications,
                      soundEnabled: e.target.checked,
                    },
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-red"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{t('emailNotifications')}</p>
                <p className="text-sm text-gray-600">{t('emailNotificationsDesc')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.emailEnabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: {
                      ...settings.notifications,
                      emailEnabled: e.target.checked,
                    },
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-red"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{t('smsNotifications')}</p>
                <p className="text-sm text-gray-600">{t('smsNotificationsDesc')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications.smsEnabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: {
                      ...settings.notifications,
                      smsEnabled: e.target.checked,
                    },
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-red"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Order Settings */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-primary-black mb-4">
            {t('orderSettings')}
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('editTimeLimit')}
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={settings.orders.editTimeLimit}
                onChange={(e) => setSettings({
                  ...settings,
                  orders: {
                    ...settings.orders,
                    editTimeLimit: parseInt(e.target.value),
                  },
                })}
                className="input-field px-4"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('editTimeLimitDesc')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('autoArchiveDays')}
              </label>
              <input
                type="number"
                min="7"
                max="365"
                value={settings.orders.autoArchiveDays}
                onChange={(e) => setSettings({
                  ...settings,
                  orders: {
                    ...settings.orders,
                    autoArchiveDays: parseInt(e.target.value),
                  },
                })}
                className="input-field px-4"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('autoArchiveDaysDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="card mb-6">
          <h2 className="text-xl font-bold text-primary-black mb-4 flex items-center">
            <FaDatabase className="mr-2" />
            {t('systemSettings')}
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{t('maintenanceMode')}</p>
                <p className="text-sm text-gray-600">{t('maintenanceModeDesc')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.system.maintenanceMode}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: {
                      ...settings.system,
                      maintenanceMode: e.target.checked,
                    },
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-red"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{t('autoBackup')}</p>
                <p className="text-sm text-gray-600">{t('autoBackupDesc')}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.system.backupEnabled}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: {
                      ...settings.system,
                      backupEnabled: e.target.checked,
                    },
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-red"></div>
              </label>
            </div>

            {settings.system.backupEnabled && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('backupFrequency')}
                </label>
                <select
                  value={settings.system.backupFrequency}
                  onChange={(e) => setSettings({
                    ...settings,
                    system: {
                      ...settings.system,
                      backupFrequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                    },
                  })}
                  className="input-field px-4"
                >
                  <option value="daily">{t('daily')}</option>
                  <option value="weekly">{t('weekly')}</option>
                  <option value="monthly">{t('monthly')}</option>
                </select>
              </div>
            )}

            <div className="pt-4 border-t">
              <button
                onClick={handleBackup}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center"
              >
                <FaDatabase className="mr-2" />
                {t('createBackupNow')}
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary-red hover:bg-accent-red disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center"
        >
          {saving ? (
            <>
              <div className="spinner border-white border-t-transparent w-5 h-5 mr-2"></div>
              {t('saving')}
            </>
          ) : (
            <>
              <FaSave className="mr-2" />
              {t('saveSettings')}
            </>
          )}
        </button>
      </div>
    </div>
  );
}