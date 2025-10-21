import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB, createUser } from '@/lib/simple-db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const limit = 20;
    const skip = (page - 1) * limit;

    const db = readDB();
    
    // Filter customers (non-admin users)
    let customers = db.users.filter(u => !u.isAdmin);

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter(c => 
        c.phone?.toLowerCase().includes(searchLower) ||
        c.name?.toLowerCase().includes(searchLower) ||
        c.companyName?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (status === 'active') {
      customers = customers.filter(c => c.isActive);
    } else if (status === 'inactive') {
      customers = customers.filter(c => !c.isActive);
    }

    // Calculate order stats for each customer
    const customersWithStats = customers.map(customer => {
      const customerOrders = db.orders.filter(o => o.customer === customer.id);
      const lastOrder = customerOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      return {
        _id: customer.id,
        phone: customer.phone,
        companyName: customer.companyName,
        name: customer.name,
        email: customer.email,
        address: customer.address,
        isActive: customer.isActive,
        createdAt: new Date().toISOString(), // Default since we don't have this field
        lastLogin: customer.lastLogin,
        orderCount: customerOrders.length,
        lastOrderDate: lastOrder?.createdAt,
      };
    });

    // Sort by order count (most active first)
    customersWithStats.sort((a, b) => b.orderCount - a.orderCount);

    // Pagination
    const totalCustomers = customersWithStats.length;
    const totalPages = Math.ceil(totalCustomers / limit);
    const paginatedCustomers = customersWithStats.slice(skip, skip + limit);

    return NextResponse.json({
      customers: paginatedCustomers,
      totalPages,
      currentPage: page,
      totalCustomers,
    });
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

    const db = readDB();

    // Check if user already exists
    const existingUser = db.users.find(u => u.phone === phone);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this phone number already exists' },
        { status: 400 }
      );
    }

    // Create new user
    const newUser = createUser({
      phone,
      companyName: companyName || '',
      name: name || '',
      email: email || '',
      address: address || '',
      isActive: isActive !== undefined ? isActive : true,
      isAdmin: false,
    });

    return NextResponse.json({
      message: 'Customer created successfully',
      customer: {
        _id: newUser.id,
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
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}