import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Cookie name for device verification
const VERIFIED_DEVICE_COOKIE = 'verified_device';

// Cookie expiration (90 days = 3 months)
const COOKIE_MAX_AGE = 90 * 24 * 60 * 60; // 90 days in seconds

/**
 * Generate a unique device identifier based on phone number
 */
export function generateDeviceId(phone: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return `${phone}_${timestamp}_${random}`;
}

/**
 * Check if device is verified for a phone number
 */
export function isDeviceVerified(phone: string, request?: NextRequest): boolean {
  try {
    let cookieValue: string | undefined;
    
    if (request) {
      // Server-side: get from request headers
      cookieValue = request.cookies.get(VERIFIED_DEVICE_COOKIE)?.value;
      console.log('[Auth-Cookies] Server-side check for phone:', phone);
      console.log('[Auth-Cookies] Cookie value found:', cookieValue ? 'YES' : 'NO');
    } else if (typeof window !== 'undefined') {
      // Client-side: get from document.cookie
      const match = document.cookie.match(new RegExp(`${VERIFIED_DEVICE_COOKIE}=([^;]+)`));
      cookieValue = match ? match[1] : undefined;
      console.log('[Auth-Cookies] Client-side check for phone:', phone);
      console.log('[Auth-Cookies] Cookie value found:', cookieValue ? 'YES' : 'NO');
    }
    
    if (!cookieValue) {
      console.log('[Auth-Cookies] No cookie value found');
      return false;
    }
    
    try {
      const deviceData = JSON.parse(decodeURIComponent(cookieValue));
      console.log('[Auth-Cookies] Device data:', deviceData);
      const isVerified = deviceData.phone === phone && deviceData.verified === true;
      console.log('[Auth-Cookies] Verification result:', isVerified);
      return isVerified;
    } catch (error) {
      console.log('[Auth-Cookies] Error parsing cookie:', error);
      return false;
    }
  } catch (error) {
    console.log('[Auth-Cookies] General error:', error);
    return false;
  }
}

/**
 * Set device as verified (server-side)
 */
export function setDeviceVerified(phone: string, response: NextResponse): void {
  const deviceId = generateDeviceId(phone);
  const deviceData = {
    phone,
    deviceId,
    verified: true,
    timestamp: Date.now()
  };
  
  response.cookies.set(VERIFIED_DEVICE_COOKIE, encodeURIComponent(JSON.stringify(deviceData)), {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
}

/**
 * Set device as verified (client-side)
 */
export function setDeviceVerifiedClient(phone: string): void {
  const deviceId = generateDeviceId(phone);
  const deviceData = {
    phone,
    deviceId,
    verified: true,
    timestamp: Date.now()
  };
  
  const cookieValue = encodeURIComponent(JSON.stringify(deviceData));
  const expiration = new Date();
  expiration.setTime(expiration.getTime() + (COOKIE_MAX_AGE * 1000));
  
  document.cookie = `${VERIFIED_DEVICE_COOKIE}=${cookieValue}; expires=${expiration.toUTCString()}; path=/; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
}

/**
 * Remove device verification (client-side)
 */
export function clearDeviceVerification(): void {
  if (typeof window !== 'undefined') {
    document.cookie = `${VERIFIED_DEVICE_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  }
}

/**
 * Get device verification info
 */
export function getDeviceVerificationInfo(request?: NextRequest) {
  try {
    let cookieValue: string | undefined;
    
    if (request) {
      cookieValue = request.cookies.get(VERIFIED_DEVICE_COOKIE)?.value;
    } else if (typeof window !== 'undefined') {
      const match = document.cookie.match(new RegExp(`${VERIFIED_DEVICE_COOKIE}=([^;]+)`));
      cookieValue = match ? match[1] : undefined;
    }
    
    if (!cookieValue) return null;
    
    return JSON.parse(decodeURIComponent(cookieValue));
  } catch {
    return null;
  }
}