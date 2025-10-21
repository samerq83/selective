import { NextRequest, NextResponse } from 'next/server';
import { formatPhone } from '@/lib/utils';
import { createUser, readDB, writeDB } from '@/lib/simple-db';
import { generateToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { phone, code } = await request.json();
    console.log('[Verify] Verification attempt:', { phone, code });

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone and code are required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhone(phone);
    const db = readDB();

    // Find verification code
    const verificationCodes = db.verificationCodes ?? [];
    const verificationIndex = verificationCodes.findIndex(
      (vc: any) => vc.phone === formattedPhone && vc.code === code && vc.type === 'signup'
    );

    if (verificationIndex === -1) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    const verification = verificationCodes[verificationIndex];

    if (!verification) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    const {
      companyName = '',
      name: verificationName = '',
      email = '',
      address = '',
    } = verification;

    // Check if code expired
    if (new Date() > new Date(verification.expiresAt)) {
      // Remove expired code
      verificationCodes.splice(verificationIndex, 1);
      db.verificationCodes = verificationCodes;
      writeDB(db);
      
      return NextResponse.json(
        { error: 'Verification code expired' },
        { status: 400 }
      );
    }

    // Create user
    const user = createUser({
      phone: formattedPhone,
      companyName,
      name: verificationName || formattedPhone,
      email,
      address,
      isAdmin: false,
      isActive: true,
    });

    // Remove verification code - read DB again after createUser to avoid overwriting
    const dbAfterUserCreation = readDB();
    const updatedVerificationCodes = dbAfterUserCreation.verificationCodes ?? [];
    const newVerificationIndex = updatedVerificationCodes.findIndex(
      (vc: any) => vc.phone === formattedPhone && vc.code === code && vc.type === 'signup'
    );
    if (newVerificationIndex !== -1) {
      updatedVerificationCodes.splice(newVerificationIndex, 1);
      dbAfterUserCreation.verificationCodes = updatedVerificationCodes;
      writeDB(dbAfterUserCreation);
    }

    // Generate token
    const token = generateToken({
      userId: user.id,
      phone: user.phone,
      isAdmin: user.isAdmin,
    });

    // Set cookie with 90 days expiry (3 months)
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
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

    console.log('[Verify] User created and logged in:', user.id);

    return response;
  } catch (error) {
    console.error('[Verify] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}