import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

interface User {
  id: string;
  phone: string;
  name: string;
  companyName: string;
  email: string;
  address: string;
  isAdmin: boolean;
  isActive: boolean;
  lastLogin?: Date;
}

interface Product {
  id: string;
  name: {
    en: string;
    ar: string;
  };
  slug: string;
  image: string;
  isAvailable: boolean;
  order: number;
}

interface OrderItem {
  product: string;
  productName: {
    en: string;
    ar: string;
  };
  quantity: number;
}

interface OrderHistory {
  action: string;
  by: string;
  byName: string;
  timestamp: Date;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  totalItems: number;
  status: string;
  message?: string;
  canEdit: boolean;
  editDeadline: Date;
  history: OrderHistory[];
  createdAt: Date;
  updatedAt: Date;
}

interface Notification {
  id: string;
  user: string;
  type: string;
  title: {
    en: string;
    ar: string;
  };
  message: {
    en: string;
    ar: string;
  };
  relatedOrder?: string;
  isRead: boolean;
  createdAt: Date;
}

interface VerificationCode {
  phone: string;
  companyName?: string;
  email?: string;
  name?: string;
  address?: string;
  code: string;
  expiresAt: Date;
  type: 'signup' | 'login';
  createdAt: Date;
}

interface DB {
  users: User[];
  products: Product[];
  orders: Order[];
  notifications: Notification[];
  verificationCodes?: VerificationCode[];
  settings: {
    orderSettings: {
      editTimeLimit: number;
    };
  };
}

function getInitialData(): DB {
  return {
    users: [
      {
        id: '1',
        phone: '1234567890',
        name: 'Admin',
        companyName: 'Selective Trading',
        email: 'admin@selectivetrading.com',
        address: 'Admin Address',
        isAdmin: true,
        isActive: true,
      },
      {
        id: '2',
        phone: '9876543210',
        name: 'Test Customer',
        companyName: 'Test Company',
        email: 'customer@test.com',
        address: 'Test Address',
        isAdmin: false,
        isActive: true,
      },
    ],
    verificationCodes: [],
    products: [
      {
        id: '1',
        name: { en: 'Almond Milk', ar: 'حليب اللوز' },
        slug: 'almond',
        image: '/images/almond.png',
        isAvailable: true,
        order: 1,
      },
      {
        id: '2',
        name: { en: 'Coconut Milk', ar: 'حليب جوز الهند' },
        slug: 'coconut',
        image: '/images/coconut.png',
        isAvailable: true,
        order: 2,
      },
      {
        id: '3',
        name: { en: 'Soy Milk', ar: 'حليب الصويا' },
        slug: 'soy',
        image: '/images/soy.png',
        isAvailable: true,
        order: 3,
      },
      {
        id: '4',
        name: { en: 'Oat Milk', ar: 'حليب الشوفان' },
        slug: 'oat',
        image: '/images/oat.png',
        isAvailable: true,
        order: 4,
      },
      {
        id: '5',
        name: { en: 'Lactose Free Milk', ar: 'حليب خالي من اللاكتوز' },
        slug: 'lactose-free',
        image: '/images/lactose-free.png',
        isAvailable: true,
        order: 5,
      },
    ],
    orders: [],
    notifications: [],
    settings: {
      orderSettings: {
        editTimeLimit: 2,
      },
    },
  };
}

// In-memory database for Netlify (read-only filesystem)
let memoryDB: DB | null = null;
let isNetlifyEnvironment = false;

function ensureDBExists() {
  // Check if we're in Netlify (read-only filesystem)
  try {
    if (!isNetlifyEnvironment) {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify(getInitialData(), null, 2));
      }
    }
  } catch (error) {
    // If we can't write to filesystem, use in-memory storage
    isNetlifyEnvironment = true;
    if (!memoryDB) {
      memoryDB = getInitialData();
    }
  }
}

export function readDB(): DB {
  ensureDBExists();
  
  if (isNetlifyEnvironment || !fs.existsSync(DB_PATH)) {
    if (!memoryDB) {
      memoryDB = getInitialData();
    }
    return JSON.parse(JSON.stringify(memoryDB));
  }
  
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Fallback to in-memory
    if (!memoryDB) {
      memoryDB = getInitialData();
    }
    return JSON.parse(JSON.stringify(memoryDB));
  }
}

export function writeDB(data: DB) {
  ensureDBExists();
  
  if (isNetlifyEnvironment) {
    memoryDB = JSON.parse(JSON.stringify(data));
    return;
  }
  
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    // Fallback to in-memory
    isNetlifyEnvironment = true;
    memoryDB = JSON.parse(JSON.stringify(data));
  }
}

export function findUserByPhone(phone: string): User | undefined {
  const db = readDB();
  return db.users.find(u => u.phone === phone);
}

export function findUserByEmail(email: string): User | undefined {
  const db = readDB();
  return db.users.find(u => u.email === email);
}

export function createUser(user: Omit<User, 'id'>): User {
  const db = readDB();
  const newUser: User = {
    ...user,
    id: (db.users.length + 1).toString(),
  };
  db.users.push(newUser);
  writeDB(db);
  return newUser;
}

// Verification Code Functions
export function saveVerificationCode(data: Omit<VerificationCode, 'createdAt'>): VerificationCode {
  const db = readDB();
  
  // Initialize verificationCodes array if it doesn't exist
  if (!db.verificationCodes) {
    db.verificationCodes = [];
  }
  
  // Remove any existing verification code for this phone and type
  db.verificationCodes = db.verificationCodes.filter(
    vc => !(vc.phone === data.phone && vc.type === data.type)
  );
  
  const newCode: VerificationCode = {
    ...data,
    createdAt: new Date(),
  };
  
  db.verificationCodes.push(newCode);
  writeDB(db);
  return newCode;
}

export function findVerificationCode(phone: string, code: string, type: 'signup' | 'login'): VerificationCode | undefined {
  const db = readDB();
  if (!db.verificationCodes) return undefined;
  
  return db.verificationCodes.find(
    vc => vc.phone === phone && vc.code === code && vc.type === type
  );
}

export function deleteVerificationCode(phone: string, type: 'signup' | 'login'): void {
  const db = readDB();
  if (!db.verificationCodes) return;
  
  db.verificationCodes = db.verificationCodes.filter(
    vc => !(vc.phone === phone && vc.type === type)
  );
  writeDB(db);
}

export function getVerificationCode(phone: string, type: 'signup' | 'login'): VerificationCode | undefined {
  const db = readDB();
  if (!db.verificationCodes) return undefined;
  
  return db.verificationCodes.find(
    vc => vc.phone === phone && vc.type === type
  );
}

export function updateUser(id: string, updates: Partial<User>): User | null {
  const db = readDB();
  const index = db.users.findIndex(u => u.id === id);
  if (index === -1) return null;
  
  db.users[index] = { ...db.users[index], ...updates };
  writeDB(db);
  return db.users[index];
}

export function getAllProducts(): Product[] {
  const db = readDB();
  return db.products;
}

export function getProducts(): any[] {
  const db = readDB();
  return db.products
    .sort((a, b) => a.order - b.order)
    .map(p => ({ ...p, _id: p.id }));
}

export function createProduct(product: Omit<Product, 'id'>): Product {
  const db = readDB();
  const existingIds = db.products
    .map(p => parseInt(p.id, 10))
    .filter(id => !isNaN(id));
  const nextIdNumber = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

  const newProduct: Product = {
    ...product,
    id: nextIdNumber.toString(),
  };
  db.products.push(newProduct);
  writeDB(db);
  return newProduct;
}

export function updateProduct(id: string, updates: Partial<Product>): Product | null {
  const db = readDB();
  const index = db.products.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  db.products[index] = { ...db.products[index], ...updates };
  writeDB(db);
  return db.products[index];
}

export function deleteProduct(id: string): boolean {
  const db = readDB();
  const index = db.products.findIndex(p => p.id === id);
  if (index === -1) return false;
  
  db.products.splice(index, 1);
  writeDB(db);
  return true;
}

export function findUserById(id: string): User | undefined {
  const db = readDB();
  return db.users.find(u => u.id === id);
}

export function findProductsByIds(ids: string[]): Product[] {
  const db = readDB();
  return db.products.filter(p => ids.includes(p.id));
}

export function getSettings() {
  const db = readDB();
  return db.settings;
}

export function createOrder(orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): any {
  const db = readDB();
  const now = new Date();
  
  // Generate sequential order number starting from 1000
  // Find the highest order number and increment
  let maxOrderNumber = 999; // Start from 999 so first order will be 1000
  
  if (db.orders.length > 0) {
    // Get all numeric order numbers and find the maximum
    const orderNumbers = db.orders
      .map(o => parseInt(o.orderNumber))
      .filter(n => !isNaN(n));
    
    if (orderNumbers.length > 0) {
      maxOrderNumber = Math.max(...orderNumbers);
    }
  }
  
  const orderNumber = (maxOrderNumber + 1).toString();
  
  const newOrder: Order = {
    ...orderData,
    id: (db.orders.length + 1).toString(),
    orderNumber,
    createdAt: now,
    updatedAt: now,
  };
  
  db.orders.push(newOrder);
  writeDB(db);
  
  return { ...newOrder, _id: newOrder.id };
}

export function createNotification(notificationData: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Notification {
  const db = readDB();
  
  const newNotification: Notification = {
    ...notificationData,
    id: (db.notifications.length + 1).toString(),
    isRead: false,
    createdAt: new Date(),
  };
  
  db.notifications.push(newNotification);
  writeDB(db);
  
  return newNotification;
}

export function getOrders(filter?: any): any[] {
  const db = readDB();
  let orders = db.orders;
  
  if (filter?.customer) {
    orders = orders.filter(o => o.customer === filter.customer);
  }
  
  if (filter?.status) {
    orders = orders.filter(o => o.status === filter.status);
  }
  
  if (filter?.createdAt) {
    orders = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= filter.createdAt.$gte && orderDate <= filter.createdAt.$lte;
    });
  }
  
  // Sort by createdAt descending
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Add _id and populate customer and product info
  return orders.map(order => {
    const customer = db.users.find(u => u.id === order.customer);
    const items = order.items.map(item => ({
      ...item,
      product: {
        _id: item.product,
        name: item.productName,
        image: db.products.find(p => p.id === item.product)?.image || '',
      },
    }));
    
    return {
      ...order,
      _id: order.id,
      customer: {
        _id: customer?.id,
        name: customer?.name,
        phone: customer?.phone,
      },
      items,
    };
  });
}

export function getAdminStats(filter?: string, customDate?: string) {
  const db = readDB();
  
  let filteredOrders = db.orders;
  
  // Apply date filtering
  if (filter === 'today') {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    filteredOrders = db.orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= today && orderDate < tomorrow;
    });
  } else if (filter === 'custom' && customDate) {
    // Get custom date range
    const selectedDate = new Date(customDate);
    selectedDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    filteredOrders = db.orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= selectedDate && orderDate < nextDay;
    });
  }
  // If filter === 'all' or no filter, use all orders (no filtering needed)
  
  // Count by status
  const newOrders = filteredOrders.filter(o => o.status === 'new').length;
  const receivedOrders = filteredOrders.filter(o => o.status === 'received').length;
  
  // Count customers (non-admin users)
  const totalCustomers = db.users.filter(u => !u.isAdmin).length;
  
  // Calculate product statistics
  const productQuantities: { [key: string]: number } = {};
  filteredOrders.forEach(order => {
    order.items.forEach(item => {
      const productName = item.productName.en;
      productQuantities[productName] = (productQuantities[productName] || 0) + item.quantity;
    });
  });
  
  const productStats = Object.entries(productQuantities)
    .map(([product, quantity]) => ({ product, quantity }))
    .sort((a, b) => b.quantity - a.quantity);
  
  return {
    todayOrders: filteredOrders.length,
    newOrders,
    receivedOrders,
    totalCustomers,
    productStats,
  };
}

export function getAdminOrders(options: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  customerId?: string;
}) {
  const db = readDB();
  let orders = db.orders;
  
  // Filter by customer ID
  if (options.customerId) {
    orders = orders.filter(o => o.customer === options.customerId);
  }
  
  // Filter by status
  if (options.status && options.status !== 'all') {
    orders = orders.filter(o => o.status === options.status);
  }
  
  // Filter by search (order number)
  if (options.search) {
    const searchLower = options.search.toLowerCase();
    orders = orders.filter(o => o.orderNumber.toLowerCase().includes(searchLower));
  }
  
  // Filter by date range
  if (options.startDate || options.endDate) {
    orders = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      if (options.startDate) {
        const start = new Date(options.startDate);
        if (orderDate < start) return false;
      }
      if (options.endDate) {
        const end = new Date(options.endDate);
        end.setHours(23, 59, 59, 999);
        if (orderDate > end) return false;
      }
      return true;
    });
  }
  
  // Sort by createdAt descending
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  // Pagination
  const page = options.page || 1;
  const limit = options.limit || 20;
  const total = orders.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedOrders = orders.slice(startIndex, endIndex);
  
  // Add _id and populate customer and product info
  const populatedOrders = paginatedOrders.map(order => {
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
    
    return {
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
  });
  
  return {
    orders: populatedOrders,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}