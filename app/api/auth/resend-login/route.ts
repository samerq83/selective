import { NextRequest, NextResponse } from 'next/server';
import { formatPhone } from '@/lib/utils';
import { sendVerificationEmail } from '@/lib/email';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import VerificationCode from '@/models/VerificationCode';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { phone } = await request.json();
    console.log('[Resend Login] Request for:', phone);

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
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

    if (!user.email) {
      return NextResponse.json(
        { error: 'No email is associated with this account. Please contact support.' },
        { status: 500 }
      );
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Save verification code to MongoDB
    await VerificationCode.deleteMany({ phone: formattedPhone, type: 'login' });
    
    await VerificationCode.create({
      phone: formattedPhone,
      email: user.email?.toLowerCase(),
      companyName: user.companyName,
      name: user.name,
      address: user.address,
      code,
      expiresAt,
      type: 'login',
    });

    try {
      await sendVerificationEmail(user.email, code, user.name || user.email);
      console.log('[Resend Login] Verification email resent to:', user.email);
    } catch (emailError) {
      console.error('[Resend Login] Error sending email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code resent to your email',
    });
  } catch (error) {
    console.error('[Resend Login] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}