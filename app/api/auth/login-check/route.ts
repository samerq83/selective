import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { formatPhone } from '@/lib/utils';
import { findUserByPhone, saveVerificationCode } from '@/lib/simple-db';
import { sendVerificationEmail } from '@/lib/email';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    console.log('[Login Check] Login check for:', phone);

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhone(phone);

    const user = findUserByPhone(formattedPhone);
    if (!user) {
      return NextResponse.json(
        { error: 'Phone number not registered. Please sign up first.' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: 'No email is associated with this account. Please contact support.' },
        { status: 500 }
      );
    }

    const cookieStore = await cookies();
    const authVerifiedCookie = cookieStore.get('auth-verified');

    if (authVerifiedCookie?.value === 'true') {
      console.log('[Login Check] Device already verified, issuing session token');

      const token = generateToken({
        userId: user.id,
        phone: user.phone,
        isAdmin: user.isAdmin,
      });

      const response = NextResponse.json({
        success: true,
        needsVerification: false,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin,
        },
      });

      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 90 * 24 * 60 * 60,
        path: '/',
      });

      response.cookies.set('auth-verified', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 90 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    saveVerificationCode({
      phone: formattedPhone,
      email: user.email.toLowerCase(),
      companyName: user.companyName,
      name: user.name,
      address: user.address,
      code,
      expiresAt,
      type: 'login',
    });

    try {
      await sendVerificationEmail(user.email, code, user.name ?? user.email);
      console.log('[Login Check] Verification email sent to:', user.email);
    } catch (emailError) {
      console.error('[Login Check] Error sending email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      needsVerification: true,
      message: 'Verification code sent to your email',
      email: user.email,
    });
  } catch (error) {
    console.error('[Login Check] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}