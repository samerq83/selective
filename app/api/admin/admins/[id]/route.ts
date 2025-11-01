import { NextRequest, NextResponse } from 'next/server';
import { updateAdminInMongoDB, deleteAdminFromMongoDB } from '@/lib/admin-mongodb';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { phone, name, email, isActive } = body;

    // Update only provided fields
    const updates: any = {};
    if (phone !== undefined) updates.phone = phone;
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (isActive !== undefined) updates.isActive = isActive;

    const updatedAdmin = await updateAdminInMongoDB(params.id, updates);

    return NextResponse.json({ admin: updatedAdmin });
  } catch (error: any) {
    console.error('Update admin error:', error);
    
    if (error.message === 'Unauthorized' || error.message === 'Admin access required') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message === 'Admin not found') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    await deleteAdminFromMongoDB(params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete admin error:', error);
    
    if (error.message === 'Unauthorized' || error.message === 'Admin access required') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    if (error.message === 'Admin not found') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (error.message === 'Cannot delete the last admin') {
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