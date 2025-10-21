import { NextRequest, NextResponse } from 'next/server';
import { formatPhone } from '@/lib/utils';
import { deleteVerificationCode, findUserByPhone, findVerificationCode } from '@/lib/simple-db';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();
    console.log('[Verify Login] Verification attempt:', { phone, code });

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone and code are required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhone(phone);
    const user = findUserByPhone(formattedPhone);

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

    const verification = findVerificationCode(formattedPhone, code, 'login');

    if (!verification) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    if (new Date() > new Date(verification.expiresAt)) {
      deleteVerificationCode(formattedPhone, 'login');
      return NextResponse.json(
        { error: 'Verification code expired' },
        { status: 400 }
      );
    }

    deleteVerificationCode(formattedPhone, 'login');

    const token = generateToken({
      userId: user.id,
      phone: user.phone,
      isAdmin: user.isAdmin,
    });

    const response = NextResponse.json({
      success: true,
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

    console.log('[Verify Login] Login verified for:', user.id);

    return response;
  } catch (error) {
    console.error('[Verify Login] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}