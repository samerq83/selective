import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Order from '@/models/Order';
import Product from '@/models/Product';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Order Details] Fetching order:', params.id);
    
    const authUser = await getAuthUser();
    if (!authUser) {
      console.log('[Order Details] Unauthorized - no auth user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Fetch order from MongoDB
    const order = await Order.findById(params.id)
      .populate('customer')
      .populate('items.product')
      .lean();

    if (!order) {
      console.log('[Order Details] Order not found:', params.id);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this order
    if (!authUser.isAdmin && order.customer._id.toString() !== authUser.userId) {
      console.log('[Order Details] Forbidden - user does not own this order');
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Format order with complete product information
    const populatedOrder = {
      _id: order._id,
      orderNumber: order.orderNumber,
      customer: {
        _id: order.customer._id,
        name: order.customer.name,
        phone: order.customer.phone,
        companyName: order.customer.companyName,
      },
      items: order.items.map((item: any) => ({
        quantity: item.quantity,
        product: {
          _id: item.product._id,
          nameEn: item.product.name?.en,
          nameAr: item.product.name?.ar,
          image: item.product.image,
        },
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

    console.log('[Order Details] Order found and returned');
    return NextResponse.json(populatedOrder);
  } catch (error: any) {
    console.error('[Order Details] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Order Update] Updating order:', params.id);
    
    const authUser = await getAuthUser();
    if (!authUser) {
      console.log('[Order Update] Unauthorized - no auth user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    const body = await request.json();
    const { items, message, status } = body;
    console.log('[Order Update] Update data:', { items: items?.length, message, status });

    // Fetch order from MongoDB
    const order = await Order.findById(params.id).populate('customer').populate('items.product');

    if (!order) {
      console.log('[Order Update] Order not found:', params.id);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isOwner = order.customer._id.toString() === authUser.userId;
    
    if (!authUser.isAdmin && !isOwner) {
      console.log('[Order Update] Forbidden - user does not own this order');
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if order can be edited (for customers)
    if (!authUser.isAdmin && isOwner) {
      if (order.status !== 'new') {
        console.log('[Order Update] Cannot edit received order');
        return NextResponse.json(
          { error: 'Cannot edit order after it has been received' },
          { status: 400 }
        );
      }
    }

    // Update items if provided
    if (items) {
      const totalItems = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
      
      if (totalItems < 2) {
        console.log('[Order Update] Minimum order not met:', totalItems);
        return NextResponse.json(
          { error: 'Minimum order is 2 items' },
          { status: 400 }
        );
      }

      // Validate products exist in MongoDB
      const productIds = items.map((item: any) => item.product);
      const products = await Product.find({ _id: { $in: productIds } });

      if (products.length !== items.length) {
        console.log('[Order Update] Some products not found');
        return NextResponse.json(
          { error: 'Some products not found' },
          { status: 400 }
        );
      }

      // Check availability
      const unavailableProducts = products.filter(p => !p.isAvailable);
      if (unavailableProducts.length > 0) {
        return NextResponse.json(
          { error: 'Some products are unavailable' },
          { status: 400 }
        );
      }

      // Prepare order items
      order.items = items.map((item: any) => {
        const product = products.find(p => p._id.toString() === item.product);
        return {
          product: item.product,
          productName: {
            en: product?.name?.en,
            ar: product?.name?.ar,
          },
          quantity: item.quantity,
        };
      });
      
      order.totalItems = totalItems;
    }

    // Update message if provided
    if (message !== undefined) {
      order.message = message;
    }

    // Update status if provided (admin only)
    if (status && authUser.isAdmin) {
      console.log('[Order Update] Admin updating status to:', status);
      order.status = status;
      
      if (status === 'received') {
        order.canEdit = false;
      }
    }

    // Add to history
    order.history.push({
      action: 'updated',
      by: authUser.userId,
      byName: order.customer.name || order.customer.phone,
      timestamp: new Date(),
    });

    order.updatedAt = new Date();

    // Save to database
    await order.save();

    // Reload with populated data
    const updatedOrder = await Order.findById(order._id)
      .populate('customer')
      .populate('items.product')
      .lean();

    // Format response
    const populatedOrder = {
      _id: updatedOrder?._id,
      orderNumber: updatedOrder?.orderNumber,
      customer: {
        _id: updatedOrder?.customer._id,
        name: updatedOrder?.customer.name,
        phone: updatedOrder?.customer.phone,
        companyName: updatedOrder?.customer.companyName,
      },
      items: updatedOrder?.items.map((item: any) => ({
        quantity: item.quantity,
        product: {
          _id: item.product._id,
          nameEn: item.product.name?.en,
          nameAr: item.product.name?.ar,
          image: item.product.image,
        },
      })),
      totalItems: updatedOrder?.totalItems,
      status: updatedOrder?.status,
      message: updatedOrder?.message,
      canEdit: updatedOrder?.canEdit,
      editDeadline: updatedOrder?.editDeadline,
      history: updatedOrder?.history,
      createdAt: updatedOrder?.createdAt,
      updatedAt: updatedOrder?.updatedAt,
    };

    console.log('[Order Update] Order updated successfully');
    return NextResponse.json(populatedOrder);
  } catch (error: any) {
    console.error('[Order Update] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[Order Delete] Deleting order:', params.id);
    
    const authUser = await getAuthUser();
    if (!authUser) {
      console.log('[Order Delete] Unauthorized - no auth user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Fetch order from MongoDB
    const order = await Order.findById(params.id);

    if (!order) {
      console.log('[Order Delete] Order not found:', params.id);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const isOwner = order.customer.toString() === authUser.userId;
    
    // Admin can delete any order, customer can only delete their own 'new' orders
    if (!authUser.isAdmin) {
      if (!isOwner) {
        console.log('[Order Delete] Forbidden - user does not own this order');
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403 }
        );
      }
      
      if (order.status !== 'new') {
        console.log('[Order Delete] Cannot delete received order');
        return NextResponse.json(
          { error: 'Cannot delete order after it has been received' },
          { status: 400 }
        );
      }
    }

    // Delete order
    await Order.findByIdAndDelete(params.id);

    console.log('[Order Delete] Order deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Order Delete] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}