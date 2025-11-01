import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import mongoose from 'mongoose';
import * as fs from 'fs/promises';
import * as path from 'path';

export const dynamic = 'force-dynamic';

/**
 * 📥 Download purchase order file from MongoDB or filesystem
 * GET /api/orders/download-file?orderId=<id>
 * 
 * Handles both:
 * 1. New files: Stored as Base64 in MongoDB (purchaseOrderFile.data)
 * 2. Legacy files: Stored on filesystem (purchaseOrderFile.path)
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
    if (!order.purchaseOrderFile) {
      return NextResponse.json(
        { error: 'No file attached to this order' },
        { status: 404 }
      );
    }

    const fileData = order.purchaseOrderFile;
    let uint8Array: Uint8Array;
    let filename: string = fileData.filename || 'purchase-order.pdf';
    let contentType: string = fileData.contentType || 'application/octet-stream';

    // 📦 CASE 1: NEW FILE - Stored as Base64 in MongoDB
    if (fileData.data) {
      console.log('[Download API] Using Base64 data from MongoDB');
      const binaryString = Buffer.from(fileData.data, 'base64').toString('binary');
      uint8Array = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        uint8Array[i] = binaryString.charCodeAt(i);
      }
    }
    // 🔄 CASE 2: LEGACY FILE - Stored on filesystem (for backward compatibility)
    else if (fileData.path) {
      console.log('[Download API] Attempting to retrieve legacy file from filesystem:', fileData.path);
      try {
        // Sanitize path to prevent directory traversal
        const basePath = path.join(process.cwd(), 'public/uploads/purchase-orders');
        const fullPath = path.join(basePath, path.basename(fileData.path));
        
        console.log('[Download API] Resolved path:', fullPath);
        
        // Check if file exists
        const fileExists = await fs.stat(fullPath).catch(() => null);
        if (!fileExists) {
          console.warn('[Download API] Legacy file not found at:', fullPath);
          return NextResponse.json(
            { error: 'File no longer available on server (legacy file)' },
            { status: 404 }
          );
        }

        // Read file from filesystem
        const fileBuffer = await fs.readFile(fullPath);
        uint8Array = new Uint8Array(fileBuffer);
        
        console.log('[Download API] Legacy file retrieved successfully');
        console.log('[Download API] File info:', {
          filename,
          contentType,
          size: uint8Array.length,
          path: fullPath,
        });
      } catch (fsError: any) {
        console.error('[Download API] Error reading legacy file:', fsError);
        return NextResponse.json(
          { error: 'Failed to retrieve file from server' },
          { status: 500 }
        );
      }
    }
    // ❌ CASE 3: NO DATA AND NO PATH
    else {
      console.error('[Download API] File record exists but has no data or path:', fileData);
      return NextResponse.json(
        { error: 'File data corrupted: missing both Base64 data and filesystem path' },
        { status: 500 }
      );
    }

    console.log('[Download API] File ready for download:', {
      filename,
      contentType,
      size: uint8Array.length,
    });

    // Return file with proper headers
    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
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