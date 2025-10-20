'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import { FaGlobe, FaUserPlus, FaSignInAlt } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';

export default function HomePage() {
  const { user } = useAuth();
  const { t, language, setLanguage, direction } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      if (user.isAdmin) {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    }
  }, [user, router]);

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4" dir={direction}>
      {/* Language Toggle */}
      <button
        onClick={toggleLanguage}
        className="fixed top-4 right-4 bg-white text-primary-black p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50"
      >
        <FaGlobe className="text-xl" />
      </button>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex items-center justify-center">
            <Image 
              src="/images/logo.png" 
              alt="Selective Trading" 
              width={200} 
              height={60} 
              className="object-contain drop-shadow-2xl"
              priority
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Selective Trading
          </h1>
          <p className="text-gray-300 text-lg">
            {language === 'en' ? 'Premium Products, Imported for You' : 'منتجات متميزة، مستوردة لأجلك'}
          </p>
        </div>

        {/* Welcome Card */}
        <div className="card animate-slide-up">
          <h2 className="text-2xl font-bold text-primary-black mb-2 text-center">
            {t('welcome')}
          </h2>
          <p className="text-gray-600 text-center mb-8">
            {t('welcomeMessage')}
          </p>

          <div className="space-y-4">
            {/* Login Button */}
            <Link href="/login" className="block">
              <button className="btn-primary w-full flex items-center justify-center gap-3">
                <FaSignInAlt className="text-xl" />
                {t('login')}
              </button>
            </Link>

            {/* Sign Up Button */}
            <Link href="/signup" className="block">
              <button className="btn-outline w-full flex items-center justify-center gap-3">
                <FaUserPlus className="text-xl" />
                {t('signUp')}
              </button>
            </Link>
          </div>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>
              {t('secureLogin')}
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-lg p-4">
            <div className="text-3xl mb-2">✨</div>
            <p className="text-white text-sm font-semibold">
              {language === 'en' ? 'Premium Products' : 'منتجات مميزة'}
            </p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-lg p-4">
            <div className="text-3xl mb-2">⚡</div>
            <p className="text-white text-sm font-semibold">
              {language === 'en' ? 'Fast Order' : 'طلب سريع'}
            </p>
          </div>
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-lg p-4">
            <div className="text-3xl mb-2">📱</div>
            <p className="text-white text-sm font-semibold">
              {language === 'en' ? 'Easy to Use' : 'سهل الاستخدام'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}