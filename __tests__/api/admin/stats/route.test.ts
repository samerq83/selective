import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/stats/route';

// Mock modules
jest.mock('@/lib/simple-db', () => ({
  getAdminStats: jest.fn(),
}));

jest.mock('@/lib/auth', () => ({
  requireAdmin: jest.fn(),
}));

// Mock imports
const mockGetAdminStats = jest.mocked(require('@/lib/simple-db').getAdminStats);
const mockRequireAdmin = jest.mocked(require('@/lib/auth').requireAdmin);

// Mock data
const mockAdminUser = {
  userId: 'admin1',
  isAdmin: true,
  email: 'admin@example.com',
};

const mockNonAdminUser = {
  userId: 'user1',
  isAdmin: false,
  email: 'user@example.com',
};

const mockTodayStats = {
  totalRevenue: 1500.00,
  totalOrders: 12,
  totalCustomers: 8,
  averageOrderValue: 125.00,
  topProducts: [
    { id: 'product1', name: 'Almond Milk', quantity: 25, revenue: 500.00 },
    { id: 'product2', name: 'Oat Milk', quantity: 18, revenue: 360.00 },
  ],
  revenueByDay: [
    { date: '2024-01-15', revenue: 1500.00, orders: 12 },
  ],
  orderStatusBreakdown: {
    pending: 3,
    processing: 2,
    shipped: 4,
    delivered: 3,
  },
  customerGrowth: {
    newCustomers: 2,
    returningCustomers: 6,
  },
};

const mockWeeklyStats = {
  ...mockTodayStats,
  totalRevenue: 8500.00,
  totalOrders: 67,
  totalCustomers: 42,
  revenueByDay: [
    { date: '2024-01-09', revenue: 1200.00, orders: 8 },
    { date: '2024-01-10', revenue: 1350.00, orders: 9 },
    { date: '2024-01-11', revenue: 1100.00, orders: 7 },
    { date: '2024-01-12', revenue: 1450.00, orders: 11 },
    { date: '2024-01-13', revenue: 1300.00, orders: 10 },
    { date: '2024-01-14', revenue: 1600.00, orders: 12 },
    { date: '2024-01-15', revenue: 1500.00, orders: 10 },
  ],
};

const mockCustomDateStats = {
  ...mockTodayStats,
  totalRevenue: 2300.00,
  totalOrders: 18,
  revenueByDay: [
    { date: '2024-01-01', revenue: 2300.00, orders: 18 },
  ],
};

describe('/api/admin/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn();
    console.error = jest.fn();
  });

  describe('GET /api/admin/stats', () => {
    describe('Happy Path', () => {
      it('should return today stats by default', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockTodayStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockTodayStats);
        expect(mockRequireAdmin).toHaveBeenCalled();
        expect(mockGetAdminStats).toHaveBeenCalledWith('today', undefined);
        expect(console.log).toHaveBeenCalledWith('[Admin Stats] Starting request...');
        expect(console.log).toHaveBeenCalledWith('[Admin Stats] User:', mockAdminUser);
        expect(console.log).toHaveBeenCalledWith('[Admin Stats] Fetching stats with filter:', 'today', 'customDate:', undefined);
      });

      it('should return weekly stats when filter is week', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockWeeklyStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats?filter=week');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockWeeklyStats);
        expect(mockGetAdminStats).toHaveBeenCalledWith('week', undefined);
        expect(console.log).toHaveBeenCalledWith('[Admin Stats] Fetching stats with filter:', 'week', 'customDate:', undefined);
      });

      it('should return monthly stats when filter is month', async () => {
        const mockMonthlyStats = { ...mockWeeklyStats, totalRevenue: 25000.00 };
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockMonthlyStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats?filter=month');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockMonthlyStats);
        expect(mockGetAdminStats).toHaveBeenCalledWith('month', undefined);
      });

      it('should return yearly stats when filter is year', async () => {
        const mockYearlyStats = { ...mockWeeklyStats, totalRevenue: 120000.00 };
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockYearlyStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats?filter=year');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockYearlyStats);
        expect(mockGetAdminStats).toHaveBeenCalledWith('year', undefined);
      });

      it('should return custom date stats when filter is custom with date', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockCustomDateStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats?filter=custom&date=2024-01-01');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockCustomDateStats);
        expect(mockGetAdminStats).toHaveBeenCalledWith('custom', '2024-01-01');
        expect(console.log).toHaveBeenCalledWith('[Admin Stats] Fetching stats with filter:', 'custom', 'customDate:', '2024-01-01');
      });

      it('should handle all time stats', async () => {
        const mockAllTimeStats = { ...mockWeeklyStats, totalRevenue: 500000.00 };
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockAllTimeStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats?filter=all');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockAllTimeStats);
        expect(mockGetAdminStats).toHaveBeenCalledWith('all', undefined);
      });
    });

    describe('Input Verification', () => {
      it('should use today as default filter when no filter provided', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockTodayStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats');
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(mockGetAdminStats).toHaveBeenCalledWith('today', undefined);
      });

      it('should handle empty filter parameter', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockTodayStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats?filter=');
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(mockGetAdminStats).toHaveBeenCalledWith('today', undefined);
      });

      it('should handle invalid filter values gracefully', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockTodayStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats?filter=invalid');
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(mockGetAdminStats).toHaveBeenCalledWith('invalid', undefined);
      });

      it('should handle custom filter without date parameter', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockTodayStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats?filter=custom');
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(mockGetAdminStats).toHaveBeenCalledWith('custom', undefined);
      });

      it('should handle empty date parameter', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockTodayStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats?filter=custom&date=');
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(mockGetAdminStats).toHaveBeenCalledWith('custom', undefined);
      });
    });

    describe('Branching', () => {
      it('should reject request when user is not admin (isAdmin false)', async () => {
        mockRequireAdmin.mockResolvedValue(mockNonAdminUser);

        const request = new NextRequest('http://localhost:3000/api/admin/stats');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result).toEqual({ error: 'Unauthorized' });
        expect(mockGetAdminStats).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('[Admin Stats] Unauthorized access attempt');
      });

      it('should reject request when user is null', async () => {
        mockRequireAdmin.mockResolvedValue(null);

        const request = new NextRequest('http://localhost:3000/api/admin/stats');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result).toEqual({ error: 'Unauthorized' });
        expect(mockGetAdminStats).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith('[Admin Stats] Unauthorized access attempt');
      });

      it('should reject request when user is undefined', async () => {
        mockRequireAdmin.mockResolvedValue(undefined);

        const request = new NextRequest('http://localhost:3000/api/admin/stats');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result).toEqual({ error: 'Unauthorized' });
        expect(mockGetAdminStats).not.toHaveBeenCalled();
      });

      it('should handle user with missing isAdmin property', async () => {
        const userWithoutIsAdmin = {
          userId: 'admin1',
          email: 'admin@example.com',
        } as any;
        mockRequireAdmin.mockResolvedValue(userWithoutIsAdmin);

        const request = new NextRequest('http://localhost:3000/api/admin/stats');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(401);
        expect(result).toEqual({ error: 'Unauthorized' });
        expect(mockGetAdminStats).not.toHaveBeenCalled();
      });
    });

    describe('Exception Handling', () => {
      it('should handle requireAdmin authentication errors', async () => {
        mockRequireAdmin.mockRejectedValue(new Error('Authentication failed'));

        const request = new NextRequest('http://localhost:3000/api/admin/stats');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Internal server error' });
        expect(console.error).toHaveBeenCalledWith('[Admin Stats] Error:', expect.any(Error));
        expect(mockGetAdminStats).not.toHaveBeenCalled();
      });

      it('should handle getAdminStats function errors', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockImplementation(() => {
          throw new Error('Stats calculation failed');
        });

        const request = new NextRequest('http://localhost:3000/api/admin/stats');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Internal server error' });
        expect(console.error).toHaveBeenCalledWith('[Admin Stats] Error:', expect.any(Error));
      });

      it('should handle URL parsing errors', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        
        // Mock URL constructor to throw error
        const originalURL = global.URL;
        global.URL = jest.fn().mockImplementation(() => {
          throw new Error('Invalid URL');
        });

        const request = new NextRequest('http://localhost:3000/api/admin/stats');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Internal server error' });

        // Restore original URL constructor
        global.URL = originalURL;
      });

      it('should handle database connection errors', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockImplementation(() => {
          throw new Error('Database connection failed');
        });

        const request = new NextRequest('http://localhost:3000/api/admin/stats');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(500);
        expect(result).toEqual({ error: 'Internal server error' });
        expect(console.error).toHaveBeenCalledWith('[Admin Stats] Error:', expect.any(Error));
      });

      it('should handle malformed request URLs', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockTodayStats);

        // Create request with malformed URL that should still work
        const request = new NextRequest('http://localhost:3000/api/admin/stats?filter=today&invalid=param&=emptykey');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockTodayStats);
        expect(mockGetAdminStats).toHaveBeenCalledWith('today', undefined);
      });
    });

    describe('Query Parameter Handling', () => {
      it('should handle multiple query parameters correctly', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockCustomDateStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats?filter=custom&date=2024-01-01&extra=ignored');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(mockCustomDateStats);
        expect(mockGetAdminStats).toHaveBeenCalledWith('custom', '2024-01-01');
      });

      it('should handle URL encoding in parameters', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockCustomDateStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats?filter=custom&date=2024%2D01%2D01');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(mockGetAdminStats).toHaveBeenCalledWith('custom', '2024-01-01');
      });

      it('should handle special characters in date parameter', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockTodayStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats?filter=custom&date=2024-01-01T00:00:00Z');
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(mockGetAdminStats).toHaveBeenCalledWith('custom', '2024-01-01T00:00:00Z');
      });

      it('should handle duplicate query parameters', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockTodayStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats?filter=today&filter=week');
        const response = await GET(request);

        expect(response.status).toBe(200);
        // Should use first occurrence of filter parameter
        expect(mockGetAdminStats).toHaveBeenCalledWith('today', undefined);
      });
    });

    describe('Logging Verification', () => {
      it('should log all expected steps for successful request', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(mockTodayStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats?filter=week&date=2024-01-01');
        await GET(request);

        expect(console.log).toHaveBeenCalledWith('[Admin Stats] Starting request...');
        expect(console.log).toHaveBeenCalledWith('[Admin Stats] User:', mockAdminUser);
        expect(console.log).toHaveBeenCalledWith('[Admin Stats] Fetching stats with filter:', 'week', 'customDate:', '2024-01-01');
        expect(console.log).toHaveBeenCalledWith('[Admin Stats] Stats:', mockTodayStats);
      });

      it('should log unauthorized access attempts', async () => {
        mockRequireAdmin.mockResolvedValue(mockNonAdminUser);

        const request = new NextRequest('http://localhost:3000/api/admin/stats');
        await GET(request);

        expect(console.log).toHaveBeenCalledWith('[Admin Stats] Starting request...');
        expect(console.log).toHaveBeenCalledWith('[Admin Stats] User:', mockNonAdminUser);
        expect(console.log).toHaveBeenCalledWith('[Admin Stats] Unauthorized access attempt');
      });

      it('should log errors properly', async () => {
        const testError = new Error('Test error');
        mockRequireAdmin.mockRejectedValue(testError);

        const request = new NextRequest('http://localhost:3000/api/admin/stats');
        await GET(request);

        expect(console.error).toHaveBeenCalledWith('[Admin Stats] Error:', testError);
      });
    });

    describe('Stats Data Validation', () => {
      it('should return stats data as provided by getAdminStats', async () => {
        const customStats = {
          totalRevenue: 999.99,
          totalOrders: 5,
          totalCustomers: 3,
          customField: 'custom value',
          nestedData: {
            subField: 'nested value',
          },
        };

        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(customStats);

        const request = new NextRequest('http://localhost:3000/api/admin/stats');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual(customStats);
        expect(result).toHaveProperty('customField', 'custom value');
        expect(result.nestedData).toHaveProperty('subField', 'nested value');
      });

      it('should handle empty stats data', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue({});

        const request = new NextRequest('http://localhost:3000/api/admin/stats');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toEqual({});
      });

      it('should handle null stats data', async () => {
        mockRequireAdmin.mockResolvedValue(mockAdminUser);
        mockGetAdminStats.mockReturnValue(null);

        const request = new NextRequest('http://localhost:3000/api/admin/stats');
        const response = await GET(request);
        const result = await response.json();

        expect(response.status).toBe(200);
        expect(result).toBe(null);
      });
    });
  });
});