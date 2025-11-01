import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    // Clear auth token
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    // Clear auth-verified cookie
    response.cookies.set('auth-verified', '', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    // NOTE: We do NOT clear 'verified_device' cookie
    // This allows users to skip verification on their trusted device
    // even after logging out

    console.log('[Logout] User logged out, auth cookies cleared (device verification preserved)');

    return response;
  } catch (error) {
    console.error('[Logout] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}