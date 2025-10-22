import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// Mock Next.js router
jest.mock('next/navigation');
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Test component to access context
const TestComponent = () => {
  const { user, loading, login, logout, refreshUser } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="user">{user ? JSON.stringify(user) : 'null'}</div>
      <button data-testid="login" onClick={() => login('1234567890')}>
        Login
      </button>
      <button data-testid="logout" onClick={logout}>
        Logout
      </button>
      <button data-testid="refresh" onClick={refreshUser}>
        Refresh
      </button>
    </div>
  );
};

const TestComponentWithoutProvider = () => {
  try {
    useAuth();
    return <div>Should not render</div>;
  } catch (error) {
    return <div data-testid="error">{(error as Error).message}</div>;
  }
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter);
  });

  const mockUser = {
    id: 'user-123',
    phone: '1234567890',
    name: 'Test User',
    companyName: 'Test Company',
    email: 'test@example.com',
    address: 'Test Address',
    isAdmin: false,
  };

  const mockAdminUser = {
    id: 'admin-123',
    phone: '0987654321',
    name: 'Admin User',
    companyName: 'Admin Company',
    email: 'admin@example.com',
    address: 'Admin Address',
    isAdmin: true,
  };

  describe('AuthProvider', () => {
    it('should provide default values', () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({}),
      } as any);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('loading')).toHaveTextContent('true');
      expect(screen.getByTestId('user')).toHaveTextContent('null');
    });

    it('should fetch user on mount', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ user: mockUser }),
      } as any);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/me');
      });

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      });
    });

    it('should handle fetch user error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('user')).toHaveTextContent('null');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching user:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle failed user fetch response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({ error: 'Unauthorized' }),
      } as any);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('user')).toHaveTextContent('null');
      });
    });
  });

  describe('Login functionality', () => {
    it('should login user successfully and redirect to dashboard', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: jest.fn().mockResolvedValue({}),
        } as any) // Initial fetch user call
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ user: mockUser }),
        } as any); // Login call

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Perform login
      await act(async () => {
        screen.getByTestId('login').click();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone: '1234567890' }),
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should login admin user and redirect to admin panel', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: jest.fn().mockResolvedValue({}),
        } as any) // Initial fetch user call
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ user: mockAdminUser }),
        } as any); // Login call

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Perform login
      await act(async () => {
        screen.getByTestId('login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockAdminUser));
        expect(mockRouter.push).toHaveBeenCalledWith('/admin');
      });
    });

    it('should handle login failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: jest.fn().mockResolvedValue({}),
        } as any) // Initial fetch user call
        .mockResolvedValueOnce({
          ok: false,
          json: jest.fn().mockResolvedValue({ error: 'Login failed' }),
        } as any); // Failed login call

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Perform login - should throw error
      await act(async () => {
        try {
          await screen.getByTestId('login').click();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(consoleSpy).toHaveBeenCalledWith('Login error:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle login network error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: jest.fn().mockResolvedValue({}),
        } as any) // Initial fetch user call
        .mockRejectedValueOnce(new Error('Network error')); // Failed login call

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      // Perform login - should handle error
      await act(async () => {
        try {
          await screen.getByTestId('login').click();
        } catch (error) {
          // Expected to throw
        }
      });

      expect(consoleSpy).toHaveBeenCalledWith('Login error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Logout functionality', () => {
    it('should logout user successfully and redirect to home', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ user: mockUser }),
        } as any) // Initial fetch user call
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ success: true }),
        } as any); // Logout call

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for user to be loaded
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      });

      // Perform logout
      await act(async () => {
        screen.getByTestId('logout').click();
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
          method: 'POST',
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
        expect(mockRouter.push).toHaveBeenCalledWith('/');
      });
    });

    it('should handle logout error gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ user: mockUser }),
        } as any) // Initial fetch user call
        .mockRejectedValueOnce(new Error('Logout failed')); // Failed logout call

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for user to be loaded
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      });

      // Perform logout
      await act(async () => {
        screen.getByTestId('logout').click();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('RefreshUser functionality', () => {
    it('should refresh user data', async () => {
      const updatedUser = { ...mockUser, name: 'Updated User' };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ user: mockUser }),
        } as any) // Initial fetch user call
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ user: updatedUser }),
        } as any); // Refresh user call

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial user to be loaded
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      });

      // Refresh user
      await act(async () => {
        screen.getByTestId('refresh').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(updatedUser));
      });

      // Should call fetch twice (initial + refresh)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/auth/me');
      expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/auth/me');
    });

    it('should handle refresh user error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ user: mockUser }),
        } as any) // Initial fetch user call
        .mockRejectedValueOnce(new Error('Refresh failed')); // Failed refresh call

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial user to be loaded
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      });

      // Refresh user
      await act(async () => {
        screen.getByTestId('refresh').click();
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching user:', expect.any(Error));
      
      // User should be set to null after failed refresh
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
      });

      consoleSpy.mockRestore();
    });
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      render(<TestComponentWithoutProvider />);
      
      expect(screen.getByTestId('error')).toHaveTextContent(
        'useAuth must be used within an AuthProvider'
      );
    });

    it('should provide context values', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ user: mockUser }),
      } as any);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      });

      // Check that all buttons are rendered (indicating all functions are provided)
      expect(screen.getByTestId('login')).toBeInTheDocument();
      expect(screen.getByTestId('logout')).toBeInTheDocument();
      expect(screen.getByTestId('refresh')).toBeInTheDocument();
    });
  });

  describe('Loading state', () => {
    it('should start with loading true and set to false after fetch', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ user: mockUser }),
      } as any);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Should start with loading true
      expect(screen.getByTestId('loading')).toHaveTextContent('true');

      // Should set loading to false after fetch
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });

    it('should set loading to false even on fetch error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });
    });
  });

  describe('User state management', () => {
    it('should update user state correctly during login flow', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: jest.fn().mockResolvedValue({}),
        } as any) // Initial fetch (no user)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ user: mockUser }),
        } as any); // Login success

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Initially no user
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
      });

      // Login
      await act(async () => {
        screen.getByTestId('login').click();
      });

      // User should be set
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      });
    });

    it('should clear user state on logout', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ user: mockUser }),
        } as any) // Initial fetch (with user)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({ success: true }),
        } as any); // Logout success

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // User should be loaded
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent(JSON.stringify(mockUser));
      });

      // Logout
      await act(async () => {
        screen.getByTestId('logout').click();
      });

      // User should be cleared
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('null');
      });
    });
  });
});