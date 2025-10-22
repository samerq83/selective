import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/favorites/route';

// Mock modules
jest.mock('@/lib/mongodb', () => jest.fn());
jest.mock('@/lib/auth', () => ({
  requireAuth: jest.fn(),
}));
jest.mock('@/models/FavoriteOrder', () => ({
  find: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
}));
jest.mock('@/models/Product', () => ({
  find: jest.fn(),
}));

// Mock imports
const mockRequireAuth = jest.mocked(require('@/lib/auth').requireAuth);
const mockFavoriteOrder = jest.mocked(require('@/models/FavoriteOrder'));
const mockProduct = jest.mocked(require('@/models/Product'));

// Mock data
const mockCustomerAuth = {
  userId: 'customer1',
  isAdmin: false,
};

const mockAdminAuth = {
  userId: 'admin1',
  isAdmin: true,
};

const mockProduct1 = {
  _id: 'product1',
  name: { en: 'Almond Milk', ar: 'حليب اللوز' },
  image: 'almond.jpg',
  isAvailable: true,
  toString: () => 'product1',
};

const mockProduct2 = {
  _id: 'product2',
  name: { en: 'Oat Milk', ar: 'حليب الشوفان' },
  image: 'oat.jpg',
  isAvailable: true,
  toString: () => 'product2',
};

const mockFavorite = {
  _id: 'favorite1',
  customer: 'customer1',
  name: 'My Favorite Order',
  items: [
    { product: 'product1', productName: 'Almond Milk', quantity: 2 },
    { product: 'product2', productName: 'Oat Milk', quantity: 1 },
  ],
  totalItems: 3,
  createdAt: new Date().toISOString(),
};

const mockFavoriteQuery = {
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockResolvedValue([mockFavorite]),
};

describe('/api/favorites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.error = jest.fn();
  });

  describe('GET /api/favorites', () => {
    describe('Happy Path', () => {
      it('should return user favorites successfully', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);
        mockFavoriteOrder.find.mockReturnValue(mockFavoriteQuery);

        const request = new NextRequest('http://localhost:3000/api/favorites');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({ favorites: [mockFavorite] });
        expect(mockFavoriteOrder.find).toHaveBeenCalledWith({ customer: 'customer1' });
        expect(mockFavoriteQuery.populate).toHaveBeenCalledWith('items.product', 'name image isAvailable');
        expect(mockFavoriteQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      });

      it('should return empty array for user with no favorites', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);
        const emptyFavoritesQuery = {
          populate: jest.fn().mockReturnThis(),
          sort: jest.fn().mockResolvedValue([]),
        };
        mockFavoriteOrder.find.mockReturnValue(emptyFavoritesQuery);

        const request = new NextRequest('http://localhost:3000/api/favorites');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({ favorites: [] });
      });
    });

    describe('Input Verification', () => {
      it('should reject admin users', async () => {
        mockRequireAuth.mockResolvedValue(mockAdminAuth);

        const request = new NextRequest('http://localhost:3000/api/favorites');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(403);
        expect(result).toEqual({ error: 'Admins cannot have favorite orders' });
        expect(mockFavoriteOrder.find).not.toHaveBeenCalled();
      });
    });

    describe('Exception Handling', () => {
      it('should handle unauthorized access', async () => {
        mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));

        const request = new NextRequest('http://localhost:3000/api/favorites');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result).toEqual({ error: 'Unauthorized' });
      });

      it('should handle database errors', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);
        mockFavoriteOrder.find.mockImplementation(() => {
          throw new Error('Database error');
        });

        const request = new NextRequest('http://localhost:3000/api/favorites');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Internal server error' });
        expect(console.error).toHaveBeenCalledWith('Get favorites error:', expect.any(Error));
      });
    });
  });

  describe('POST /api/favorites', () => {
    const validRequestBody = {
      name: 'My Favorite Order',
      items: [
        { product: 'product1', quantity: 2 },
        { product: 'product2', quantity: 1 },
      ],
    };

    describe('Happy Path', () => {
      it('should create favorite order successfully', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);
        mockProduct.find.mockResolvedValue([mockProduct1, mockProduct2]);
        mockFavoriteOrder.countDocuments.mockResolvedValue(5);
        mockFavoriteOrder.create.mockResolvedValue(mockFavorite);

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(201);
        expect(result).toEqual({ favorite: mockFavorite });
        expect(mockProduct.find).toHaveBeenCalledWith({
          _id: { $in: ['product1', 'product2'] }
        });
        expect(mockFavoriteOrder.countDocuments).toHaveBeenCalledWith({ customer: 'customer1' });
        expect(mockFavoriteOrder.create).toHaveBeenCalledWith({
          customer: 'customer1',
          name: 'My Favorite Order',
          items: [
            { product: 'product1', productName: 'Almond Milk', quantity: 2 },
            { product: 'product2', productName: 'Oat Milk', quantity: 1 },
          ],
          totalItems: 3,
        });
      });

      it('should handle bilingual product names correctly', async () => {
        const productWithStringName = {
          _id: 'product3',
          name: 'Simple Milk',
          toString: () => 'product3',
        };

        mockRequireAuth.mockResolvedValue(mockCustomerAuth);
        mockProduct.find.mockResolvedValue([productWithStringName]);
        mockFavoriteOrder.countDocuments.mockResolvedValue(0);
        mockFavoriteOrder.create.mockResolvedValue({
          ...mockFavorite,
          items: [{ product: 'product3', productName: 'Simple Milk', quantity: 1 }]
        });

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Simple Order',
            items: [{ product: 'product3', quantity: 1 }],
          }),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(201);
        expect(mockFavoriteOrder.create).toHaveBeenCalledWith(
          expect.objectContaining({
            items: [
              { product: 'product3', productName: 'Simple Milk', quantity: 1 }
            ]
          })
        );
      });
    });

    describe('Input Verification', () => {
      it('should reject admin users', async () => {
        mockRequireAuth.mockResolvedValue(mockAdminAuth);

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(403);
        expect(result).toEqual({ error: 'Admins cannot create favorite orders' });
        expect(mockFavoriteOrder.create).not.toHaveBeenCalled();
      });

      it('should reject request without name', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify({ items: validRequestBody.items }),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result).toEqual({ error: 'Name and items are required' });
      });

      it('should reject request without items', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test Order' }),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result).toEqual({ error: 'Name and items are required' });
      });

      it('should reject request with empty items array', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test Order', items: [] }),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result).toEqual({ error: 'Name and items are required' });
      });

      it('should reject name longer than 50 characters', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);

        const longName = 'A'.repeat(51);
        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify({
            name: longName,
            items: validRequestBody.items,
          }),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result).toEqual({ error: 'Name must be 50 characters or less' });
      });

      it('should reject if products not found', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);
        mockProduct.find.mockResolvedValue([mockProduct1]); // Only one product found

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result).toEqual({ error: 'Some products not found' });
      });

      it('should reject if user has reached maximum favorites limit', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);
        mockProduct.find.mockResolvedValue([mockProduct1, mockProduct2]);
        mockFavoriteOrder.countDocuments.mockResolvedValue(10);

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(400);
        expect(result).toEqual({ error: 'Maximum 10 favorite orders allowed' });
        expect(mockFavoriteOrder.create).not.toHaveBeenCalled();
      });
    });

    describe('Branching', () => {
      it('should handle name exactly at 50 characters', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);
        mockProduct.find.mockResolvedValue([mockProduct1, mockProduct2]);
        mockFavoriteOrder.countDocuments.mockResolvedValue(5);
        mockFavoriteOrder.create.mockResolvedValue(mockFavorite);

        const exactLengthName = 'A'.repeat(50);
        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify({
            name: exactLengthName,
            items: validRequestBody.items,
          }),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(201);
        expect(mockFavoriteOrder.create).toHaveBeenCalledWith(
          expect.objectContaining({ name: exactLengthName })
        );
      });

      it('should handle user with exactly 9 existing favorites', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);
        mockProduct.find.mockResolvedValue([mockProduct1, mockProduct2]);
        mockFavoriteOrder.countDocuments.mockResolvedValue(9);
        mockFavoriteOrder.create.mockResolvedValue(mockFavorite);

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(201);
        expect(result).toEqual({ favorite: mockFavorite });
      });

      it('should handle product names with unknown format', async () => {
        const productWithUnknownName = {
          _id: 'product4',
          name: null,
          toString: () => 'product4',
        };

        mockRequireAuth.mockResolvedValue(mockCustomerAuth);
        mockProduct.find.mockResolvedValue([productWithUnknownName]);
        mockFavoriteOrder.countDocuments.mockResolvedValue(0);
        mockFavoriteOrder.create.mockResolvedValue({
          ...mockFavorite,
          items: [{ product: 'product4', productName: 'Unknown Product', quantity: 1 }]
        });

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Unknown Product Order',
            items: [{ product: 'product4', quantity: 1 }],
          }),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(201);
        expect(mockFavoriteOrder.create).toHaveBeenCalledWith(
          expect.objectContaining({
            items: [
              { product: 'product4', productName: 'Unknown Product', quantity: 1 }
            ]
          })
        );
      });
    });

    describe('Exception Handling', () => {
      it('should handle unauthorized access', async () => {
        mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result).toEqual({ error: 'Unauthorized' });
      });

      it('should handle product lookup errors', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);
        mockProduct.find.mockRejectedValue(new Error('Database error'));

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Internal server error' });
        expect(console.error).toHaveBeenCalledWith('Create favorite error:', expect.any(Error));
      });

      it('should handle database creation errors', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);
        mockProduct.find.mockResolvedValue([mockProduct1, mockProduct2]);
        mockFavoriteOrder.countDocuments.mockResolvedValue(5);
        mockFavoriteOrder.create.mockRejectedValue(new Error('Creation failed'));

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify(validRequestBody),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Internal server error' });
      });

      it('should handle invalid JSON in request body', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: 'invalid json',
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Internal server error' });
      });
    });

    describe('Product Name Normalization', () => {
      it('should handle different ID formats for product matching', async () => {
        const productWithObjectId = {
          _id: { toString: () => 'product1' },
          name: { en: 'Test Product', ar: 'منتج تجريبي' },
        };

        mockRequireAuth.mockResolvedValue(mockCustomerAuth);
        mockProduct.find.mockResolvedValue([productWithObjectId]);
        mockFavoriteOrder.countDocuments.mockResolvedValue(0);
        mockFavoriteOrder.create.mockResolvedValue(mockFavorite);

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Object ID Test',
            items: [{ product: 'product1', quantity: 1 }],
          }),
        });

        const response = await POST(request);
        const result = await response.json();

        expect(response.status).toBe(201);
        expect(mockFavoriteOrder.create).toHaveBeenCalledWith(
          expect.objectContaining({
            items: [
              { product: 'product1', productName: 'Test Product', quantity: 1 }
            ]
          })
        );
      });

      it('should calculate total items correctly', async () => {
        mockRequireAuth.mockResolvedValue(mockCustomerAuth);
        mockProduct.find.mockResolvedValue([mockProduct1, mockProduct2]);
        mockFavoriteOrder.countDocuments.mockResolvedValue(0);
        mockFavoriteOrder.create.mockResolvedValue(mockFavorite);

        const itemsWithVariousQuantities = [
          { product: 'product1', quantity: 5 },
          { product: 'product2', quantity: 3 },
        ];

        const request = new NextRequest('http://localhost:3000/api/favorites', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Total Items Test',
            items: itemsWithVariousQuantities,
          }),
        });

        const response = await POST(request);

        expect(response.status).toBe(201);
        expect(mockFavoriteOrder.create).toHaveBeenCalledWith(
          expect.objectContaining({ totalItems: 8 })
        );
      });
    });
  });
});