import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * 📥 Download purchase order file from MongoDB
 * GET /api/orders/download-file?orderId=<id>
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Download API] GET request started');
    const authUser = await requireAuth();
    await connectDB();

    const orderId = request.nextUrl.searchParams.get('orderId');
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json(
        { error: 'Invalid order ID format' },
        { status: 400 }
      );
    }

    console.log('[Download API] Fetching order:', orderId);
    const order = await Order.findById(orderId).lean();

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify user owns the order or is admin
    if (!authUser.isAdmin && order.customer.toString() !== authUser.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if order has file
    if (!order.purchaseOrderFile?.data) {
      return NextResponse.json(
        { error: 'No file attached to this order' },
        { status: 404 }
      );
    }

    const fileData = order.purchaseOrderFile;

    // Decode base64 to buffer
    const binaryString = Buffer.from(fileData.data, 'base64').toString('binary');
    const uint8Array = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      uint8Array[i] = binaryString.charCodeAt(i);
    }

    console.log('[Download API] File ready for download:', {
      filename: fileData.filename,
      contentType: fileData.contentType,
      size: uint8Array.length,
    });

    // Return file with proper headers
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': fileData.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileData.filename)}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('[Download API] Error:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}