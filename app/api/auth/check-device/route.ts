import { NextRequest, NextResponse } from 'next/server';
import { isDeviceVerified } from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    
    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const isVerified = isDeviceVerified(phone, request);
    
    return NextResponse.json({
      isVerified,
      phone,
      message: isVerified ? 'Device is verified' : 'Device verification required'
    });
  } catch (error) {
    console.error('Device check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}