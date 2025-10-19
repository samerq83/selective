import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import FavoriteOrder from '@/models/FavoriteOrder';
import { requireAuth } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = await requireAuth();
    await connectDB();

    const favorite = await FavoriteOrder.findById(params.id);

    if (!favorite) {
      return NextResponse.json(
        { error: 'Favorite not found' },
        { status: 404 }
      );
    }

    // Check if user owns this favorite
    if (favorite.customer.toString() !== authUser.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await FavoriteOrder.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete favorite error:', error);
    
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