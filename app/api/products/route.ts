import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const products = await Product.find({}).sort({ order: 1, createdAt: -1 });
    
    // Format response to match expected structure
    const formattedProducts = products.map(p => ({
      _id: p._id,
      id: p._id, // For backward compatibility
      name: p.name,
      nameEn: p.name.en,
      nameAr: p.name.ar,
      slug: p.slug,
      image: p.image,
      isAvailable: p.isAvailable,
      unitType: p.unitType || 'carton',
      order: p.order,
    }));
    
    return NextResponse.json(formattedProducts);
  } catch (error) {
    console.error('Get products error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    await connectDB();

    const body = await request.json();
    const { nameEn, nameAr, image, isAvailable, unitType } = body;

    // Generate slug from English name
    const slug = nameEn.toLowerCase().replace(/\s+/g, '-');

    // Create product in MongoDB
    const product = await Product.create({
      name: {
        en: nameEn,
        ar: nameAr,
      },
      slug,
      image: image || '/images/placeholder.png',
      isAvailable: isAvailable ?? true,
      unitType: unitType || 'carton',
      order: 0,
    });

    const formattedProduct = {
      _id: product._id,
      id: product._id,
      name: product.name,
      nameEn: product.name.en,
      nameAr: product.name.ar,
      slug: product.slug,
      image: product.image,
      isAvailable: product.isAvailable,
      unitType: product.unitType || 'carton',
      order: product.order,
    };

    return NextResponse.json({ product: formattedProduct }, { status: 201 });
  } catch (error: any) {
    console.error('Create product error:', error);
    
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