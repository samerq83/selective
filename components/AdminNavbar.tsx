'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { FaGlobe, FaSignOutAlt, FaHome, FaBox, FaUsers, FaChartBar, FaChartLine, FaCogs } from 'react-icons/fa';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

export default function AdminNavbar() {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const pathname = usePathname();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const navLinks = [
    { href: '/admin', icon: FaHome, label: t('dashboard') },
    { href: '/admin/orders', icon: FaBox, label: t('orders') },
    { href: '/admin/customers', icon: FaUsers, label: t('customers') },
    { href: '/admin/products', icon: FaChartBar, label: t('products') },
    { href: '/admin/admins', icon: FaCogs, label: t('admins') || 'Admins' },
    { href: '/admin/reports', icon: FaChartLine, label: t('reports') },
    { href: '/admin/settings', icon: FaGlobe, label: t('settings') },
  ];

  return (
    <nav className="bg-gradient-to-r from-black via-gray-900 to-red-800 shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/admin" className="flex items-center">
            <Image 
              src="/images/logo.png" 
              alt="Selective Trading Logo" 
              width={180} 
              height={50}
              className="object-contain"
              priority
            />
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 rtl:space-x-reverse">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-red text-white'
                      : 'text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white'
                  }`}
                >
                  <Icon className="mr-2" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors"
              title={t('language')}
            >
              <FaGlobe className="text-xl text-white" />
            </button>

            {/* User Info */}
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="text-right rtl:text-left">
                <p className="text-sm font-semibold text-white">
                  {user?.name || user?.phone}
                </p>
                <p className="text-xs text-gray-300">
                  {t('admin')}
                </p>
              </div>
              
              <button
                onClick={logout}
                className="p-2 rounded-lg hover:bg-red-600 text-white transition-colors"
                title={t('logout')}
              >
                <FaSignOutAlt className="text-xl" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center space-x-1 rtl:space-x-reverse pb-3 overflow-x-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'bg-primary-red text-white'
                    : 'text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white'
                }`}
              >
                <Icon className="mr-2" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}