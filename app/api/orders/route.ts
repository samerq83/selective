import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getEditDeadline } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Order from '@/models/Order';
import Product from '@/models/Product';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    let query: any = {};

    // If not admin, only show user's orders
    if (!authUser.isAdmin) {
      query.customer = authUser.userId;
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
    const orders = await Order.find(query)
      .populate('customer')
      .populate('items.product')
      .sort({ createdAt: -1 })
      .lean() as any[];

    // Format orders for response
    const formattedOrders = orders.map(order => ({
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
      })),
      totalItems: order.totalItems,
      status: order.status,
      message: order.message,
      canEdit: order.canEdit,
      editDeadline: order.editDeadline,
      history: order.history,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    return NextResponse.json({ orders: formattedOrders });
  } catch (error: any) {
    console.error('Get orders error:', error);
    
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
    await connectDB();

    const body = await request.json();
    const { items, message } = body;

    // Validate minimum order
    const totalItems = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    if (totalItems < 2) {
      return NextResponse.json(
        { error: 'Minimum order is 2 items' },
        { status: 400 }
      );
    }

    // Get user details from MongoDB
    const user = await User.findById(authUser.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

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

    // Prepare order items with product references
    const orderItems = items.map((item: any) => {
      const product = products.find((p: any) => p._id.toString() === item.product);
      return {
        product: product._id,
        quantity: item.quantity,
      };
    });

    // Generate order number
    const orderNumber = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

    // Create order in MongoDB
    const order = await Order.create({
      orderNumber,
      customer: user._id,
      customerName: user.name || user.phone,
      customerPhone: user.phone,
      items: orderItems,
      totalItems,
      status: 'new',
      message,
      canEdit: true,
      editDeadline: getEditDeadline(2), // Default 2 hours
      history: [
        {
          action: 'created',
          by: user._id,
          byName: user.name || user.phone,
          timestamp: new Date(),
        },
      ],
    });

    // Populate for response
    const populatedOrder = await Order.findById(order._id)
      .populate('customer')
      .populate('items.product')
      .lean() as any;

    // Format response
    const formattedOrder = {
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