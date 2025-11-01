'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { t } from '@/lib/translations';
import { FaPhone, FaGlobe, FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'phone' | 'verify'>('phone');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [verificationEmail, setVerificationEmail] = useState('');
  const { language, setLanguage, direction } = useLanguage();
  const router = useRouter();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
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

  const toggleLanguageAriaLabel = language === 'en' ? 'Switch to Arabic' : 'التبديل إلى الإنجليزية';

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (res.ok) {
        // Check if verification was skipped (device already verified)
        if (data.skipVerification) {
          // Direct login, redirect to appropriate page
          if (data.user?.isAdmin) {
            window.location.href = '/admin';
          } else {
            window.location.href = '/dashboard';
          }
          return;
        }
        
        // Show verification code for development
        if (data.code && process.env.NODE_ENV === 'development') {
          console.log('Verification code:', data.code);
        }
        
        // Store email for display
        setVerificationEmail(data.email || '');
        
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
      const res = await fetch('/api/auth/login-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.user?.isAdmin) {
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Check if verification was skipped (device already verified)
        if (data.skipVerification) {
          // Direct login, redirect to appropriate page
          if (data.user?.isAdmin) {
            window.location.href = '/admin';
          } else {
            window.location.href = '/dashboard';
          }
          return;
        }
        
        // Show verification code for development
        if (data.code && process.env.NODE_ENV === 'development') {
          console.log('Verification code:', data.code);
        }
        
        // Update email if provided
        if (data.email) {
          setVerificationEmail(data.email);
        }
        
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

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-4" dir={direction}>
      <button
        onClick={toggleLanguage}
        aria-label={toggleLanguageAriaLabel}
        className="fixed top-4 right-4 bg-white text-primary-black p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50"
      >
        <FaGlobe className="text-xl" />
      </button>

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="bg-white w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center shadow-2xl">
            <span className="text-4xl font-bold text-primary-red">ST</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Selective Trading
          </h1>
          <p className="text-gray-300 text-lg">
            {t('welcomeBack', language)}
          </p>
        </div>

        <div className="card animate-slide-up">
          {step === 'phone' ? (
            <>
              <h2 className="text-2xl font-bold text-primary-black mb-6 text-center">
                {t('login', language)}
              </h2>

              <form onSubmit={handlePhoneSubmit} className="space-y-4">
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
                    t('continue', language)
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-600">
                <p>
                  {t('dontHaveAccount', language)}{' '}
                  <Link href="/signup" className="text-primary-red font-semibold hover:underline">
                    {t('signUp', language)}
                  </Link>
                </p>
              </div>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep('phone')}
                className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-2"
              >
                <FaArrowLeft />
                {t('back', language)}
              </button>

              <h2 className="text-2xl font-bold text-primary-black mb-2 text-center">
                {verificationEmail ? t('verifyEmail', language) : t('verifyPhone', language)}
              </h2>
              <p className="text-gray-600 text-center mb-6">
                {verificationEmail ? t('verifyEmailDesc', language) : t('verifyPhoneDesc', language)}
                <br />
                <span className="font-semibold text-primary-red" dir="ltr">
                  {verificationEmail || phone}
                </span>
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
