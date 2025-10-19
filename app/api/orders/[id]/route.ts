import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { readDB, writeDB, findProductsByIds, createNotification } from '@/lib/simple-db';

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

    const db = readDB();
    const order = db.orders.find(o => o.id === params.id);

    if (!order) {
      console.log('[Order Details] Order not found:', params.id);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this order
    if (!authUser.isAdmin && order.customer !== authUser.userId) {
      console.log('[Order Details] Forbidden - user does not own this order');
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Populate customer and product info
    const customer = db.users.find(u => u.id === order.customer);
    const items = order.items.map(item => {
      const product = db.products.find(p => p.id === item.product);
      return {
        quantity: item.quantity,
        product: {
          _id: item.product,
          nameEn: item.productName.en,
          nameAr: item.productName.ar,
          image: product?.image || '',
        },
      };
    });

    const populatedOrder = {
      ...order,
      _id: order.id,
      customer: {
        _id: customer?.id || '',
        name: customer?.name || '',
        phone: customer?.phone || '',
        companyName: customer?.companyName || '',
      },
      items,
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

    const body = await request.json();
    const { items, message, status } = body;
    console.log('[Order Update] Update data:', { items: items?.length, message, status });

    const db = readDB();
    const orderIndex = db.orders.findIndex(o => o.id === params.id);

    if (orderIndex === -1) {
      console.log('[Order Update] Order not found:', params.id);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = db.orders[orderIndex];

    // Check permissions
    const isOwner = order.customer === authUser.userId;
    
    if (!authUser.isAdmin && !isOwner) {
      console.log('[Order Update] Forbidden - user does not own this order');
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if order can be edited (for customers)
    // Customers can edit anytime as long as status is 'new' (not received by admin)
    if (!authUser.isAdmin && isOwner) {
      if (order.status !== 'new') {
        console.log('[Order Update] Cannot edit received order');
        return NextResponse.json(
          { error: 'Cannot edit order after it has been received' },
          { status: 400 }
        );
      }
    }

    const user = db.users.find(u => u.id === authUser.userId);

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

      // Validate products
      const productIds = items.map((item: any) => item.product);
      const products = findProductsByIds(productIds);

      const orderItems = items.map((item: any) => {
        const product = products.find(p => p.id === item.product);
        return {
          product: item.product,
          productName: product!.name,
          quantity: item.quantity,
        };
      });

      order.items = orderItems;
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
        
        // Notify customer
        createNotification({
          user: order.customer,
          type: 'order_received',
          title: {
            en: 'Order Received',
            ar: 'تم استلام الطلب',
          },
          message: {
            en: `Your order #${order.orderNumber} has been received`,
            ar: `تم استلام طلبك رقم #${order.orderNumber}`,
          },
          relatedOrder: order.id,
        });
      }
    }

    // Add to history
    order.history.push({
      action: 'updated',
      by: authUser.userId,
      byName: user?.name || user?.phone || 'Unknown',
      timestamp: new Date(),
    });

    order.updatedAt = new Date();

    // Save to database
    db.orders[orderIndex] = order;
    writeDB(db);

    // Notify customer if admin updated
    if (authUser.isAdmin && !isOwner) {
      createNotification({
        user: order.customer,
        type: 'order_updated',
        title: {
          en: 'Order Updated',
          ar: 'تم تحديث الطلب',
        },
        message: {
          en: `Your order #${order.orderNumber} has been updated`,
          ar: `تم تحديث طلبك رقم #${order.orderNumber}`,
        },
        relatedOrder: order.id,
      });
    }

    // Populate response
    const customer = db.users.find(u => u.id === order.customer);
    const populatedItems = order.items.map(item => {
      const product = db.products.find(p => p.id === item.product);
      return {
        quantity: item.quantity,
        product: {
          _id: item.product,
          nameEn: item.productName.en,
          nameAr: item.productName.ar,
          image: product?.image || '',
        },
      };
    });

    const populatedOrder = {
      ...order,
      _id: order.id,
      customer: {
        _id: customer?.id || '',
        name: customer?.name || '',
        phone: customer?.phone || '',
        companyName: customer?.companyName || '',
      },
      items: populatedItems,
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

    const db = readDB();
    const orderIndex = db.orders.findIndex(o => o.id === params.id);

    if (orderIndex === -1) {
      console.log('[Order Delete] Order not found:', params.id);
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const order = db.orders[orderIndex];

    // Check permissions
    const isOwner = order.customer === authUser.userId;
    
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

    // Remove order
    db.orders.splice(orderIndex, 1);
    writeDB(db);

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