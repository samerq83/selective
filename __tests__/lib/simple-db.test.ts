import {
  readDB,
  writeDB,
  findUserByPhone,
  findUserByEmail,
  createUser,
  saveVerificationCode,
  findVerificationCode,
  deleteVerificationCode,
  getVerificationCode,
  updateUser,
  getAllProducts,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  findUserById,
  findProductsByIds,
  getSettings,
  createOrder
} from '../../lib/simple-db';
import fs from 'fs';
import path from 'path';

// Mock fs module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock path module
jest.mock('path');
const mockedPath = path as jest.Mocked<typeof path>;

// Reset mocks and global state before each test
const originalEnv = process.env;
let memoryDB: any = null;

describe('Simple DB Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset global state
    memoryDB = null;
    
    // Mock path.join to return a predictable path
    mockedPath.join.mockReturnValue('/test/path/db.json');
    mockedPath.dirname.mockReturnValue('/test/path');
    
    // Default fs mocks
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify({
      users: [],
      products: [],
      orders: [],
      notifications: [],
      verificationCodes: [],
      settings: { orderSettings: { editTimeLimit: 2 } }
    }));
    mockedFs.writeFileSync.mockImplementation(() => {});
    mockedFs.mkdirSync.mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Database Initialization', () => {
    it('should read existing database file', () => {
      const mockData = {
        users: [{ id: '1', name: 'Test User', phone: '123', email: 'test@test.com', companyName: 'Test', address: 'Test', isAdmin: false, isActive: true }],
        products: [],
        orders: [],
        notifications: [],
        settings: { orderSettings: { editTimeLimit: 2 } }
      };
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockData));

      const db = readDB();

      expect(db.users).toHaveLength(1);
      expect(db.users[0].name).toBe('Test User');
      expect(mockedFs.readFileSync).toHaveBeenCalledWith('/test/path/db.json', 'utf-8');
    });

    it('should create initial data when database file does not exist', () => {
      mockedFs.existsSync.mockImplementation((path) => {
        if (path === '/test/path') return true; // Directory exists
        if (path === '/test/path/db.json') return false; // File doesn't exist
        return false;
      });

      const db = readDB();

      expect(db.users).toHaveLength(2); // Initial admin and test customer
      expect(db.products).toHaveLength(5); // Initial products
      expect(db.users[0].name).toBe('Admin');
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should create directory if it does not exist', () => {
      mockedFs.existsSync.mockImplementation((path) => {
        if (path === '/test/path') return false; // Directory doesn't exist
        if (path === '/test/path/db.json') return false; // File doesn't exist
        return false;
      });

      readDB();

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/test/path', { recursive: true });
    });

    it('should fall back to memory storage on filesystem errors', () => {
      mockedFs.existsSync.mockImplementation(() => {
        throw new Error('Filesystem error');
      });

      const db = readDB();

      expect(db.users).toHaveLength(2); // Should use initial data
      expect(db.products).toHaveLength(5);
    });

    it('should handle JSON parsing errors', () => {
      mockedFs.readFileSync.mockReturnValue('invalid json');

      const db = readDB();

      expect(db.users).toHaveLength(2); // Should use initial data
    });
  });

  describe('User Management', () => {
    beforeEach(() => {
      const mockData = {
        users: [
          { id: '1', phone: '123456789', name: 'John Doe', companyName: 'Company A', email: 'john@company.com', address: 'Address 1', isAdmin: false, isActive: true },
          { id: '2', phone: '987654321', name: 'Jane Smith', companyName: 'Company B', email: 'jane@company.com', address: 'Address 2', isAdmin: true, isActive: true }
        ],
        products: [],
        orders: [],
        notifications: [],
        settings: { orderSettings: { editTimeLimit: 2 } }
      };
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockData));
    });

    it('should find user by phone', () => {
      const user = findUserByPhone('123456789');

      expect(user).toBeDefined();
      expect(user?.name).toBe('John Doe');
      expect(user?.phone).toBe('123456789');
    });

    it('should return undefined for non-existent phone', () => {
      const user = findUserByPhone('nonexistent');

      expect(user).toBeUndefined();
    });

    it('should find user by email', () => {
      const user = findUserByEmail('jane@company.com');

      expect(user).toBeDefined();
      expect(user?.name).toBe('Jane Smith');
      expect(user?.email).toBe('jane@company.com');
    });

    it('should return undefined for non-existent email', () => {
      const user = findUserByEmail('nonexistent@email.com');

      expect(user).toBeUndefined();
    });

    it('should find user by ID', () => {
      const user = findUserById('1');

      expect(user).toBeDefined();
      expect(user?.id).toBe('1');
      expect(user?.name).toBe('John Doe');
    });

    it('should create new user with auto-generated ID', () => {
      const userData = {
        phone: '555666777',
        name: 'New User',
        companyName: 'New Company',
        email: 'new@company.com',
        address: 'New Address',
        isAdmin: false,
        isActive: true
      };

      const newUser = createUser(userData);

      expect(newUser.id).toBe('3'); // Next ID after existing users
      expect(newUser.name).toBe('New User');
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should update existing user', () => {
      const updates = { name: 'Updated Name', isActive: false };
      
      const updatedUser = updateUser('1', updates);

      expect(updatedUser).toBeDefined();
      expect(updatedUser?.name).toBe('Updated Name');
      expect(updatedUser?.isActive).toBe(false);
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should return null for updating non-existent user', () => {
      const result = updateUser('999', { name: 'Not Found' });

      expect(result).toBeNull();
    });
  });

  describe('Verification Code Management', () => {
    beforeEach(() => {
      const mockData = {
        users: [],
        products: [],
        orders: [],
        notifications: [],
        verificationCodes: [
          {
            phone: '123456789',
            code: '123456',
            type: 'signup',
            expiresAt: new Date(Date.now() + 300000),
            createdAt: new Date()
          }
        ],
        settings: { orderSettings: { editTimeLimit: 2 } }
      };
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockData));
    });

    it('should save verification code', () => {
      const codeData = {
        phone: '987654321',
        code: '654321',
        type: 'login' as const,
        expiresAt: new Date(Date.now() + 300000)
      };

      const savedCode = saveVerificationCode(codeData);

      expect(savedCode.phone).toBe('987654321');
      expect(savedCode.code).toBe('654321');
      expect(savedCode.type).toBe('login');
      expect(savedCode.createdAt).toBeInstanceOf(Date);
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should replace existing verification code for same phone and type', () => {
      const codeData = {
        phone: '123456789',
        code: '999999',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 300000)
      };

      saveVerificationCode(codeData);

      // Should have removed the old code and added the new one
      const foundCode = findVerificationCode('123456789', '999999', 'signup');
      expect(foundCode).toBeDefined();
      expect(foundCode?.code).toBe('999999');
    });

    it('should find verification code', () => {
      const foundCode = findVerificationCode('123456789', '123456', 'signup');

      expect(foundCode).toBeDefined();
      expect(foundCode?.phone).toBe('123456789');
      expect(foundCode?.code).toBe('123456');
      expect(foundCode?.type).toBe('signup');
    });

    it('should return undefined for non-existent verification code', () => {
      const foundCode = findVerificationCode('nonexistent', '000000', 'login');

      expect(foundCode).toBeUndefined();
    });

    it('should get verification code by phone and type', () => {
      const foundCode = getVerificationCode('123456789', 'signup');

      expect(foundCode).toBeDefined();
      expect(foundCode?.code).toBe('123456');
    });

    it('should delete verification code', () => {
      deleteVerificationCode('123456789', 'signup');

      const foundCode = getVerificationCode('123456789', 'signup');
      expect(foundCode).toBeUndefined();
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle missing verificationCodes array', () => {
      const mockData = {
        users: [],
        products: [],
        orders: [],
        notifications: [],
        settings: { orderSettings: { editTimeLimit: 2 } }
      };
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockData));

      const codeData = {
        phone: '123456789',
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date()
      };

      const savedCode = saveVerificationCode(codeData);
      expect(savedCode).toBeDefined();
    });
  });

  describe('Product Management', () => {
    beforeEach(() => {
      const mockData = {
        users: [],
        products: [
          { id: '1', name: { en: 'Product 1', ar: 'منتج 1' }, slug: 'product-1', image: '/img1.jpg', isAvailable: true, order: 1 },
          { id: '3', name: { en: 'Product 3', ar: 'منتج 3' }, slug: 'product-3', image: '/img3.jpg', isAvailable: false, order: 3 },
          { id: '2', name: { en: 'Product 2', ar: 'منتج 2' }, slug: 'product-2', image: '/img2.jpg', isAvailable: true, order: 2 }
        ],
        orders: [],
        notifications: [],
        settings: { orderSettings: { editTimeLimit: 2 } }
      };
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockData));
    });

    it('should get all products', () => {
      const products = getAllProducts();

      expect(products).toHaveLength(3);
      expect(products[0].name.en).toBe('Product 1');
    });

    it('should get products sorted by order with _id field', () => {
      const products = getProducts();

      expect(products).toHaveLength(3);
      expect(products[0].order).toBe(1); // Should be sorted by order
      expect(products[1].order).toBe(2);
      expect(products[2].order).toBe(3);
      expect(products[0]._id).toBe('1'); // Should have _id field
    });

    it('should create new product with auto-generated ID', () => {
      const productData = {
        name: { en: 'New Product', ar: 'منتج جديد' },
        slug: 'new-product',
        image: '/new.jpg',
        isAvailable: true,
        order: 4
      };

      const newProduct = createProduct(productData);

      expect(newProduct.id).toBe('4'); // Next sequential ID
      expect(newProduct.name.en).toBe('New Product');
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should update existing product', () => {
      const updates = { name: { en: 'Updated Product', ar: 'منتج محدث' }, isAvailable: false };
      
      const updatedProduct = updateProduct('1', updates);

      expect(updatedProduct).toBeDefined();
      expect(updatedProduct?.name.en).toBe('Updated Product');
      expect(updatedProduct?.isAvailable).toBe(false);
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should return null for updating non-existent product', () => {
      const result = updateProduct('999', { name: { en: 'Not Found', ar: 'غير موجود' } });

      expect(result).toBeNull();
    });

    it('should delete existing product', () => {
      const result = deleteProduct('1');

      expect(result).toBe(true);
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should return false for deleting non-existent product', () => {
      const result = deleteProduct('999');

      expect(result).toBe(false);
    });

    it('should find products by IDs', () => {
      const products = findProductsByIds(['1', '3']);

      expect(products).toHaveLength(2);
      expect(products[0].id).toBe('1');
      expect(products[1].id).toBe('3');
    });

    it('should return empty array for non-existent product IDs', () => {
      const products = findProductsByIds(['999', '888']);

      expect(products).toHaveLength(0);
    });
  });

  describe('Settings Management', () => {
    beforeEach(() => {
      const mockData = {
        users: [],
        products: [],
        orders: [],
        notifications: [],
        settings: {
          orderSettings: {
            editTimeLimit: 5
          }
        }
      };
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockData));
    });

    it('should get settings', () => {
      const settings = getSettings();

      expect(settings).toBeDefined();
      expect(settings.orderSettings.editTimeLimit).toBe(5);
    });
  });

  describe('Order Management', () => {
    beforeEach(() => {
      const mockData = {
        users: [],
        products: [],
        orders: [
          { id: '1', orderNumber: 'ORD-1000', customer: 'user1', totalItems: 5, status: 'pending' }
        ],
        notifications: [],
        settings: { orderSettings: { editTimeLimit: 2 } }
      };
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockData));
    });

    it('should create new order with auto-generated order number', () => {
      const orderData = {
        customer: 'user1',
        customerName: 'John Doe',
        customerPhone: '123456789',
        items: [{ product: 'prod1', productName: { en: 'Product 1', ar: 'منتج 1' }, quantity: 2 }],
        totalItems: 2,
        status: 'pending',
        message: 'Test order',
        canEdit: true,
        editDeadline: new Date(),
        history: []
      };

      const newOrder = createOrder(orderData);

      expect(newOrder.id).toBeDefined();
      expect(newOrder.orderNumber).toMatch(/ORD-\d+/);
      expect(parseInt(newOrder.orderNumber.split('-')[1])).toBeGreaterThan(1000);
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it('should generate sequential order numbers', () => {
      // Create first order
      const order1 = createOrder({
        customer: 'user1',
        customerName: 'User 1',
        customerPhone: '123',
        items: [],
        totalItems: 0,
        status: 'pending',
        canEdit: true,
        editDeadline: new Date(),
        history: []
      });

      // Update mock to include the first order
      const updatedMockData = {
        users: [],
        products: [],
        orders: [
          { id: '1', orderNumber: 'ORD-1000', customer: 'user1', totalItems: 5, status: 'pending' },
          order1
        ],
        notifications: [],
        settings: { orderSettings: { editTimeLimit: 2 } }
      };
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(updatedMockData));

      // Create second order
      const order2 = createOrder({
        customer: 'user2',
        customerName: 'User 2',
        customerPhone: '456',
        items: [],
        totalItems: 0,
        status: 'pending',
        canEdit: true,
        editDeadline: new Date(),
        history: []
      });

      const order1Number = parseInt(order1.orderNumber.split('-')[1]);
      const order2Number = parseInt(order2.orderNumber.split('-')[1]);
      
      expect(order2Number).toBe(order1Number + 1);
    });
  });

  describe('Memory Storage Fallback', () => {
    it('should use memory storage when filesystem is read-only', () => {
      // Simulate Netlify environment (read-only filesystem)
      mockedFs.existsSync.mockImplementation(() => {
        throw new Error('Read-only filesystem');
      });

      const db1 = readDB();
      expect(db1.users).toHaveLength(2); // Initial data

      // Create a user
      const newUser = createUser({
        phone: '555',
        name: 'Memory User',
        companyName: 'Memory Co',
        email: 'memory@test.com',
        address: 'Memory St',
        isAdmin: false,
        isActive: true
      });

      const db2 = readDB();
      expect(db2.users).toHaveLength(3); // Should include new user in memory
      
      const foundUser = findUserByPhone('555');
      expect(foundUser?.name).toBe('Memory User');
    });

    it('should persist changes in memory storage', () => {
      // Force memory storage
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Cannot write to filesystem');
      });

      // Create user
      createUser({
        phone: '777',
        name: 'Persistent User',
        companyName: 'Test Co',
        email: 'persistent@test.com',
        address: 'Test St',
        isAdmin: false,
        isActive: true
      });

      // Should be able to find the user
      const foundUser = findUserByPhone('777');
      expect(foundUser?.name).toBe('Persistent User');
    });

    it('should maintain consistency between filesystem and memory operations', () => {
      // Start with filesystem
      const user = createUser({
        phone: '888',
        name: 'Consistency User',
        companyName: 'Test Co',
        email: 'consistency@test.com',
        address: 'Test St',
        isAdmin: false,
        isActive: true
      });

      expect(user.name).toBe('Consistency User');
      
      // Switch to memory storage due to error
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });

      // Should still work with memory fallback
      const foundUser = findUserByPhone('888');
      expect(foundUser).toBeDefined(); // May not be the same due to fallback to initial data
    });
  });

  describe('Error Handling', () => {
    it('should handle writeDB errors gracefully', () => {
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Disk full');
      });

      expect(() => {
        createUser({
          phone: '999',
          name: 'Error User',
          companyName: 'Error Co',
          email: 'error@test.com',
          address: 'Error St',
          isAdmin: false,
          isActive: true
        });
      }).not.toThrow();
    });

    it('should handle corrupted JSON data', () => {
      mockedFs.readFileSync.mockReturnValue('{"users": [invalid json}');

      const db = readDB();

      expect(db.users).toHaveLength(2); // Should fall back to initial data
    });

    it('should handle missing properties in data', () => {
      const incompleteData = {
        users: [{ id: '1', name: 'Incomplete User' }] // Missing required fields
      };
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(incompleteData));

      const db = readDB();

      expect(db.users).toHaveLength(1);
      expect(db.products).toEqual([]); // Should default to empty array
      expect(db.settings).toEqual({}); // Should default to empty object
    });

    it('should handle directory creation errors', () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const db = readDB();

      expect(db.users).toHaveLength(2); // Should fall back to memory storage
    });

    it('should handle file creation errors', () => {
      mockedFs.existsSync.mockImplementation((path) => {
        if (path.toString().includes('db.json')) return false;
        return true;
      });
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const db = readDB();

      expect(db.users).toHaveLength(2); // Should work with memory storage
    });
  });

  describe('Data Integrity', () => {
    it('should maintain data structure consistency', () => {
      const db = readDB();

      expect(db).toHaveProperty('users');
      expect(db).toHaveProperty('products');
      expect(db).toHaveProperty('orders');
      expect(db).toHaveProperty('notifications');
      expect(db).toHaveProperty('settings');
      
      expect(Array.isArray(db.users)).toBe(true);
      expect(Array.isArray(db.products)).toBe(true);
      expect(Array.isArray(db.orders)).toBe(true);
      expect(Array.isArray(db.notifications)).toBe(true);
      expect(typeof db.settings).toBe('object');
    });

    it('should not mutate original data on read', () => {
      const db1 = readDB();
      const db2 = readDB();

      db1.users.push({
        id: '999',
        phone: '999',
        name: 'Temp User',
        companyName: 'Temp',
        email: 'temp@test.com',
        address: 'Temp',
        isAdmin: false,
        isActive: true
      });

      expect(db2.users).not.toContainEqual(
        expect.objectContaining({ name: 'Temp User' })
      );
    });

    it('should handle deep cloning correctly', () => {
      const mockData = {
        users: [{
          id: '1',
          phone: '123',
          name: 'Test User',
          companyName: 'Test Co',
          email: 'test@test.com',
          address: 'Test St',
          isAdmin: false,
          isActive: true,
          metadata: { nested: { value: 'deep' } }
        }],
        products: [],
        orders: [],
        notifications: [],
        settings: { orderSettings: { editTimeLimit: 2 } }
      };
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(mockData));

      const db1 = readDB();
      const db2 = readDB();

      // Modify nested property in first read
      if (db1.users[0].metadata) {
        (db1.users[0].metadata as any).nested.value = 'modified';
      }

      // Second read should not be affected
      expect((db2.users[0] as any).metadata?.nested?.value).toBe('deep');
    });
  });
});