'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { FaBell, FaGlobe, FaSignOutAlt, FaUser, FaHeart } from 'react-icons/fa';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  // ✅ Lazy loading: only load notifications when user opens the dropdown
  // ✅ Polling: update every 30 seconds only if dropdown is open
  useEffect(() => {
    if (!user) return;

    let interval: NodeJS.Timeout | null = null;
    
    if (showNotifications) {
      // If dropdown is open, fetch immediately and then poll
      fetchNotifications();
      interval = setInterval(fetchNotifications, 30000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, showNotifications]);

  const fetchNotifications = async () => {
    // ✅ Caching: don't fetch if we fetched less than 5 seconds ago
    const now = Date.now();
    if (now - lastFetchTime < 5000 && notifications.length > 0) {
      console.log('[Navbar] Using cached notifications (fetched less than 5 seconds ago)');
      return;
    }

    if (isFetching) {
      console.log('[Navbar] Already fetching notifications, skipping...');
      return;
    }

    try {
      setIsFetching(true);
      console.time('[Navbar] Fetch notifications time');
      const response = await fetch('/api/notifications');
      console.timeEnd('[Navbar] Fetch notifications time');
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        // ✅ Use totalUnread from API (already calculated on server)
        setUnreadCount(data.totalUnread || data.notifications.filter((n: any) => !n.isRead).length);
        setLastFetchTime(now);
        console.log('[Navbar] Notifications updated:', data.notifications.length, 'total, ', data.totalUnread, 'unread');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={user?.isAdmin ? '/admin' : '/dashboard'} className="flex items-center">
            <Image 
              src="/images/logo.png" 
              alt="Selective Trading Logo" 
              width={180} 
              height={50}
              className="object-contain"
              priority
            />
          </Link>

          {/* Right Side */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title={t('language')}
            >
              <FaGlobe className="text-xl text-gray-600" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
                title={t('notifications')}
              >
                <FaBell className="text-xl text-gray-600" />
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount}</span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 max-h-96 overflow-y-auto">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-bold text-lg">{t('notifications')}</h3>
                  </div>
                  
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      {t('noNotifications')}
                    </div>
                  ) : (
                    <div>
                      {notifications.map((notification) => (
                        <div
                          key={notification._id}
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                            !notification.isRead ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => markAsRead(notification._id)}
                        >
                          <h4 className="font-semibold text-sm">
                            {notification.title[language]}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message[language]}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="text-right rtl:text-left">
                <p className="text-sm font-semibold text-gray-800">
                  {user?.name || user?.phone}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.isAdmin ? t('admin') : t('customerName')}
                </p>
              </div>
              
              {/* Customer Actions */}
              {!user?.isAdmin && (
                <>
                  <Link
                    href="/dashboard/favorites"
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title={t('favoriteOrders')}
                  >
                    <FaHeart className="text-xl text-red-500" />
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    title={t('profile')}
                  >
                    <FaUser className="text-xl text-gray-600" />
                  </Link>
                </>
              )}
              
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-red-50 text-primary-red transition-colors"
                title={t('logout')}
              >
                <FaSignOutAlt className="text-xl" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}