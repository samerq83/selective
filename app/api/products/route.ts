import { NextRequest, NextResponse } from 'next/server';
import { getProducts, createProduct } from '@/lib/simple-db';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = getProducts();
    return NextResponse.json(products);
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

    const body = await request.json();
    const { nameEn, nameAr, image, isAvailable } = body;

    // Generate slug from English name
    const slug = nameEn.toLowerCase().replace(/\s+/g, '-');

    const product = createProduct({
      name: {
        en: nameEn,
        ar: nameAr,
      },
      slug,
      image: image || '/images/placeholder.png',
      isAvailable: isAvailable ?? true,
      order: 0,
    });

    return NextResponse.json({ product: { ...product, _id: product.id } }, { status: 201 });
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