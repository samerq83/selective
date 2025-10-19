import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { formatPhone } from '@/lib/utils';
import { findUserByPhone, createUser, updateUser } from '@/lib/simple-db';

export async function POST(request: NextRequest) {
  try {
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
    let user = findUserByPhone(formattedPhone);
    console.log('[Login] User found:', user ? `ID: ${user.id}, isAdmin: ${user.isAdmin}` : 'Not found, creating new user');

    if (!user) {
      user = createUser({
        phone: formattedPhone,
        name: 'User',
        companyName: '',
        email: '',
        address: '',
        isAdmin: false,
        isActive: true,
      });
      console.log('[Login] New user created:', user.id);
    }

    // Update last login
    updateUser(user.id, { lastLogin: new Date() });

    // Generate token
    const token = generateToken({
      userId: user.id,
      phone: user.phone,
      isAdmin: user.isAdmin,
    });
    console.log('[Login] Token generated for user:', user.id);

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        isAdmin: user.isAdmin,
      },
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days,
      path: '/',
    });

    console.log('[Login] Cookie set, login successful');

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}