import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Order from '@/models/Order';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    await connectDB();

    const debug = {
      currentUser: {
        userId: authUser.userId,
        userIdType: typeof authUser.userId,
        phone: authUser.phone,
        isAdmin: authUser.isAdmin,
      },
      userData: {},
      ordersData: {},
    };

    // Check current user in DB
    const user = await User.findById(authUser.userId).lean();
    if (user) {
      debug.userData = {
        found: true,
        id: user._id.toString(),
        phone: user.phone,
        name: user.name || 'N/A',
        isAdmin: user.isAdmin || false,
      };
    } else {
      debug.userData = { found: false };
      
      // Try different formats
      const userByString = await User.findById(authUser.userId.toString()).lean();
      const userByObjectId = await User.findById(new mongoose.Types.ObjectId(authUser.userId)).lean();
      
      debug.userData.alternatives = {
        byString: userByString ? { id: userByString._id.toString(), phone: userByString.phone } : null,
        byObjectId: userByObjectId ? { id: userByObjectId._id.toString(), phone: userByObjectId.phone } : null,
      };
    }

    // Get all orders
    const allOrders = await Order.find({})
      .select('orderNumber customer customerName customerPhone createdAt')
      .lean();

    debug.ordersData = {
      totalOrders: allOrders.length,
      orders: allOrders.map(order => ({
        orderNumber: order.orderNumber,
        customer: order.customer.toString(),
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        createdAt: order.createdAt,
      })),
    };

    // Check orders for current user
    const userOrders = allOrders.filter(order => 
      order.customer.toString() === authUser.userId.toString()
    );

    debug.ordersData.currentUserOrders = {
      count: userOrders.length,
      orders: userOrders.map(order => ({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
      })),
    };

    // Get all users for comparison
    const allUsers = await User.find({})
      .select('phone name isAdmin')
      .lean();

    debug.allUsers = allUsers.map(u => ({
      id: u._id.toString(),
      phone: u.phone,
      name: u.name || 'N/A',
      isAdmin: u.isAdmin || false,
    }));

    return NextResponse.json(debug);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}