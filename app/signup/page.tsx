'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/translations';
import { FaPhone, FaUser, FaEnvelope, FaMapMarkerAlt, FaGlobe, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';

export default function SignUpPage() {
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const { language, setLanguage, direction } = useLanguage();
  const router = useRouter();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, companyName, name, email, address }),
      });

      const data = await res.json();

      if (res.ok) {
        setStep('verify');
        startResendTimer();
      } else {
        setError(data.error || t('error', language));
      }
    } catch (err) {
      setError(t('error', language));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = await res.json();

      if (res.ok) {
        // Use window.location to force a full page reload and refresh auth context
        if (data.user.isAdmin) {
          window.location.href = '/admin';
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setError(data.error || t('invalidCode', language));
      }
    } catch (err) {
      setError(t('error', language));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email }),
      });

      if (res.ok) {
        setCanResend(false);
        startResendTimer();
      } else {
        const data = await res.json();
        setError(data.error || t('error', language));
      }
    } catch (err) {
      setError(t('error', language));
    } finally {
      setLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    setCanResend(false);
    
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
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
          <div className="bg-white w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center shadow-2xl">
            <span className="text-4xl font-bold text-primary-red">ST</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Selective Trading
          </h1>
          <p className="text-gray-300 text-lg">
            {t('createAccount', language)}
          </p>
        </div>

        {/* Sign Up Card */}
        <div className="card animate-slide-up">
          {step === 'form' ? (
            <>
              <h2 className="text-2xl font-bold text-primary-black mb-6 text-center">
                {t('signUp', language)}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('phoneNumber', language)}
                  </label>
                  <div className="relative">
                    <FaPhone className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 ${direction === 'rtl' ? 'right-4' : 'left-4'}`} />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t('enterPhone', language)}
                      className={`input-field ${direction === 'rtl' ? 'pr-12' : 'pl-12'}`}
                      required
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('companyName', language)}
                  </label>
                  <div className="relative">
                    <FaUser className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 ${direction === 'rtl' ? 'right-4' : 'left-4'}`} />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder={t('enterCompanyName', language)}
                      className={`input-field ${direction === 'rtl' ? 'pr-12' : 'pl-12'}`}
                      required
                    />
                  </div>
                </div>

                {/* Responsible Person Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('responsiblePerson', language)}
                  </label>
                  <div className="relative">
                    <FaUser className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 ${direction === 'rtl' ? 'right-4' : 'left-4'}`} />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('enterResponsiblePerson', language)}
                      className={`input-field ${direction === 'rtl' ? 'pr-12' : 'pl-12'}`}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('email', language)}
                  </label>
                  <div className="relative">
                    <FaEnvelope className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 ${direction === 'rtl' ? 'right-4' : 'left-4'}`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('enterEmail', language)}
                      className={`input-field ${direction === 'rtl' ? 'pr-12' : 'pl-12'}`}
                      required
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('address', language)}
                  </label>
                  <div className="relative">
                    <FaMapMarkerAlt className={`absolute top-4 text-gray-400 ${direction === 'rtl' ? 'right-4' : 'left-4'}`} />
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t('enterAddress', language)}
                      className={`input-field min-h-[80px] ${direction === 'rtl' ? 'pr-12' : 'pl-12'}`}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="spinner border-white border-t-transparent w-5 h-5 mr-2"></div>
                      {t('loading', language)}
                    </div>
                  ) : (
                    t('signUp', language)
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-600">
                <p>
                  {t('alreadyHaveAccount', language)}{' '}
                  <Link href="/login" className="text-primary-red font-semibold hover:underline">
                    {t('login', language)}
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('form')}
                className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                <FaArrowLeft />
                {t('back', language)}
              </button>

              <h2 className="text-2xl font-bold text-primary-black mb-2 text-center">
                {t('verifyEmail', language)}
              </h2>
              <p className="text-gray-600 text-center mb-6">
                {t('verifyEmailDesc', language)}
                <br />
                <span className="font-semibold text-primary-red">{email}</span>
              </p>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    {t('verificationCode', language)}
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="1234"
                    className="input-field px-4 text-center text-2xl tracking-widest"
                    required
                    maxLength={4}
                    dir="ltr"
                  />
                </div>

                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || code.length !== 4}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="spinner border-white border-t-transparent w-5 h-5 mr-2"></div>
                      {t('loading', language)}
                    </div>
                  ) : (
                    t('verify', language)
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-600">
                <p>
                  {t('didntReceiveCode', language)}{' '}
                  {canResend ? (
                    <button
                      onClick={handleResend}
                      className="text-primary-red font-semibold hover:underline"
                      disabled={loading}
                    >
                      {t('resendCode', language)}
                    </button>
                  ) : (
                    <span className="text-gray-500">
                      {t('resendIn', language)} {resendTimer}s
                    </span>
                  )}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-white hover:text-gray-200 flex items-center justify-center gap-2">
            <FaArrowLeft />
            {t('backToHome', language)}
          </Link>
        </div>
      </div>
    </div>
  );
}