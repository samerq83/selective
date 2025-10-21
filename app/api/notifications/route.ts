import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { requireAdmin, requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    await dbConnect();

    const notifications = await Notification.find({ user: user.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({
      notifications,
    });
  } catch (error) {
    console.error('Notifications fetch error:', error);

    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500;

    return NextResponse.json(
      { error: status === 401 ? 'Unauthorized' : 'Internal server error' },
      { status }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    await dbConnect();

    const { userId, title, message, type, relatedOrder } = await req.json();

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const notification = await Notification.create({
      user: userId,
      title,
      message,
      type: type || 'info',
      relatedOrder,
    });

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Notification creation error:', error);

    const status = error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Admin access required') ? 401 : 500;

    return NextResponse.json(
      { error: status === 401 ? 'Unauthorized' : 'Internal server error' },
      { status }
    );
  }
}