import { NextRequest, NextResponse } from 'next/server';
import { formatPhone } from '@/lib/utils';
import { sendVerificationEmail } from '@/lib/email';
import connectDB from '@/lib/mongodb';
import VerificationCode from '@/models/VerificationCode';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const { phone, email } = await request.json();
    console.log('[Resend] Resend code request:', { phone, email });

    if (!phone || !email) {
      return NextResponse.json(
        { error: 'Phone and email are required' },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhone(phone);

    // Find existing verification request
    const existing = await VerificationCode.findOne({
      phone: formattedPhone,
      type: 'signup',
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'No verification request found' },
        { status: 404 }
      );
    }

    // Generate new code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Update verification code
    await VerificationCode.updateOne(
      { _id: (existing._id as any) },
      {
        code,
        expiresAt,
      }
    );

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