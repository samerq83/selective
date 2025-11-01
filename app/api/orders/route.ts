import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getEditDeadline } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Order from '@/models/Order';
import Product from '@/models/Product';
import mongoose from 'mongoose';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    console.log('[Orders API] GET request started');
    const authUser = await requireAuth();
    console.log('[Orders API] Auth user:', authUser);
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    let query: any = {};

    // If not admin, only show user's orders
    if (!authUser.isAdmin) {
      // DEBUG: Try both string and ObjectId approaches
      console.log('[Orders API] Testing different query approaches');
      
      // Test with string comparison (like debug endpoint)
      const ordersWithString = await Order.find({ customer: authUser.userId }).lean();
      console.log('[Orders API] Orders found with string query:', ordersWithString.length);
      
      // Test with ObjectId
      const ordersWithObjectId = await Order.find({ 
        customer: new mongoose.Types.ObjectId(authUser.userId) 
      }).lean();
      console.log('[Orders API] Orders found with ObjectId query:', ordersWithObjectId.length);
      
      // Use ObjectId for proper comparison
      query.customer = new mongoose.Types.ObjectId(authUser.userId);
      console.log('[Orders API] User query customer ID:', query.customer);
      console.log('[Orders API] User ID type:', typeof authUser.userId, 'Value:', authUser.userId);
    } else {
      console.log('[Orders API] Admin user, showing all orders');
    }

    if (status) {
      query.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: startDate, $lte: endDate };
    }

    // Fetch from MongoDB with product population
    console.log('[Orders API] Executing query for customer:', query.customer?.toString());
    const orders = await Order.find(query)
      .populate('customer')
      .populate('items.product')
      .sort({ createdAt: -1 })
      .lean() as any[];

    console.log('[Orders API] Found orders count:', orders.length);

    // Format orders for response
    const formattedOrders = orders.map((order: any) => {
      const formatted: any = {
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        items: order.items.map((item: any) => ({
          product: {
            _id: item.product._id,
            nameEn: item.product.name?.en,
            nameAr: item.product.name?.ar,
            image: item.product.image,
          },
          productName: item.productName,
          quantity: item.quantity,
          selectedUnitType: item.selectedUnitType || 'piece',
        })),
        totalItems: order.totalItems,
        status: order.status,
        message: order.message,
        canEdit: order.canEdit,
        editDeadline: order.editDeadline,
        history: order.history,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };

      if (order.purchaseOrderFile) {
        formatted.purchaseOrderFile = order.purchaseOrderFile;
      }

      return formatted;
    });

    console.log('[Orders API] Returning', formattedOrders.length, 'formatted orders');
    return NextResponse.json({ orders: formattedOrders });
  } catch (error: any) {
    console.error('[Orders API] Get orders error:', error);
    
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
    console.log('[Orders API] POST request started');
    const authUser = await requireAuth();
    console.log('[Orders API] Auth user for POST:', authUser);
    await connectDB();

    let items: any[];
    let message: string = '';
    let fileData: File | null = null;

    // Check if request is FormData or JSON
    const contentType = request.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      // Handle JSON request (from reorder)
      const body = await request.json();
      items = body.items || [];
      message = body.message || '';
    } else {
      // Handle FormData request (from new order form)
      const formData = await request.formData();
      const itemsJson = formData.get('items') as string;
      message = formData.get('message') as string || '';
      fileData = formData.get('purchaseOrderFile') as File | null;
      items = JSON.parse(itemsJson);
    }

    console.log('[Orders API] Request body:', { items: items.length, message, hasFile: !!fileData });

    // Validate minimum order
    const totalItems = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    if (totalItems < 2) {
      return NextResponse.json(
        { error: 'Minimum order is 2 items' },
        { status: 400 }
      );
    }

    // Get user details from MongoDB
    console.log('[Orders API] Looking for user with ID:', authUser.userId, 'Type:', typeof authUser.userId);
    const user = await User.findById(authUser.userId);
    if (!user) {
      console.log('[Orders API] User not found in DB with ID:', authUser.userId);
      // DEBUG: Check if user exists with different format
      const userByStringId = await User.findById(authUser.userId.toString());
      const userByObjectId = await User.findById(new mongoose.Types.ObjectId(authUser.userId));
      console.log('[Orders API] Debug - User by string ID:', userByStringId ? 'Found' : 'Not found');
      console.log('[Orders API] Debug - User by ObjectId:', userByObjectId ? 'Found' : 'Not found');
      
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    console.log('[Orders API] User found:', { id: user._id, phone: user.phone, name: user.name });

    // Validate products and check availability
    const productIds = items.map((item: any) => item.product);
    const products = await Product.find({ _id: { $in: productIds } }) as any[];

    if (products.length !== items.length) {
      return NextResponse.json(
        { error: 'Some products not found' },
        { status: 400 }
      );
    }

    // Check availability
    const unavailableProducts = products.filter(p => !p.isAvailable);
    if (unavailableProducts.length > 0) {
      return NextResponse.json(
        { error: 'Some products are unavailable', unavailableProducts },
        { status: 400 }
      );
    }

    // Prepare order items with product references and names
    const orderItems = items.map((item: any) => {
      const product = products.find((p: any) => p._id.toString() === item.product);
      return {
        product: product._id,
        productName: {
          en: product.name?.en || 'Unknown Product',
          ar: product.name?.ar || 'منتج غير معروف',
        },
        quantity: item.quantity,
        selectedUnitType: item.selectedUnitType || 'piece',
      };
    });

    // Generate order number
    const orderNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    // Handle file upload if provided
    let purchaseOrderFile = undefined;
    if (fileData) {
      try {
        const bytes = await fileData.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'purchase-orders');
        await mkdir(uploadsDir, { recursive: true });
        
        const timestamp = Date.now();
        const fileExtension = fileData.name.split('.').pop();
        const filename = `${user._id}_${timestamp}.${fileExtension}`;
        const filepath = join(uploadsDir, filename);
        
        await writeFile(filepath, buffer);
        
        purchaseOrderFile = {
          filename: fileData.name,
          path: `/uploads/purchase-orders/${filename}`,
        };
        
        console.log('[Orders API] File uploaded successfully:', purchaseOrderFile);
      } catch (fileError: any) {
        console.error('[Orders API] File upload error:', fileError);
      }
    }

    // Create order in MongoDB
    console.log('[Orders API] Creating order with data:', {
      orderNumber,
      customer: user._id,
      customerName: user.name || user.phone,
      customerPhone: user.phone,
      itemsCount: orderItems.length,
      totalItems,
      status: 'new',
      message,
      hasPurchaseOrderFile: !!purchaseOrderFile,
    });

    const orderData: any = {
      orderNumber,
      customer: user._id,
      customerName: user.name || user.phone,
      customerPhone: user.phone,
      items: orderItems,
      totalItems,
      status: 'new',
      message,
      canEdit: true,
      editDeadline: getEditDeadline(2),
      history: [
        {
          action: 'created',
          by: user._id,
          byName: user.name || user.phone,
          timestamp: new Date(),
        },
      ],
    };

    if (purchaseOrderFile) {
      orderData.purchaseOrderFile = purchaseOrderFile;
    }

    const order = await Order.create(orderData);

    console.log('[Orders API] Order created with ID:', order._id);

    // Populate for response
    const populatedOrder = await Order.findById(order._id)
      .populate('customer')
      .populate('items.product')
      .lean() as any;

    // Format response
    const formattedOrder: any = {
      _id: populatedOrder._id,
      orderNumber: populatedOrder.orderNumber,
      customer: {
        _id: populatedOrder.customer._id,
        name: populatedOrder.customer.name,
        phone: populatedOrder.customer.phone,
      },
      items: populatedOrder.items.map((item: any) => ({
        product: {
          _id: item.product._id,
          nameEn: item.product.name?.en,
          nameAr: item.product.name?.ar,
          image: item.product.image,
        },
        quantity: item.quantity,
        selectedUnitType: item.selectedUnitType || 'piece',
      })),
      totalItems: populatedOrder.totalItems,
      status: populatedOrder.status,
      message: populatedOrder.message,
      canEdit: populatedOrder.canEdit,
      editDeadline: populatedOrder.editDeadline,
      history: populatedOrder.history,
      createdAt: populatedOrder.createdAt,
      updatedAt: populatedOrder.updatedAt,
    };

    if (populatedOrder.purchaseOrderFile) {
      formattedOrder.purchaseOrderFile = populatedOrder.purchaseOrderFile;
    }

    return NextResponse.json({ order: formattedOrder }, { status: 201 });
  } catch (error: any) {
    console.error('Create order error:', error);
    
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