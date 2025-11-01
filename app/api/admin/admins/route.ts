import { NextRequest, NextResponse } from 'next/server';
import { getAdminsFromMongoDB, createAdminInMongoDB } from '@/lib/admin-mongodb';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    
    const admins = await getAdminsFromMongoDB();
    
    return NextResponse.json(admins);
  } catch (error: any) {
    console.error('Get admins error:', error);
    
    if (error.message === 'Unauthorized' || error.message === 'Admin access required') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { phone, name, email, isAdmin, isActive } = body;

    // Validate required fields
    if (!phone || !name || !email) {
      return NextResponse.json(
        { error: 'Phone, name, and email are required' },
        { status: 400 }
      );
    }

    const newAdmin = await createAdminInMongoDB({
      phone,
      name,
      email,
      isAdmin: isAdmin ?? true,
      isActive: isActive ?? true,
    });

    return NextResponse.json({ admin: newAdmin }, { status: 201 });
  } catch (error: any) {
    console.error('Create admin error:', error);
    
    if (error.message === 'Unauthorized' || error.message === 'Admin access required') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message === 'Phone number already exists' || error.message === 'Email already exists') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}