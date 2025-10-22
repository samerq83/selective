import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import AdminNavbar from '../../components/AdminNavbar';

// Mock Next.js components and hooks
jest.mock('next/link', () => {
  return ({ children, href, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  );
});

jest.mock('next/image', () => {
  return ({ src, alt, width, height, className }: any) => (
    <img src={src} alt={alt} width={width} height={height} className={className} />
  );
});

jest.mock('next/navigation', () => ({
  usePathname: jest.fn()
}));

// Mock AuthContext
const mockLogout = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn()
}));

// Mock LanguageContext
const mockSetLanguage = jest.fn();
jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: jest.fn()
}));

// Mock react-icons
jest.mock('react-icons/fa', () => ({
  FaGlobe: () => <span data-testid="globe-icon">Globe</span>,
  FaSignOutAlt: () => <span data-testid="logout-icon">Logout</span>,
  FaHome: () => <span data-testid="home-icon">Home</span>,
  FaBox: () => <span data-testid="box-icon">Box</span>,
  FaUsers: () => <span data-testid="users-icon">Users</span>,
  FaChartBar: () => <span data-testid="chart-bar-icon">Chart Bar</span>,
  FaChartLine: () => <span data-testid="chart-line-icon">Chart Line</span>
}));

// Translation function mock
const mockT = jest.fn();

describe('AdminNavbar Component', () => {
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Admin User',
    phone: '+201234567890',
    role: 'admin' as const,
    businessName: 'Selective Trading',
    businessType: 'distributor' as const,
    location: 'Cairo',
    isVerified: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    require('next/navigation').usePathname.mockReturnValue('/admin');
    require('@/contexts/AuthContext').useAuth.mockReturnValue({
      user: mockUser,
      logout: mockLogout
    });
    
    // Setup language context mock with translations
    mockT.mockImplementation((key: string) => {
      const translations: Record<string, string> = {
        'dashboard': 'Dashboard',
        'orders': 'Orders',
        'customers': 'Customers',
        'products': 'Products',
        'reports': 'Reports',
        'language': 'Language',
        'admin': 'Admin',
        'logout': 'Logout'
      };
      return translations[key] || key;
    });

    require('@/contexts/LanguageContext').useLanguage.mockReturnValue({
      t: mockT,
      language: 'en',
      setLanguage: mockSetLanguage
    });
  });

  describe('Rendering', () => {
    it('should render the admin navbar', () => {
      render(<AdminNavbar />);
      
      // Check if navbar is rendered
      const navbar = screen.getByRole('navigation');
      expect(navbar).toBeInTheDocument();
      expect(navbar).toHaveClass('bg-gradient-to-r', 'from-primary-black', 'to-dark-gray');
    });

    it('should render the logo with correct attributes', () => {
      render(<AdminNavbar />);
      
      const logo = screen.getByAltText('Selective Trading Logo');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/images/logo.png');
      expect(logo).toHaveAttribute('width', '180');
      expect(logo).toHaveAttribute('height', '50');
    });

    it('should render navigation links with correct labels', () => {
      render(<AdminNavbar />);
      
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Orders')).toBeInTheDocument();
      expect(screen.getByText('Customers')).toBeInTheDocument();
      expect(screen.getByText('Products')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
    });

    it('should render navigation links with correct icons', () => {
      render(<AdminNavbar />);
      
      expect(screen.getAllByTestId('home-icon')).toHaveLength(2); // Desktop and mobile
      expect(screen.getAllByTestId('box-icon')).toHaveLength(2);
      expect(screen.getAllByTestId('users-icon')).toHaveLength(2);
      expect(screen.getAllByTestId('chart-bar-icon')).toHaveLength(2);
      expect(screen.getAllByTestId('chart-line-icon')).toHaveLength(2);
    });

    it('should render navigation links with correct href attributes', () => {
      render(<AdminNavbar />);
      
      const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i });
      dashboardLinks.forEach(link => {
        expect(link).toHaveAttribute('href', '/admin');
      });

      const orderLinks = screen.getAllByRole('link', { name: /orders/i });
      orderLinks.forEach(link => {
        expect(link).toHaveAttribute('href', '/admin/orders');
      });
    });
  });

  describe('User Information', () => {
    it('should display user name when available', () => {
      render(<AdminNavbar />);
      
      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });

    it('should display phone when name is not available', () => {
      const userWithoutName = { ...mockUser, name: undefined };
      require('@/contexts/AuthContext').useAuth.mockReturnValue({
        user: userWithoutName,
        logout: mockLogout
      });

      render(<AdminNavbar />);
      
      expect(screen.getByText(mockUser.phone)).toBeInTheDocument();
    });

    it('should display admin role label', () => {
      render(<AdminNavbar />);
      
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  describe('Active Link Highlighting', () => {
    it('should highlight active dashboard link', () => {
      require('next/navigation').usePathname.mockReturnValue('/admin');
      render(<AdminNavbar />);
      
      const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i });
      dashboardLinks.forEach(link => {
        expect(link).toHaveClass('bg-primary-red', 'text-white');
      });
    });

    it('should highlight active orders link', () => {
      require('next/navigation').usePathname.mockReturnValue('/admin/orders');
      render(<AdminNavbar />);
      
      const orderLinks = screen.getAllByRole('link', { name: /orders/i });
      orderLinks.forEach(link => {
        expect(link).toHaveClass('bg-primary-red', 'text-white');
      });
    });

    it('should highlight active customers link', () => {
      require('next/navigation').usePathname.mockReturnValue('/admin/customers');
      render(<AdminNavbar />);
      
      const customerLinks = screen.getAllByRole('link', { name: /customers/i });
      customerLinks.forEach(link => {
        expect(link).toHaveClass('bg-primary-red', 'text-white');
      });
    });

    it('should not highlight inactive links', () => {
      require('next/navigation').usePathname.mockReturnValue('/admin/orders');
      render(<AdminNavbar />);
      
      const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i });
      dashboardLinks.forEach(link => {
        expect(link).not.toHaveClass('bg-primary-red', 'text-white');
        expect(link).toHaveClass('text-gray-300');
      });
    });
  });

  describe('Language Toggle', () => {
    it('should render language toggle button', () => {
      render(<AdminNavbar />);
      
      const languageButton = screen.getByRole('button', { name: /language/i });
      expect(languageButton).toBeInTheDocument();
      expect(screen.getByTestId('globe-icon')).toBeInTheDocument();
    });

    it('should toggle language from English to Arabic', () => {
      render(<AdminNavbar />);
      
      const languageButton = screen.getByRole('button', { name: /language/i });
      fireEvent.click(languageButton);
      
      expect(mockSetLanguage).toHaveBeenCalledWith('ar');
    });

    it('should toggle language from Arabic to English', () => {
      require('@/contexts/LanguageContext').useLanguage.mockReturnValue({
        t: mockT,
        language: 'ar',
        setLanguage: mockSetLanguage
      });

      render(<AdminNavbar />);
      
      const languageButton = screen.getByRole('button', { name: /language/i });
      fireEvent.click(languageButton);
      
      expect(mockSetLanguage).toHaveBeenCalledWith('en');
    });
  });

  describe('Logout Functionality', () => {
    it('should render logout button', () => {
      render(<AdminNavbar />);
      
      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toBeInTheDocument();
      expect(screen.getByTestId('logout-icon')).toBeInTheDocument();
    });

    it('should call logout function when logout button is clicked', () => {
      render(<AdminNavbar />);
      
      const logoutButton = screen.getByRole('button', { name: /logout/i });
      fireEvent.click(logoutButton);
      
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should have hover effect on logout button', () => {
      render(<AdminNavbar />);
      
      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toHaveClass('hover:bg-red-600');
    });
  });

  describe('Responsive Design', () => {
    it('should hide desktop navigation on mobile screens', () => {
      render(<AdminNavbar />);
      
      // Desktop navigation should have md:flex class
      const desktopNav = document.querySelector('.hidden.md\\:flex');
      expect(desktopNav).toBeInTheDocument();
    });

    it('should show mobile navigation on small screens', () => {
      render(<AdminNavbar />);
      
      // Mobile navigation should have md:hidden class
      const mobileNav = document.querySelector('.md\\:hidden .flex');
      expect(mobileNav).toBeInTheDocument();
    });

    it('should render mobile navigation links', () => {
      render(<AdminNavbar />);
      
      // All navigation links should appear twice (desktop + mobile)
      expect(screen.getAllByText('Dashboard')).toHaveLength(2);
      expect(screen.getAllByText('Orders')).toHaveLength(2);
      expect(screen.getAllByText('Customers')).toHaveLength(2);
      expect(screen.getAllByText('Products')).toHaveLength(2);
      expect(screen.getAllByText('Reports')).toHaveLength(2);
    });
  });

  describe('Arabic Language Support', () => {
    beforeEach(() => {
      // Setup Arabic translations
      mockT.mockImplementation((key: string) => {
        const arabicTranslations: Record<string, string> = {
          'dashboard': 'لوحة التحكم',
          'orders': 'الطلبات',
          'customers': 'العملاء',
          'products': 'المنتجات',
          'reports': 'التقارير',
          'language': 'اللغة',
          'admin': 'المدير',
          'logout': 'تسجيل الخروج'
        };
        return arabicTranslations[key] || key;
      });

      require('@/contexts/LanguageContext').useLanguage.mockReturnValue({
        t: mockT,
        language: 'ar',
        setLanguage: mockSetLanguage
      });
    });

    it('should display Arabic translations', () => {
      render(<AdminNavbar />);
      
      expect(screen.getByText('لوحة التحكم')).toBeInTheDocument();
      expect(screen.getByText('الطلبات')).toBeInTheDocument();
      expect(screen.getByText('العملاء')).toBeInTheDocument();
      expect(screen.getByText('المنتجات')).toBeInTheDocument();
      expect(screen.getByText('التقارير')).toBeInTheDocument();
      expect(screen.getByText('المدير')).toBeInTheDocument();
    });

    it('should apply RTL spacing classes', () => {
      render(<AdminNavbar />);
      
      // Check for rtl:space-x-reverse classes
      const spacingElements = document.querySelectorAll('.rtl\\:space-x-reverse');
      expect(spacingElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing user gracefully', () => {
      require('@/contexts/AuthContext').useAuth.mockReturnValue({
        user: null,
        logout: mockLogout
      });

      render(<AdminNavbar />);
      
      // Should still render the navbar structure
      const navbar = screen.getByRole('navigation');
      expect(navbar).toBeInTheDocument();
    });

    it('should handle missing user name and phone gracefully', () => {
      require('@/contexts/AuthContext').useAuth.mockReturnValue({
        user: { ...mockUser, name: undefined, phone: undefined },
        logout: mockLogout
      });

      render(<AdminNavbar />);
      
      // Should still render without crashing
      const navbar = screen.getByRole('navigation');
      expect(navbar).toBeInTheDocument();
    });
  });

  describe('Button Interactions', () => {
    it('should have proper hover states for language button', () => {
      render(<AdminNavbar />);
      
      const languageButton = screen.getByRole('button', { name: /language/i });
      expect(languageButton).toHaveClass('hover:bg-white', 'hover:bg-opacity-10');
    });

    it('should have proper transition classes', () => {
      render(<AdminNavbar />);
      
      const navLinks = screen.getAllByRole('link', { name: /dashboard|orders|customers|products|reports/i });
      navLinks.forEach(link => {
        expect(link).toHaveClass('transition-all', 'duration-200');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper button titles', () => {
      render(<AdminNavbar />);
      
      const languageButton = screen.getByRole('button', { name: /language/i });
      expect(languageButton).toHaveAttribute('title', 'Language');
      
      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toHaveAttribute('title', 'Logout');
    });

    it('should have proper alt text for logo', () => {
      render(<AdminNavbar />);
      
      const logo = screen.getByAltText('Selective Trading Logo');
      expect(logo).toBeInTheDocument();
    });

    it('should have keyboard navigation support for buttons', () => {
      render(<AdminNavbar />);
      
      const languageButton = screen.getByRole('button', { name: /language/i });
      const logoutButton = screen.getByRole('button', { name: /logout/i });
      
      expect(languageButton).toBeVisible();
      expect(logoutButton).toBeVisible();
      
      // Buttons should be focusable
      languageButton.focus();
      expect(languageButton).toHaveFocus();
      
      logoutButton.focus();
      expect(logoutButton).toHaveFocus();
    });
  });
});