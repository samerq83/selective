import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB, updateUser } from '@/lib/simple-db';
import { requireAdmin } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const { isActive } = await req.json();

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    const db = readDB();
    const customer = db.users.find(u => u.id === params.id);

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    if (customer.isAdmin) {
      return NextResponse.json(
        { error: 'Cannot modify admin users' },
        { status: 403 }
      );
    }

    const updatedCustomer = updateUser(params.id, { isActive });

    return NextResponse.json({
      success: true,
      customer: {
        id: updatedCustomer?.id,
        isActive: updatedCustomer?.isActive,
      },
    });
  } catch (error: any) {
    console.error('Customer update error:', error);
    
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

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { companyName, name, email, address, isActive } = body;

    const db = readDB();
    const customer = db.users.find(u => u.id === params.id);

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    if (customer.isAdmin) {
      return NextResponse.json(
        { error: 'Cannot modify admin users' },
        { status: 403 }
      );
    }

    // Update customer fields
    const updates: any = {};
    if (companyName !== undefined) updates.companyName = companyName;
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;
    if (isActive !== undefined) updates.isActive = isActive;

    const updatedCustomer = updateUser(params.id, updates);

    return NextResponse.json({
      success: true,
      customer: {
        _id: updatedCustomer?.id,
        phone: updatedCustomer?.phone,
        companyName: updatedCustomer?.companyName,
        name: updatedCustomer?.name,
        email: updatedCustomer?.email,
        address: updatedCustomer?.address,
        isActive: updatedCustomer?.isActive,
      },
    });
  } catch (error: any) {
    console.error('Customer update error:', error);
    
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const db = readDB();
    const customer = db.users.find(u => u.id === params.id);

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    if (customer.isAdmin) {
      return NextResponse.json(
        { error: 'Cannot delete admin users' },
        { status: 403 }
      );
    }

    // Remove customer from database
    db.users = db.users.filter(u => u.id !== params.id);
    writeDB(db);

    return NextResponse.json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (error: any) {
    console.error('Customer deletion error:', error);
    
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