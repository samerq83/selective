import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { formatPhone } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import VerificationCode from '@/models/VerificationCode';
import { sendVerificationEmail } from '@/lib/email';
import { isDeviceVerified } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { phone } = await request.json();
    console.log('[Login] Login attempt with phone:', phone);

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhone(phone);
    console.log('[Login] Formatted phone:', formattedPhone);

    // Check if device is already verified
    const deviceIsVerified = isDeviceVerified(formattedPhone, request);
    console.log('[Login] Device verification status for phone', formattedPhone, ':', deviceIsVerified);
    console.log('[Login] Request cookies:', request.cookies.getAll().map(c => ({ name: c.name, value: c.value.substring(0, 50) + '...' })));

    // Find user - don't create automatically
    let user = await User.findOne({ phone: formattedPhone });
    console.log('[Login] User found:', user ? `ID: ${user._id}, isAdmin: ${user.isAdmin}` : 'Not found');

    if (!user) {
      return NextResponse.json(
        { 
          error: 'هذا الرقم غير مسجل لدينا. الرجاء إنشاء حساب جديد.',
          requiresSignup: true
        },
        { status: 404 }
      );
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // If device is already verified, allow direct login
    if (deviceIsVerified) {
      console.log('[Login] Device is verified, allowing direct login');
      const token = generateToken({
        userId: (user._id as any).toString(),
        phone: user.phone,
        isAdmin: user.isAdmin
      });
      
      const response = NextResponse.json({
        success: true,
        skipVerification: true,
        user: {
          id: user._id,
          phone: user.phone,
          name: user.name,
          isAdmin: user.isAdmin
        }
      });

      // Set auth token cookie for 3 months
      response.cookies.set('auth-token', token, {
        maxAge: 90 * 24 * 60 * 60, // 90 days (3 months)
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
      });

      return response;
    }

    // Generate 4-digit verification code (keep original format)
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutes

    // Remove any existing login codes for this phone
    await VerificationCode.deleteMany({ phone: formattedPhone, type: 'login' });

    // Save new verification code
    await VerificationCode.create({
      phone: formattedPhone,
      code: verificationCode,
      type: 'login',
      expiresAt,
    });

    console.log('[Login] 4-digit verification code generated:', verificationCode);

    // Send verification email if user has email (but don't require it)
    if (user.email) {
      try {
        await sendVerificationEmail(user.email, verificationCode, user.name || 'User');
        console.log('[Login] Verification email sent to:', user.email);
      } catch (emailError) {
        console.error('[Login] Failed to send email:', emailError);
        // Don't fail the request if email fails
      }
    }

    // Return simple response (same as original behavior)
    const responseData: any = {
      success: true,
      message: 'Verification code sent',
      email: user.email || null, // Include user email for display
    };

    // In development, return the code for testing
    if (process.env.NODE_ENV === 'development') {
      responseData.code = verificationCode;
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
