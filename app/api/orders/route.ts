import { NextRequest, NextResponse } from 'next/server';
import { 
  findProductsByIds, 
  getSettings, 
  createOrder, 
  createNotification,
  getOrders 
} from '@/lib/simple-db';
import { requireAuth } from '@/lib/auth';
import { getEditDeadline } from '@/lib/utils';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();

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

    const orders = getOrders(query);

    return NextResponse.json({ orders });
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
    const products = findProductsByIds(productIds);

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

    // Prepare order items with product names
    const orderItems = items.map((item: any) => {
      const product = products.find(p => p.id === item.product);
      return {
        product: item.product,
        productName: product!.name,
        quantity: item.quantity,
      };
    });

    // Get settings for edit time limit
    const settings = getSettings();
    const editTimeLimit = settings?.orderSettings?.editTimeLimit || 2;

    // Create order
    const order = createOrder({
      customer: String(user._id),
      customerName: user.name || user.phone,
      customerPhone: user.phone,
      items: orderItems,
      totalItems,
      status: 'new',
      message,
      canEdit: true,
      editDeadline: getEditDeadline(editTimeLimit),
      history: [
        {
          action: 'created',
          by: String(user._id),
          byName: user.name || user.phone,
          timestamp: new Date(),
        },
      ],
    });

    // Create notification for customer
    createNotification({
      user: String(user._id),
      type: 'order_created',
      title: {
        en: 'Order Created',
        ar: 'تم إنشاء الطلب',
      },
      message: {
        en: `Your order #${order.orderNumber} has been created successfully`,
        ar: `تم إنشاء طلبك رقم #${order.orderNumber} بنجاح`,
      },
      relatedOrder: order._id,
    });

    return NextResponse.json({ order }, { status: 201 });
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