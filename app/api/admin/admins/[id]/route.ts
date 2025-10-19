import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/simple-db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { phone, name, email, isActive } = body;

    const db = readDB();
    const index = db.users.findIndex(u => u.id === params.id);
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Update only provided fields
    if (phone !== undefined) db.users[index].phone = phone;
    if (name !== undefined) db.users[index].name = name;
    if (email !== undefined) db.users[index].email = email;
    if (isActive !== undefined) db.users[index].isActive = isActive;

    writeDB(db);

    return NextResponse.json({ admin: db.users[index] });
  } catch (error: any) {
    console.error('Update admin error:', error);
    
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
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const db = readDB();
    const index = db.users.findIndex(u => u.id === params.id);
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Don't allow deleting the last admin
    const adminCount = db.users.filter(u => u.isAdmin).length;
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last admin' },
        { status: 400 }
      );
    }

    db.users.splice(index, 1);
    writeDB(db);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete admin error:', error);
    
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