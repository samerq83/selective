import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FavoriteOrder from '@/models/FavoriteOrder';
import Product from '@/models/Product';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    
    if (authUser.isAdmin) {
      return NextResponse.json(
        { error: 'Admins cannot have favorite orders' },
        { status: 403 }
      );
    }

    await connectDB();

    const favorites = await FavoriteOrder.find({ customer: authUser.userId })
      .populate('items.product', 'name image isAvailable')
      .sort({ createdAt: -1 });

    return NextResponse.json({ favorites });
  } catch (error: any) {
    console.error('Get favorites error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    
    if (authUser.isAdmin) {
      return NextResponse.json(
        { error: 'Admins cannot create favorite orders' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { name, items } = body;

    if (!name || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Name and items are required' },
        { status: 400 }
      );
    }

    // Validate name length
    if (name.length > 50) {
      return NextResponse.json(
        { error: 'Name must be 50 characters or less' },
        { status: 400 }
      );
    }

    // Validate products
    const productIds = items.map((item: any) => item.product);
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== items.length) {
      return NextResponse.json(
        { error: 'Some products not found' },
        { status: 400 }
      );
    }

    // Prepare items with product names
    const normalizeId = (value: unknown): string => {
      if (typeof value === 'string') {
        return value;
      }

      if (value && typeof value === 'object' && 'toString' in value) {
        return (value as { toString: () => string }).toString();
      }

      return '';
    };

    const favoriteItems = items.map((item: any) => {
      const product = products.find((p: any) => normalizeId(p._id) === normalizeId(item.product));
      const rawName = product?.name;
      const productName =
        typeof rawName === 'string'
          ? rawName
          : rawName?.en ?? rawName?.ar ?? 'Unknown Product';

      return {
        product: item.product,
        productName,
        quantity: item.quantity,
      };
    });

    const totalItems = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

    // Check if user already has 10 favorites
    const existingCount = await FavoriteOrder.countDocuments({ customer: authUser.userId });
    if (existingCount >= 10) {
      return NextResponse.json(
        { error: 'Maximum 10 favorite orders allowed' },
        { status: 400 }
      );
    }

    const favorite = await FavoriteOrder.create({
      customer: authUser.userId,
      name,
      items: favoriteItems,
      totalItems,
    });

    return NextResponse.json({ favorite }, { status: 201 });
  } catch (error: any) {
    console.error('Create favorite error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}