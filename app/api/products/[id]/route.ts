import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    await connectDB();

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

    const product = await Product.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    );

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const formattedProduct = {
      _id: product._id,
      id: product._id,
      name: product.name,
      nameEn: product.name.en,
      nameAr: product.name.ar,
      slug: product.slug,
      image: product.image,
      isAvailable: product.isAvailable,
      order: product.order,
    };

    return NextResponse.json({ product: formattedProduct });
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
    await connectDB();

    const product = await Product.findByIdAndDelete(params.id);

    if (!product) {
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