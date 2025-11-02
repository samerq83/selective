import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { requireAdmin, requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('[Notifications] Starting request...');
    const user = await requireAuth();
    console.log('[Notifications] User ID:', user.userId);

    await dbConnect();

    // ✅ Optimized query: select only needed fields for better performance
    // ✅ Use lean() for better memory usage (documents are plain objects)
    // ✅ Limit before sort to use index more efficiently
    console.time('[Notifications] Database query time');
    const notifications = await Notification.find({ user: user.userId })
      .select('title message type isRead relatedOrder createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    console.timeEnd('[Notifications] Database query time');

    console.log('[Notifications] Found', notifications.length, 'notifications');

    return NextResponse.json({
      notifications,
      totalUnread: notifications.filter(n => !n.isRead).length,
    });
  } catch (error) {
    console.error('[Notifications] Fetch error:', error);

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