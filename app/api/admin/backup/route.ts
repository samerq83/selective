import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import User from '@/models/User';
import Product from '@/models/Product';
import FavoriteOrder from '@/models/FavoriteOrder';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    await dbConnect();

    // Fetch all data
    const [orders, users, products, favorites] = await Promise.all([
      Order.find().lean(),
      User.find().lean(),
      Product.find().lean(),
      FavoriteOrder.find().lean(),
    ]);

    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        orders,
        users,
        products,
        favorites,
      },
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(backup, null, 2);

    // Return as downloadable file
    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=backup_${new Date().toISOString().split('T')[0]}.json`,
      },
    });
  } catch (error) {
    console.error('Backup creation error:', error);

    const status = error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Admin access required') ? 401 : 500;

    return NextResponse.json(
      { error: status === 401 ? 'Unauthorized' : 'Internal server error' },
      { status }
    );
  }
}