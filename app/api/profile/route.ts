import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { updateUserInMongoDB, findUserByIdFromMongoDB } from '@/lib/admin-mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('[Profile] GET request');
    
    const authUser = await getAuthUser();
    if (!authUser) {
      console.log('[Profile] Unauthorized - no auth user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await findUserByIdFromMongoDB(authUser.userId);
    
    if (!user) {
      console.log('[Profile] User not found:', authUser.userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[Profile] User found:', user.phone);
    return NextResponse.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      isAdmin: user.isAdmin,
    });
  } catch (error) {
    console.error('[Profile] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    console.log('[Profile] PUT request');
    
    const authUser = await getAuthUser();
    if (!authUser) {
      console.log('[Profile] Unauthorized - no auth user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, companyName, email, address } = await req.json();
    console.log('[Profile] Updating user:', authUser.userId);

    // Validate input
    if (name && name.length > 100) {
      console.log('[Profile] Name too long');
      return NextResponse.json(
        { error: 'Name is too long' },
        { status: 400 }
      );
    }

    if (companyName && companyName.length > 100) {
      console.log('[Profile] Company name too long');
      return NextResponse.json(
        { error: 'Company name is too long' },
        { status: 400 }
      );
    }

    if (email && email.length > 100) {
      console.log('[Profile] Email too long');
      return NextResponse.json(
        { error: 'Email is too long' },
        { status: 400 }
      );
    }

    if (address && address.length > 500) {
      console.log('[Profile] Address too long');
      return NextResponse.json(
        { error: 'Address is too long' },
        { status: 400 }
      );
    }

    // Update user profile
    const updatedUser = await updateUserInMongoDB(authUser.userId, {
      name: name?.trim() || '',
      companyName: companyName?.trim() || '',
      email: email?.trim() || '',
      address: address?.trim() || '',
    });

    if (!updatedUser) {
      console.log('[Profile] User not found:', authUser.userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[Profile] User updated successfully');
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        phone: updatedUser.phone,
        name: updatedUser.name,
        isAdmin: updatedUser.isAdmin,
      },
    });
  } catch (error) {
    console.error('[Profile] PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}