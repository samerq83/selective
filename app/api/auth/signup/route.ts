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
    
    const { phone, companyName, name, email, address } = await request.json();
    console.log('[Sign Up] Sign up attempt:', { phone, email });

    // Validate inputs
    if (!phone || !companyName || !name || !email || !address) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhone(phone);

    // Check if user already exists
    const existingUserByPhone = await User.findOne({ phone: formattedPhone });
    if (existingUserByPhone) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 400 }
      );
    }

    const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Remove any existing codes for this phone
    await VerificationCode.deleteMany({ phone: formattedPhone, type: 'signup' });

    // Store verification code
    await VerificationCode.create({
      phone: formattedPhone,
      email: email.toLowerCase(),
      companyName,
      name,
      address,
      code,
      expiresAt,
      type: 'signup',
    });

    // Send verification email
    try {
      await sendVerificationEmail(email, code, name);
      console.log('[Sign Up] Verification email sent to:', email);
    } catch (emailError) {
      console.error('[Sign Up] Error sending email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please check your email address.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Sign Up] Error:', errorMessage);
    console.error('[Sign Up] Full error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}