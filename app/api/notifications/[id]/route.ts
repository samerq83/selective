import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import { requireAuth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    await dbConnect();

    const { isRead } = await req.json();

    const notification = await Notification.findOne({
      _id: params.id,
      user: user.userId,
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    notification.isRead = isRead;
    await notification.save();

    return NextResponse.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Notification update error:', error);

    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500;

    return NextResponse.json(
      { error: status === 401 ? 'Unauthorized' : 'Internal server error' },
      { status }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();

    await dbConnect();

    const notification = await Notification.findOneAndDelete({
      _id: params.id,
      user: user.userId,
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Notification deletion error:', error);

    const status = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500;

    return NextResponse.json(
      { error: status === 401 ? 'Unauthorized' : 'Internal server error' },
      { status }
    );
  }
}