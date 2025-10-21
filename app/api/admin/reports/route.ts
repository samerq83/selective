import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { readDB } from '@/lib/simple-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    console.log('[Admin Reports] Starting request...');
    const user = await requireAdmin();
    console.log('[Admin Reports] User:', user);
    
    if (!user || !user.isAdmin) {
      console.log('[Admin Reports] Unauthorized access attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    console.log('[Admin Reports] Date range:', { start, end });

    const db = readDB();
    
    // Filter orders by date range
    const filteredOrders = db.orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= start && orderDate <= end;
    });

    console.log('[Admin Reports] Filtered orders count:', filteredOrders.length);

    // Daily Orders Trend
    const dailyOrdersMap: { [date: string]: { count: number; items: number } } = {};
    filteredOrders.forEach(order => {
      const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
      if (!dailyOrdersMap[dateStr]) {
        dailyOrdersMap[dateStr] = { count: 0, items: 0 };
      }
      dailyOrdersMap[dateStr].count++;
      dailyOrdersMap[dateStr].items += order.totalItems;
    });

    const dailyOrders = Object.entries(dailyOrdersMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top Products
    const productQuantities: { [productId: string]: { name: string; quantity: number; orders: number } } = {};
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        if (!productQuantities[item.product]) {
          productQuantities[item.product] = {
            name: item.productName.en,
            quantity: 0,
            orders: 0,
          };
        }
        productQuantities[item.product].quantity += item.quantity;
        productQuantities[item.product].orders++;
      });
    });

    const topProducts = Object.values(productQuantities)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Top Customers
    const customerStats: { [customerId: string]: { name: string; phone: string; orders: number; items: number } } = {};
    filteredOrders.forEach(order => {
      if (!customerStats[order.customer]) {
        const customer = db.users.find(u => u.id === order.customer);
        customerStats[order.customer] = {
          name: customer?.name || 'Unknown',
          phone: customer?.phone || '',
          orders: 0,
          items: 0,
        };
      }
      customerStats[order.customer].orders++;
      customerStats[order.customer].items += order.totalItems;
    });

    const topCustomers = Object.values(customerStats)
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 10);

    // Status Distribution
    const statusCounts: { [status: string]: number } = {};
    filteredOrders.forEach(order => {
      statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
    });

    const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
      name,
      value,
    }));

    // Summary Statistics
    const totalOrders = filteredOrders.length;
    const totalItems = filteredOrders.reduce((sum, order) => sum + order.totalItems, 0);
    const totalCustomers = db.users.filter(u => !u.isAdmin).length;
    
    const newCustomers = db.users.filter(u => {
      if (u.isAdmin) return false;
      const createdAt = u.lastLogin ? new Date(u.lastLogin) : new Date();
      return createdAt >= start && createdAt <= end;
    }).length;

    const averageOrderSize = totalOrders > 0 ? totalItems / totalOrders : 0;

    // Customer-Product Matrix for Excel export
    const customerProductMap: { 
      [key: string]: { 
        customerId: string;
        customerName: string;
        productId: string;
        productNameEn: string;
        productNameAr: string;
        quantity: number;
      } 
    } = {};

    filteredOrders.forEach(order => {
      const customer = db.users.find(u => u.id === order.customer);
      const customerName = customer?.name || 'Unknown';
      
      order.items.forEach(item => {
        const key = `${order.customer}-${item.product}`;
        if (!customerProductMap[key]) {
          customerProductMap[key] = {
            customerId: order.customer,
            customerName,
            productId: item.product,
            productNameEn: item.productName.en,
            productNameAr: item.productName.ar,
            quantity: 0,
          };
        }
        customerProductMap[key].quantity += item.quantity;
      });
    });

    const customerProductMatrix = Object.values(customerProductMap).map(item => ({
      _id: {
        customerId: item.customerId,
        customerName: item.customerName,
        productId: item.productId,
        productNameEn: item.productNameEn,
        productNameAr: item.productNameAr,
      },
      quantity: item.quantity,
    }));

    console.log('[Admin Reports] Customer-Product Matrix count:', customerProductMatrix.length);

    return NextResponse.json({
      dailyOrders,
      topProducts,
      topCustomers,
      statusDistribution,
      customerProductMatrix,
      summary: {
        totalOrders,
        totalItems,
        totalCustomers,
        newCustomers,
        averageOrderSize,
      },
    });
  } catch (error) {
    console.error('[Admin Reports] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}