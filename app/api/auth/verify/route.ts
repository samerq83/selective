import { NextRequest, NextResponse } from 'next/server';
import { formatPhone } from '@/lib/utils';
import { generateToken } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import VerificationCode from '@/models/VerificationCode';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { phone, code } = await request.json();
    console.log('[Verify] Verification attempt:', { phone, code });

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone and code are required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhone(phone);

    // Find verification code
    const verification = await VerificationCode.findOne({
      phone: formattedPhone,
      code,
      type: 'signup',
    });

    if (!verification) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Check if code expired
    if (new Date() > verification.expiresAt) {
      await VerificationCode.deleteMany({ phone: formattedPhone, type: 'signup' });
      return NextResponse.json(
        { error: 'Verification code expired' },
        { status: 400 }
      );
    }

    const {
      companyName = '',
      name: verificationName = '',
      email = '',
      address = '',
    } = verification;

    // Create user
    const user = await User.create({
      phone: formattedPhone,
      companyName,
      name: verificationName || formattedPhone,
      email,
      address,
      isAdmin: false,
      isActive: true,
    });

    // Remove verification code
    await VerificationCode.deleteMany({ phone: formattedPhone, type: 'signup' });

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      phone: user.phone,
      isAdmin: user.isAdmin,
    });

    // Set cookie with 90 days expiry (3 months)
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        phone: user.phone,
        companyName: user.companyName,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60, // 90 days (3 months)
      path: '/',
    });

    response.cookies.set('auth-verified', 'true', {
      httpOnly: false, // Accessible by JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60, // 90 days (3 months)
      path: '/',
    });

    console.log('[Verify] User created and logged in:', user._id);

    return response;
  } catch (error) {
    console.error('[Verify] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}