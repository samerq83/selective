import { NextRequest, NextResponse } from 'next/server';
import { getCustomersWithStats, createCustomerInMongoDB } from '@/lib/admin-mongodb';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const result = await getCustomersWithStats(page, search, status);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Customers fetch error:', error);
    
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

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { phone, companyName, name, email, address, isActive } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const newUser = await createCustomerInMongoDB({
      phone,
      companyName: companyName || '',
      name: name || '',
      email: email || '',
      address: address || '',
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json({
      message: 'Customer created successfully',
      customer: {
        _id: newUser._id,
        phone: newUser.phone,
        companyName: newUser.companyName,
        name: newUser.name,
        email: newUser.email,
        address: newUser.address,
        isActive: newUser.isActive,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Customer creation error:', error);
    
    if (error.message === 'Unauthorized' || error.message === 'Admin access required') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message === 'User with this phone number already exists') {
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