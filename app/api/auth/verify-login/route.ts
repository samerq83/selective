import { NextRequest, NextResponse } from 'next/server';
import { formatPhone } from '@/lib/utils';
import { generateToken } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import VerificationCode from '@/models/VerificationCode';
import { setDeviceVerified } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { phone, code } = await request.json();
    console.log('[Verify Login] Verification attempt:', { phone, code });

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone and code are required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhone(phone);
    const user = await User.findOne({ phone: formattedPhone });

    if (!user) {
      return NextResponse.json(
        { error: 'Phone number not registered' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    const verification = await VerificationCode.findOne({
      phone: formattedPhone,
      code,
      type: 'login',
    });

    if (!verification) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    if (new Date() > verification.expiresAt) {
      await VerificationCode.deleteMany({ phone: formattedPhone, type: 'login' });
      return NextResponse.json(
        { error: 'Verification code expired' },
        { status: 400 }
      );
    }

    await VerificationCode.deleteMany({ phone: formattedPhone, type: 'login' });

    const token = generateToken({
      userId: (user._id as any).toString(),
      phone: user.phone,
      isAdmin: user.isAdmin,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: (user._id as any).toString(),
        phone: user.phone,
        name: user.name || '',
        email: user.email || '',
        isAdmin: user.isAdmin,
      },
    });

    // Set auth token cookie for 3 months
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60, // 90 days (3 months)
      path: '/',
    });

    // Mark device as verified for 3 months - this will prevent future verification requests
    setDeviceVerified(formattedPhone, response);

    console.log('[Verify Login] Login verified for:', user._id, '- Device marked as verified');

    return response;
  } catch (error) {
    console.error('[Verify Login] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}