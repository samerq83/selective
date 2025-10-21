import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB, findUserByPhone, findUserByEmail } from '@/lib/simple-db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    
    const db = readDB();
    const admins = db.users
      .filter(u => u.isAdmin)
      .map(u => ({
        id: u.id,
        phone: u.phone,
        name: u.name,
        email: u.email,
        isActive: u.isActive,
        lastLogin: u.lastLogin,
      }));
    
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

    // Check if phone already exists
    const existingUserByPhone = findUserByPhone(phone);
    if (existingUserByPhone) {
      return NextResponse.json(
        { error: 'Phone number already exists' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUserByEmail = findUserByEmail(email);
    if (existingUserByEmail) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    const db = readDB();
    const newAdmin = {
      id: (db.users.length + 1).toString(),
      phone,
      name,
      email,
      address: '',
      companyName: '',
      isAdmin: isAdmin ?? true,
      isActive: isActive ?? true,
    };

    db.users.push(newAdmin);
    writeDB(db);

    return NextResponse.json({ admin: newAdmin }, { status: 201 });
  } catch (error: any) {
    console.error('Create admin error:', error);
    
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