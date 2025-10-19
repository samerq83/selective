import { NextRequest, NextResponse } from 'next/server';
import { formatPhone } from '@/lib/utils';
import { findUserByPhone, findUserByEmail, readDB, writeDB } from '@/lib/simple-db';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
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
    const existingUserByPhone = findUserByPhone(formattedPhone);
    if (existingUserByPhone) {
      return NextResponse.json(
        { error: 'Phone number already registered' },
        { status: 400 }
      );
    }

    const existingUserByEmail = findUserByEmail(email.toLowerCase());
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Generate 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store verification code
    const db = readDB();
    if (!db.verificationCodes) {
      db.verificationCodes = [];
    }

    // Remove any existing codes for this phone
    db.verificationCodes = db.verificationCodes.filter(
      (vc: any) => vc.phone !== formattedPhone
    );

    db.verificationCodes.push({
      phone: formattedPhone,
      email: email.toLowerCase(),
      companyName,
      name,
      address,
      code,
      expiresAt,
      type: 'signup',
      createdAt: new Date(),
    });

    writeDB(db);

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
    console.error('[Sign Up] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}