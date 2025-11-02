// Admin helper functions for MongoDB operations
import dbConnect from './mongodb';
import User from '@/models/User';
import Order from '@/models/Order';

// Interface definitions
interface AdminOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  customerId?: string;
}

interface AdminOrdersResult {
  orders: any[];
  total: number;
  totalPages: number;
  currentPage: number;
}

/**
 * Get admin statistics from MongoDB
 */
export async function getAdminStatsFromMongoDB(filter: string = 'today', customDate?: string, language: string = 'en') {
  await dbConnect();

  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  // Determine date range based on filter
  switch (filter) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      break;
    case 'yesterday':
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
      break;
    case 'thisWeek':
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);
      startDate = weekStart;
      endDate = new Date();
      break;
    case 'lastWeek':
      const lastWeekEnd = new Date(now);
      lastWeekEnd.setDate(now.getDate() - now.getDay() - 1);
      lastWeekEnd.setHours(23, 59, 59);
      const lastWeekStart = new Date(lastWeekEnd);
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
      lastWeekStart.setHours(0, 0, 0, 0);
      startDate = lastWeekStart;
      endDate = lastWeekEnd;
      break;
    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date();
      break;
    case 'lastMonth':
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate = lastMonth;
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    case 'custom':
      if (customDate) {
        startDate = new Date(customDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(customDate);
        endDate.setHours(23, 59, 59);
      } else {
        // Default to today if no custom date provided
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      }
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  }

  // Get statistics from MongoDB
  console.time('[Admin Stats] Database queries');
  const [totalCustomers, ordersInPeriod, newOrders, receivedOrders] = await Promise.all([
    User.countDocuments({ isAdmin: { $ne: true } }),
    Order.find({
      createdAt: { $gte: startDate, $lte: endDate }
    })
      .select('items')  // ✅ Only select items field, not entire document
      .lean(),
    Order.countDocuments({
      status: 'new',
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    Order.countDocuments({
      status: 'received',
      createdAt: { $gte: startDate, $lte: endDate }
    })
  ]);
  console.timeEnd('[Admin Stats] Database queries');

  // Build product stats
  const productStatsMap: { [key: string]: number } = {};
  ordersInPeriod.forEach((order) => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        let productName = 'Unknown';
        
        // Try different ways to get product name based on language preference
        if (item.product) {
          // Method 1: Check for name object with ar/en
          if (item.product.name) {
            // Use language preference: if 'ar', try Arabic first; if 'en', try English first
            if (language === 'ar') {
              productName = item.product.name.ar || item.product.name.en || 'Unknown';
            } else {
              productName = item.product.name.en || item.product.name.ar || 'Unknown';
            }
          }
          // Method 2: Check for nameAr/nameEn directly
          else if (item.product.nameAr || item.product.nameEn) {
            if (language === 'ar') {
              productName = item.product.nameAr || item.product.nameEn;
            } else {
              productName = item.product.nameEn || item.product.nameAr;
            }
          }
          // Method 3: Use productName from item itself
        } else if (item.productName) {
          if (typeof item.productName === 'object') {
            if (language === 'ar') {
              productName = item.productName.ar || item.productName.en || item.productName || 'Unknown';
            } else {
              productName = item.productName.en || item.productName.ar || item.productName || 'Unknown';
            }
          } else {
            productName = item.productName;
          }
        }
        
        // Skip 'Unknown' entries if there's a better name available
        if (productName && productName !== 'Unknown') {
          productStatsMap[productName] = (productStatsMap[productName] || 0) + (item.quantity || 0);
        }
      });
    }
  });

  const productStats = Object.entries(productStatsMap)
    .map(([product, quantity]) => ({ product, quantity }))
    .sort((a, b) => b.quantity - a.quantity);

  // Get order status distribution for the period
  const statusCounts = {
    new: newOrders,
    received: receivedOrders
  };

  return {
    todayOrders: ordersInPeriod.length,
    newOrders,
    receivedOrders,
    totalCustomers,
    productStats,
    statusCounts
  };
}

/**
 * Get customers with order statistics from MongoDB
 */
export async function getCustomersWithStats(page: number = 1, search: string = '', status: string = 'all') {
  await dbConnect();

  const limit = 20;
  const skip = (page - 1) * limit;

  // Build query
  const query: any = { isAdmin: { $ne: true } };

  // Apply search filter
  if (search) {
    query.$or = [
      { phone: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  // Apply status filter
  if (status === 'active') {
    query.isActive = true;
  } else if (status === 'inactive') {
    query.isActive = false;
  }

  // Get customers
  console.time('[Admin Customers] Get customers');
  const customers = await User.find(query)
    .select('phone name companyName email address isActive createdAt lastLogin')  // ✅ Select only needed fields
    .skip(skip)
    .limit(limit)
    .lean();

  const totalCustomers = await User.countDocuments(query);
  const totalPages = Math.ceil(totalCustomers / limit);
  console.timeEnd('[Admin Customers] Get customers');

  // ✅ Get all orders for these customers in ONE query (not N+1)
  console.time('[Admin Customers] Get orders');
  const customerIds = customers.map(c => c._id);
  const allOrders = await Order.find({ customer: { $in: customerIds } })
    .select('customer createdAt')  // ✅ Only need customer and date
    .lean();
  console.timeEnd('[Admin Customers] Get orders');

  // Build a map of customer orders
  const customerOrdersMap: { [key: string]: any[] } = {};
  allOrders.forEach(order => {
    const customerId = order.customer.toString();
    if (!customerOrdersMap[customerId]) {
      customerOrdersMap[customerId] = [];
    }
    customerOrdersMap[customerId].push(order);
  });

  // Get order statistics for each customer
  const customersWithStats = customers.map((customer) => {
    const customerOrders = customerOrdersMap[customer._id.toString()] || [];
    const lastOrder = customerOrders.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    return {
      _id: customer._id,
      phone: customer.phone,
      companyName: customer.companyName,
      name: customer.name,
      email: customer.email,
      address: customer.address,
      isActive: customer.isActive,
      createdAt: customer.createdAt || new Date(),
      lastLogin: customer.lastLogin,
      orderCount: customerOrders.length,
      lastOrderDate: lastOrder?.createdAt,
    };
  });

  // Sort by order count (most active first)
  customersWithStats.sort((a, b) => b.orderCount - a.orderCount);

  return {
    customers: customersWithStats,
    totalPages,
    currentPage: page,
    totalCustomers,
  };
}

/**
 * Create a new customer in MongoDB
 */
export async function createCustomerInMongoDB(customerData: {
  phone: string;
  companyName?: string;
  name?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}) {
  await dbConnect();

  // Check if user already exists
  const existingUser = await User.findOne({ phone: customerData.phone });
  if (existingUser) {
    throw new Error('User with this phone number already exists');
  }

  // Create new user
  const newUser = new User({
    phone: customerData.phone,
    companyName: customerData.companyName || '',
    name: customerData.name || '',
    email: customerData.email || '',
    address: customerData.address || '',
    isActive: customerData.isActive !== undefined ? customerData.isActive : true,
    isAdmin: false,
  });

  await newUser.save();
  return newUser;
}

/**
 * Update customer in MongoDB
 */
export async function updateCustomerInMongoDB(customerId: string, updates: any) {
  await dbConnect();

  const customer = await User.findById(customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }

  if (customer.isAdmin) {
    throw new Error('Cannot modify admin users');
  }

  const updatedCustomer = await User.findByIdAndUpdate(
    customerId,
    updates,
    { new: true }
  );

  return updatedCustomer;
}

/**
 * Delete customer from MongoDB
 */
export async function deleteCustomerFromMongoDB(customerId: string) {
  await dbConnect();

  const customer = await User.findById(customerId);
  if (!customer) {
    throw new Error('Customer not found');
  }

  if (customer.isAdmin) {
    throw new Error('Cannot delete admin users');
  }

  await User.findByIdAndDelete(customerId);
  return true;
}

/**
 * Get all admins from MongoDB
 */
export async function getAdminsFromMongoDB() {
  await dbConnect();

  const admins = await User.find({ isAdmin: true })
    .select('phone name email isActive lastLogin')
    .lean();

  return admins.map(admin => ({
    id: admin._id.toString(),
    phone: admin.phone,
    name: admin.name,
    email: admin.email,
    isActive: admin.isActive,
    lastLogin: admin.lastLogin,
  }));
}

/**
 * Create a new admin in MongoDB
 */
export async function createAdminInMongoDB(adminData: {
  phone: string;
  name: string;
  email: string;
  isAdmin?: boolean;
  isActive?: boolean;
}) {
  await dbConnect();

  // Check if phone already exists
  const existingUserByPhone = await User.findOne({ phone: adminData.phone });
  if (existingUserByPhone) {
    throw new Error('Phone number already exists');
  }

  // Check if email already exists
  const existingUserByEmail = await User.findOne({ email: adminData.email });
  if (existingUserByEmail) {
    throw new Error('Email already exists');
  }

  const newAdmin = new User({
    phone: adminData.phone,
    name: adminData.name,
    email: adminData.email,
    address: '',
    companyName: '',
    isAdmin: adminData.isAdmin ?? true,
    isActive: adminData.isActive ?? true,
  });

  await newAdmin.save();
  return {
    id: (newAdmin._id as any).toString(),
    phone: newAdmin.phone,
    name: newAdmin.name,
    email: newAdmin.email,
    address: newAdmin.address,
    companyName: newAdmin.companyName,
    isAdmin: newAdmin.isAdmin,
    isActive: newAdmin.isActive,
  };
}

/**
 * Update admin in MongoDB
 */
export async function updateAdminInMongoDB(adminId: string, updates: any) {
  await dbConnect();

  const admin = await User.findById(adminId);
  if (!admin) {
    throw new Error('Admin not found');
  }

  const updatedAdmin = await User.findByIdAndUpdate(
    adminId,
    updates,
    { new: true }
  );

  if (!updatedAdmin) {
    throw new Error('Failed to update admin');
  }

  return {
    id: (updatedAdmin._id as any).toString(),
    phone: updatedAdmin.phone,
    name: updatedAdmin.name,
    email: updatedAdmin.email,
    isActive: updatedAdmin.isActive,
  };
}

/**
 * Delete admin from MongoDB
 */
export async function deleteAdminFromMongoDB(adminId: string) {
  await dbConnect();

  const admin = await User.findById(adminId);
  if (!admin) {
    throw new Error('Admin not found');
  }

  // Don't allow deleting the last admin
  const adminCount = await User.countDocuments({ isAdmin: true });
  if (adminCount <= 1) {
    throw new Error('Cannot delete the last admin');
  }

  await User.findByIdAndDelete(adminId);
  return true;
}

/**
 * Get report data from MongoDB
 */
export async function getReportDataFromMongoDB(startDate: Date, endDate: Date) {
  await dbConnect();

  // Adjust dates to include full days
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  // Add 1 day to end date and set to midnight (so we get all of endDate)
  const end = new Date(endDate);
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);

  console.log('[Admin Reports] Date range adjusted:', { 
    originalStart: startDate, 
    originalEnd: endDate,
    adjustedStart: start, 
    adjustedEnd: end,
    startISO: start.toISOString(),
    endISO: end.toISOString()
  });

  // Get filtered orders
  const filteredOrders = await Order.find({
    createdAt: { $gte: start, $lt: end }
  }).populate('customer', 'name phone companyName').lean();

  console.log('[Admin Reports] Filtered orders count:', filteredOrders.length);
  if (filteredOrders.length > 0) {
    console.log('[Admin Reports] First order:', {
      _id: filteredOrders[0]._id,
      createdAt: filteredOrders[0].createdAt,
      customer: (filteredOrders[0].customer as any)?.name
    });
  }

  // Daily Orders Trend
  const dailyOrdersMap: { [date: string]: { count: number; items: number } } = {};
  filteredOrders.forEach(order => {
    const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
    if (!dailyOrdersMap[dateStr]) {
      dailyOrdersMap[dateStr] = { count: 0, items: 0 };
    }
    dailyOrdersMap[dateStr].count++;
    dailyOrdersMap[dateStr].items += order.totalItems || 0;
  });

  const dailyOrders = Object.entries(dailyOrdersMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Top Products
  const productQuantities: { [productId: string]: { name: string; quantity: number; orders: number } } = {};
  filteredOrders.forEach(order => {
    order.items?.forEach(item => {
      const productId = (item.product as any).toString();
      if (!productQuantities[productId]) {
        productQuantities[productId] = {
          name: item.productName?.en || 'Unknown',
          quantity: 0,
          orders: 0,
        };
      }
      productQuantities[productId].quantity += item.quantity || 0;
      productQuantities[productId].orders++;
    });
  });

  const topProducts = Object.values(productQuantities)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  // Top Customers
  const customerStats: { [customerId: string]: { name: string; phone: string; orders: number; items: number } } = {};
  filteredOrders.forEach(order => {
    const customerId = (order.customer as any)?._id?.toString() || (order.customer as any)?.toString() || 'unknown';
    if (!customerStats[customerId]) {
      customerStats[customerId] = {
        name: (order.customer as any)?.companyName || (order.customer as any)?.name || 'Unknown',
        phone: (order.customer as any)?.phone || '',
        orders: 0,
        items: 0,
      };
    }
    customerStats[customerId].orders++;
    customerStats[customerId].items += order.totalItems || 0;
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
  const totalItems = filteredOrders.reduce((sum, order) => sum + (order.totalItems || 0), 0);
  const totalCustomers = await User.countDocuments({ isAdmin: { $ne: true } });
  
  const newCustomers = await User.countDocuments({
    isAdmin: { $ne: true },
    createdAt: { $gte: start, $lte: end }
  });

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
    const customerId = (order.customer as any)?._id?.toString() || (order.customer as any)?.toString() || 'unknown';
    const customerName = (order.customer as any)?.companyName || (order.customer as any)?.name || 'Unknown';
    
    order.items?.forEach(item => {
      const productId = (item.product as any).toString();
      const key = `${customerId}-${productId}`;
      if (!customerProductMap[key]) {
        customerProductMap[key] = {
          customerId,
          customerName,
          productId: productId,
          productNameEn: item.productName?.en || 'Unknown',
          productNameAr: item.productName?.ar || 'غير معروف',
          quantity: 0,
        };
      }
      customerProductMap[key].quantity += item.quantity || 0;
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

  return {
    dailyOrders,
    topProducts,
    topCustomers,
    statusDistribution,
    customerProductMatrix,
    statusCounts,
    summary: {
      totalOrders,
      totalItems,
      totalCustomers,
      newCustomers,
      averageOrderSize,
    },
  };
}

/**
 * Get admin orders from MongoDB with filters and pagination
 */
export async function getAdminOrders(params: AdminOrdersParams = {}): Promise<AdminOrdersResult> {
  await dbConnect();

  const {
    page = 1,
    limit = 20,
    status,
    search,
    startDate,
    endDate,
    customerId
  } = params;

  // Build filter query
  const filter: any = {};

  // Status filter
  if (status && status !== 'all') {
    filter.status = status;
  }

  // Date range filter
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  // Customer ID filter
  if (customerId) {
    filter.customer = customerId;
  }

  // Search filter (search in customer name or order ID)
  if (search) {
    // First, try to find matching customers by name or phone
    console.log('[Admin Orders] Searching for:', search);
    console.time('[Admin Orders] Customer search');
    
    const matchingCustomers = await User.find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ]
    }).select('_id').lean();

    console.timeEnd('[Admin Orders] Customer search');

    const customerIds = matchingCustomers.map(c => c._id);
    
    // Search in order ID or matching customers
    filter.$or = [
      { orderNumber: { $regex: search, $options: 'i' } },  // ✅ Search by order number instead of _id
      { customer: { $in: customerIds } }
    ];
  }

  // Calculate skip for pagination
  const skip = (page - 1) * limit;

  // Get total count for pagination
  console.time('[Admin Orders] Count documents');
  const total = await Order.countDocuments(filter);
  console.timeEnd('[Admin Orders] Count documents');
  
  const totalPages = Math.ceil(total / limit);

  // ✅ Optimized: limit the fields we fetch to improve query performance
  console.time('[Admin Orders] Get orders');
  const orders = await Order.find(filter)
    .populate('customer', 'name phone email companyName')
    .select('_id orderNumber status customer items totalItems message createdAt updatedAt purchaseOrderFile')  // ✅ Select specific fields
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  console.timeEnd('[Admin Orders] Get orders');

  // Format orders for response to match frontend expectations
  const formattedOrders = orders.map(order => {
    const formatted: any = {
      _id: order._id.toString(),
      orderNumber: order.orderNumber,
      customer: {
        _id: (order.customer as any)?._id?.toString(),
        name: (order.customer as any)?.name || 'Unknown',
        phone: (order.customer as any)?.phone || '',
        email: (order.customer as any)?.email || '',
        companyName: (order.customer as any)?.companyName || ''
      },
      status: order.status,
      totalItems: order.totalItems || 0,
      items: order.items?.map(item => ({
        product: {
          _id: (item.product as any).toString(),
          nameEn: item.productName?.en || 'Unknown Product',
          nameAr: item.productName?.ar || 'منتج غير معروف'
        },
        quantity: item.quantity
      })) || [],
      message: order.message || '',
      createdAt: order.createdAt,
      updatedAt: order.updatedAt
    };

    // إضافة حقل purchaseOrderFile إذا كان موجوداً
    if (order.purchaseOrderFile) {
      formatted.purchaseOrderFile = {
        filename: order.purchaseOrderFile.filename,
        path: order.purchaseOrderFile.path
      };
    }

    return formatted;
  });

  return {
    orders: formattedOrders,
    total,
    totalPages,
    currentPage: page
  };
}

/**
 * Find user by ID from MongoDB
 */
export async function findUserByIdFromMongoDB(userId: string) {
  await dbConnect();

  const user = await User.findById(userId).lean();
  
  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    phone: user.phone,
    name: user.name,
    email: user.email,
    address: user.address,
    companyName: user.companyName,
    isAdmin: user.isAdmin,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

/**
 * Update user in MongoDB
 */
export async function updateUserInMongoDB(userId: string, updates: {
  name?: string;
  email?: string;
  companyName?: string;
  address?: string;
}) {
  await dbConnect();

  const user = await User.findByIdAndUpdate(
    userId,
    { 
      ...updates,
      updatedAt: new Date()
    },
    { new: true }
  ).lean();

  if (!user) {
    return null;
  }

  return {
    id: user._id.toString(),
    phone: user.phone,
    name: user.name,
    email: user.email,
    address: user.address,
    companyName: user.companyName,
    isAdmin: user.isAdmin,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}