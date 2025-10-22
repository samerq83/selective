import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { formatPhone } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import VerificationCode from '@/models/VerificationCode';

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

    // Find or create user
    let user = await User.findOne({ phone: formattedPhone });
    console.log('[Login] User found:', user ? `ID: ${user._id}, isAdmin: ${user.isAdmin}` : 'Not found, creating new user');

    if (!user) {
      user = await User.create({
        phone: formattedPhone,
        name: 'User',
        companyName: '',
        email: '',
        address: '',
        isAdmin: false,
        isActive: true,
        lastLogin: new Date(),
      });
      console.log('[Login] New user created:', user._id);
    } else {
      // Update last login
      user.lastLogin = new Date();
      await user.save();
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // Generate and save verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes

    // Remove any existing login codes for this phone
    await VerificationCode.deleteMany({ phone: formattedPhone, type: 'login' });

    // Save new verification code
    await VerificationCode.create({
      phone: formattedPhone,
      code: verificationCode,
      type: 'login',
      expiresAt,
    });

    console.log('[Login] Verification code generated:', verificationCode);

    // In development, return the code for testing
    const responseData: any = {
      success: true,
      message: 'Verification code sent',
    };

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