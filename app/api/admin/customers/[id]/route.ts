import { NextRequest, NextResponse } from 'next/server';
import { updateCustomerInMongoDB, deleteCustomerFromMongoDB } from '@/lib/admin-mongodb';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

    const updatedCustomer = await updateCustomerInMongoDB(params.id, { isActive });

    return NextResponse.json({
      success: true,
      customer: {
        id: updatedCustomer._id,
        isActive: updatedCustomer.isActive,
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

    if (error.message === 'Customer not found' || error.message === 'Cannot modify admin users') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Customer not found' ? 404 : 403 }
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

    // Update customer fields
    const updates: any = {};
    if (companyName !== undefined) updates.companyName = companyName;
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (address !== undefined) updates.address = address;
    if (isActive !== undefined) updates.isActive = isActive;

    const updatedCustomer = await updateCustomerInMongoDB(params.id, updates);

    return NextResponse.json({
      success: true,
      customer: {
        _id: updatedCustomer._id,
        phone: updatedCustomer.phone,
        companyName: updatedCustomer.companyName,
        name: updatedCustomer.name,
        email: updatedCustomer.email,
        address: updatedCustomer.address,
        isActive: updatedCustomer.isActive,
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

    if (error.message === 'Customer not found' || error.message === 'Cannot modify admin users') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Customer not found' ? 404 : 403 }
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

    await deleteCustomerFromMongoDB(params.id);

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

    if (error.message === 'Customer not found' || error.message === 'Cannot delete admin users') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'Customer not found' ? 404 : 403 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}