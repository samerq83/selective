'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Navbar from '@/components/Navbar';
import { FaSave, FaUser, FaMapMarkerAlt, FaPhone, FaEnvelope, FaBuilding } from 'react-icons/fa';

export default function ProfilePage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (user && user.isAdmin) {
      router.push('/admin');
    }
    if (user) {
      setName(user.name || '');
      setCompanyName(user.companyName || '');
      setEmail(user.email || '');
      setAddress(user.address || '');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, companyName, email, address }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(t('profileUpdated'));
        await refreshUser();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || t('error'));
      }
    } catch (error) {
      setError(t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
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
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary-black mb-2">
            {t('profile')}
          </h1>
          <p className="text-gray-600">
            {t('profileDescription')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Phone (Read-only) */}
          <div className="card">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FaPhone className="inline mr-2" />
              {t('phone')}
            </label>
            <input
              type="text"
              value={user.phone}
              disabled
              className="input-field px-4 bg-gray-100 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-2">
              {t('phoneCannotChange')}
            </p>
          </div>

          {/* Company Name */}
          <div className="card">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FaBuilding className="inline mr-2" />
              {t('companyName')}
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={t('companyNamePlaceholder')}
              className="input-field px-4"
              maxLength={100}
            />
          </div>

          {/* Email */}
          <div className="card">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FaEnvelope className="inline mr-2" />
              {t('email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              className="input-field px-4"
              maxLength={100}
            />
          </div>

          {/* Name */}
          <div className="card">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FaUser className="inline mr-2" />
              {t('name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              className="input-field px-4"
              maxLength={100}
            />
          </div>

          {/* Address */}
          <div className="card">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <FaMapMarkerAlt className="inline mr-2" />
              {t('address')}
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t('addressPlaceholder')}
              className="input-field px-4 resize-none"
              rows={4}
              maxLength={300}
            />
            <p className="text-xs text-gray-500 mt-2">
              {address.length}/300
            </p>
          </div>

          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary-red hover:bg-accent-red disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center"
          >
            {submitting ? (
              <>
                <div className="spinner border-white border-t-transparent w-5 h-5 mr-2"></div>
                {t('saving')}
              </>
            ) : (
              <>
                <FaSave className="mr-2" />
                {t('saveChanges')}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}