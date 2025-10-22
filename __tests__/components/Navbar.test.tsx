import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

// Mock the contexts
jest.mock('../../contexts/AuthContext');
jest.mock('../../contexts/LanguageContext');

// Mock next components
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />;
  };
});

// Mock react-icons
jest.mock('react-icons/fa', () => ({
  FaBell: () => <span data-testid="bell-icon">🔔</span>,
  FaGlobe: () => <span data-testid="globe-icon">🌐</span>,
  FaSignOutAlt: () => <span data-testid="logout-icon">🚪</span>,
  FaUser: () => <span data-testid="user-icon">👤</span>,
  FaHeart: () => <span data-testid="heart-icon">❤️</span>,
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;

describe('Navbar Component', () => {
  const mockLogout = jest.fn();
  const mockSetLanguage = jest.fn();
  const mockTranslation = jest.fn((key: string) => key);

  const defaultAuthContext = {
    user: {
      id: '1',
      name: 'John Doe',
      phone: '+1234567890',
      isAdmin: false
    },
    logout: mockLogout
  };

  const defaultLanguageContext = {
    t: mockTranslation,
    language: 'en' as const,
    setLanguage: mockSetLanguage,
    direction: 'ltr' as const
  };

  const mockNotifications = [
    {
      _id: '1',
      title: { en: 'Test Notification', ar: 'إشعار تجريبي' },
      message: { en: 'Test message', ar: 'رسالة تجريبية' },
      isRead: false,
      createdAt: '2024-01-01T00:00:00Z'
    },
    {
      _id: '2',
      title: { en: 'Read Notification', ar: 'إشعار مقروء' },
      message: { en: 'Read message', ar: 'رسالة مقروءة' },
      isRead: true,
      createdAt: '2024-01-02T00:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(defaultAuthContext);
    mockUseLanguage.mockReturnValue(defaultLanguageContext);
    
    mockFetch.mockImplementation((url) => {
      if (url === '/api/notifications') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ notifications: mockNotifications })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    // Mock console.error to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  describe('Happy Path', () => {
    it('should render navbar with user info for customer', async () => {
      render(<Navbar />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('customerName')).toBeInTheDocument();
      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });

    it('should render navbar with admin user info', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthContext,
        user: { ...defaultAuthContext.user!, isAdmin: true }
      });

      render(<Navbar />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.queryByTestId('heart-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-icon')).not.toBeInTheDocument();
    });

    it('should display phone when name is not available', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthContext,
        user: { ...defaultAuthContext.user!, name: undefined }
      });

      render(<Navbar />);

      expect(screen.getByText('+1234567890')).toBeInTheDocument();
    });

    it('should fetch and display notifications on load', async () => {
      render(<Navbar />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/notifications');
      });

      // Click on notifications bell
      fireEvent.click(screen.getByTestId('bell-icon'));

      expect(screen.getByText('Test Notification')).toBeInTheDocument();
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });

    it('should show unread notification count', async () => {
      render(<Navbar />);

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument(); // unread count
      });
    });

    it('should toggle language when globe is clicked', () => {
      render(<Navbar />);

      fireEvent.click(screen.getByTestId('globe-icon'));

      expect(mockSetLanguage).toHaveBeenCalledWith('ar');
    });

    it('should call logout when logout button is clicked', () => {
      render(<Navbar />);

      fireEvent.click(screen.getByTestId('logout-icon'));

      expect(mockLogout).toHaveBeenCalled();
    });
  });

  describe('Input Verification', () => {
    it('should handle null user gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        logout: mockLogout
      });

      render(<Navbar />);

      // Should not crash and should not fetch notifications
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle empty notifications array', async () => {
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ notifications: [] })
      }));

      render(<Navbar />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/notifications');
      });

      fireEvent.click(screen.getByTestId('bell-icon'));
      
      expect(screen.getByText('noNotifications')).toBeInTheDocument();
    });

    it('should not show unread count when no unread notifications', async () => {
      const readNotifications = mockNotifications.map(n => ({ ...n, isRead: true }));
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ notifications: readNotifications })
      }));

      render(<Navbar />);

      await waitFor(() => {
        expect(screen.queryByText('1')).not.toBeInTheDocument();
      });
    });

    it('should handle Arabic language selection', () => {
      mockUseLanguage.mockReturnValue({
        ...defaultLanguageContext,
        language: 'ar'
      });

      render(<Navbar />);

      fireEvent.click(screen.getByTestId('globe-icon'));

      expect(mockSetLanguage).toHaveBeenCalledWith('en');
    });
  });

  describe('Branching', () => {
    it('should show customer-specific actions for non-admin users', () => {
      render(<Navbar />);

      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    });

    it('should hide customer-specific actions for admin users', () => {
      mockUseAuth.mockReturnValue({
        ...defaultAuthContext,
        user: { ...defaultAuthContext.user!, isAdmin: true }
      });

      render(<Navbar />);

      expect(screen.queryByTestId('heart-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('user-icon')).not.toBeInTheDocument();
    });

    it('should toggle notifications dropdown visibility', async () => {
      render(<Navbar />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Initially not visible
      expect(screen.queryByText('Test Notification')).not.toBeInTheDocument();

      // Click to show
      fireEvent.click(screen.getByTestId('bell-icon'));
      expect(screen.getByText('Test Notification')).toBeInTheDocument();

      // Click to hide
      fireEvent.click(screen.getByTestId('bell-icon'));
      expect(screen.queryByText('Test Notification')).not.toBeInTheDocument();
    });

    it('should link to correct dashboard based on user type', () => {
      render(<Navbar />);

      const logoLink = screen.getByRole('link', { name: /selective trading logo/i });
      expect(logoLink).toHaveAttribute('href', '/dashboard');

      // Test admin user
      mockUseAuth.mockReturnValue({
        ...defaultAuthContext,
        user: { ...defaultAuthContext.user!, isAdmin: true }
      });

      render(<Navbar />);

      const adminLogoLink = screen.getByRole('link', { name: /selective trading logo/i });
      expect(adminLogoLink).toHaveAttribute('href', '/admin');
    });

    it('should display notifications in correct language', async () => {
      mockUseLanguage.mockReturnValue({
        ...defaultLanguageContext,
        language: 'ar'
      });

      render(<Navbar />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByTestId('bell-icon'));

      expect(screen.getByText('إشعار تجريبي')).toBeInTheDocument();
      expect(screen.getByText('رسالة تجريبية')).toBeInTheDocument();
    });

    it('should mark notifications as read when clicked', async () => {
      render(<Navbar />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/notifications');
      });

      fireEvent.click(screen.getByTestId('bell-icon'));

      const unreadNotification = screen.getByText('Test Notification');
      fireEvent.click(unreadNotification);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/notifications/1', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true })
        });
      });
    });
  });

  describe('Exception Handling', () => {
    it('should handle notification fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Fetch error'));

      render(<Navbar />);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error fetching notifications:', expect.any(Error));
      });
    });

    it('should handle mark as read errors gracefully', async () => {
      render(<Navbar />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/notifications');
      });

      fireEvent.click(screen.getByTestId('bell-icon'));

      mockFetch.mockRejectedValueOnce(new Error('Mark as read error'));

      const unreadNotification = screen.getByText('Test Notification');
      fireEvent.click(unreadNotification);

      await waitFor(() => {
        expect(console.error).toHaveBeenCalledWith('Error marking notification as read:', expect.any(Error));
      });
    });

    it('should handle failed notification response gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Server error' })
      });

      render(<Navbar />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/notifications');
      });

      // Should not throw error
      fireEvent.click(screen.getByTestId('bell-icon'));
      expect(screen.getByText('noNotifications')).toBeInTheDocument();
    });

    it('should handle missing notification properties', async () => {
      const malformedNotifications = [
        {
          _id: '1',
          title: { en: 'Test' },
          // Missing message and other properties
          isRead: false,
          createdAt: '2024-01-01T00:00:00Z'
        }
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ notifications: malformedNotifications })
      });

      render(<Navbar />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByTestId('bell-icon'));

      // Should not crash
      expect(screen.getByText('Test')).toBeInTheDocument();
    });
  });

  describe('Notifications Polling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    it('should poll for notifications every 30 seconds', async () => {
      render(<Navbar />);

      // Initial fetch
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Advance timer by 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      // Advance another 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });

    it('should clear polling interval when user is null', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      const { rerender } = render(<Navbar />);

      // Change to no user
      mockUseAuth.mockReturnValue({
        user: null,
        logout: mockLogout
      });

      rerender(<Navbar />);

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should not start polling when user is null', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        logout: mockLogout
      });

      render(<Navbar />);

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and titles', () => {
      render(<Navbar />);

      expect(screen.getByTitle('language')).toBeInTheDocument();
      expect(screen.getByTitle('notifications')).toBeInTheDocument();
      expect(screen.getByTitle('logout')).toBeInTheDocument();
    });

    it('should have proper heading structure in notifications', async () => {
      render(<Navbar />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByTestId('bell-icon'));

      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('notifications');
    });

    it('should have proper navigation links', () => {
      render(<Navbar />);

      const favoriteLink = screen.getByTitle('favoriteOrders');
      const profileLink = screen.getByTitle('profile');

      expect(favoriteLink).toHaveAttribute('href', '/dashboard/favorites');
      expect(profileLink).toHaveAttribute('href', '/dashboard/profile');
    });

    it('should maintain focus management for dropdown', async () => {
      render(<Navbar />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const bellButton = screen.getByTestId('bell-icon').closest('button');
      
      fireEvent.click(bellButton!);
      
      // Dropdown should be visible
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render with proper CSS classes for RTL support', () => {
      render(<Navbar />);

      const container = screen.getByRole('navigation');
      expect(container.querySelector('.rtl\\:space-x-reverse')).toBeInTheDocument();
    });

    it('should apply correct styling for notification badge', async () => {
      render(<Navbar />);

      await waitFor(() => {
        const badge = screen.getByText('1');
        expect(badge).toHaveClass('notification-badge');
      });
    });

    it('should apply hover states correctly', () => {
      render(<Navbar />);

      const languageButton = screen.getByTestId('globe-icon').closest('button');
      expect(languageButton).toHaveClass('hover:bg-gray-100');
    });
  });
});