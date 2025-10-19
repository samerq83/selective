import { NextRequest, NextResponse } from 'next/server';
import { updateProduct, deleteProduct } from '@/lib/simple-db';
import { requireAdmin } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { nameEn, nameAr, image, isAvailable } = body;

    const updateData: any = {};
    
    // Update name if provided
    if (nameEn !== undefined || nameAr !== undefined) {
      updateData.name = {};
      if (nameEn !== undefined) updateData.name.en = nameEn;
      if (nameAr !== undefined) updateData.name.ar = nameAr;
    }
    
    // Update other fields if provided
    if (image !== undefined) updateData.image = image;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;

    const product = updateProduct(params.id, updateData);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ product: { ...product, _id: product.id } });
  } catch (error: any) {
    console.error('Update product error:', error);
    
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

    const success = deleteProduct(params.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete product error:', error);
    
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