import { NextRequest, NextResponse } from 'next/server';
import { formatPhone } from '@/lib/utils';
import { readDB, writeDB } from '@/lib/simple-db';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { phone, email } = await request.json();
    console.log('[Resend] Resend code request:', { phone, email });

    if (!phone || !email) {
      return NextResponse.json(
        { error: 'Phone and email are required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhone(phone);
    const db = readDB();

    // Find existing verification request
    const verificationCodes = db.verificationCodes ?? [];
    const existingIndex = verificationCodes.findIndex(
      (vc: any) => vc.phone === formattedPhone && vc.type === 'signup'
    );

    if (existingIndex === -1) {
      return NextResponse.json(
        { error: 'No verification request found' },
        { status: 404 }
      );
    }

    const existing = verificationCodes[existingIndex];

    // Generate new code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Update verification code
    verificationCodes[existingIndex] = {
      ...existing,
      code,
      expiresAt,
      createdAt: new Date(),
    };
    db.verificationCodes = verificationCodes;

    writeDB(db);

    // Send verification email
    try {
      await sendVerificationEmail(email, code, existing?.name ?? '');
      console.log('[Resend] Verification email sent to:', email);
    } catch (emailError) {
      console.error('[Resend] Error sending email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code resent',
    });
  } catch (error) {
    console.error('[Resend] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}