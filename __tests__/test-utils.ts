import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer;

// Setup in-memory MongoDB for testing
export async function setupTestDB() {
  mongod = await MongoMemoryServer.create();
  const mongoUri = mongod.getUri();
  await mongoose.connect(mongoUri);
}

export async function teardownTestDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
  }
}

export async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
}

// Mock data generators
export const mockUser = {
  phone: '1234567890',
  name: 'Test User',
  companyName: 'Test Company',
  email: 'test@example.com',
  address: 'Test Address',
  isAdmin: false,
  isActive: true,
};

export const mockAdminUser = {
  phone: '0987654321',
  name: 'Admin User',
  companyName: 'Admin Company',
  email: 'admin@example.com',
  address: 'Admin Address',
  isAdmin: true,
  isActive: true,
};

export const mockProduct = {
  name: {
    en: 'Test Milk',
    ar: 'حليب تجريبي',
  },
  slug: 'test-milk',
  image: '/test-image.jpg',
  isAvailable: true,
  order: 1,
};

export const mockOrder = {
  items: [
    {
      product: 'test-product-id',
      quantity: 10,
      unit: 'liter',
      notes: 'Test notes',
    },
  ],
  notes: 'Test order notes',
  status: 'pending',
  customerPhone: '1234567890',
  customerName: 'Test Customer',
  totalQuantity: 10,
};

// JWT token mock
export const mockJWTToken = 'mock-jwt-token';
export const mockTokenPayload = {
  userId: 'test-user-id',
  phone: '1234567890',
  isAdmin: false,
};