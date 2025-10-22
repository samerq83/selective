import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { LanguageProvider, useLanguage } from '../../contexts/LanguageContext';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock translations
jest.mock('@/lib/translations', () => ({
  translations: {
    en: {
      welcome: 'Welcome',
      login: 'Login',
      logout: 'Logout',
      dashboard: 'Dashboard',
      products: 'Products',
      orders: 'Orders'
    },
    ar: {
      welcome: 'مرحباً',
      login: 'تسجيل الدخول',
      logout: 'تسجيل الخروج',
      dashboard: 'لوحة التحكم',
      products: 'المنتجات',
      orders: 'الطلبات'
    }
  }
}));

// Test component that uses the LanguageContext
const TestComponent = () => {
  const { language, setLanguage, t, dir, direction } = useLanguage();
  
  return (
    <div data-testid="test-component">
      <div data-testid="current-language">{language}</div>
      <div data-testid="direction">{dir}</div>
      <div data-testid="direction-prop">{direction}</div>
      <div data-testid="welcome-text">{t('welcome' as any)}</div>
      <div data-testid="login-text">{t('login' as any)}</div>
      <div data-testid="missing-key">{t('nonExistentKey' as any)}</div>
      <button 
        data-testid="switch-to-english"
        onClick={() => setLanguage('en')}
      >
        Switch to English
      </button>
      <button 
        data-testid="switch-to-arabic"
        onClick={() => setLanguage('ar')}
      >
        Switch to Arabic
      </button>
    </div>
  );
};

const TestComponentWithoutProvider = () => {
  try {
    useLanguage();
    return <div>Should not render</div>;
  } catch (error: any) {
    return <div data-testid="error-message">{error.message}</div>;
  }
};

describe('LanguageContext', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
    // Reset document properties
    document.documentElement.dir = '';
    document.documentElement.lang = '';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('LanguageProvider', () => {
    it('should provide default language as Arabic', () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('current-language')).toHaveTextContent('ar');
      expect(screen.getByTestId('direction')).toHaveTextContent('rtl');
      expect(screen.getByTestId('welcome-text')).toHaveTextContent('مرحباً');
    });

    it('should load saved language from localStorage', () => {
      mockLocalStorage.setItem('language', 'en');

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('current-language')).toHaveTextContent('en');
      expect(screen.getByTestId('direction')).toHaveTextContent('ltr');
      expect(screen.getByTestId('welcome-text')).toHaveTextContent('Welcome');
    });

    it('should ignore invalid language from localStorage', () => {
      mockLocalStorage.setItem('language', 'invalid');

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Should default to Arabic
      expect(screen.getByTestId('current-language')).toHaveTextContent('ar');
      expect(screen.getByTestId('direction')).toHaveTextContent('rtl');
    });

    it('should set document direction and language on mount', () => {
      mockLocalStorage.setItem('language', 'en');

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(document.documentElement.dir).toBe('ltr');
      expect(document.documentElement.lang).toBe('en');
    });
  });

  describe('Language Switching', () => {
    it('should switch from Arabic to English', () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Initially Arabic
      expect(screen.getByTestId('current-language')).toHaveTextContent('ar');
      expect(screen.getByTestId('welcome-text')).toHaveTextContent('مرحباً');

      // Switch to English
      fireEvent.click(screen.getByTestId('switch-to-english'));

      expect(screen.getByTestId('current-language')).toHaveTextContent('en');
      expect(screen.getByTestId('welcome-text')).toHaveTextContent('Welcome');
      expect(screen.getByTestId('direction')).toHaveTextContent('ltr');
    });

    it('should switch from English to Arabic', () => {
      mockLocalStorage.setItem('language', 'en');

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Initially English
      expect(screen.getByTestId('current-language')).toHaveTextContent('en');
      expect(screen.getByTestId('welcome-text')).toHaveTextContent('Welcome');

      // Switch to Arabic
      fireEvent.click(screen.getByTestId('switch-to-arabic'));

      expect(screen.getByTestId('current-language')).toHaveTextContent('ar');
      expect(screen.getByTestId('welcome-text')).toHaveTextContent('مرحباً');
      expect(screen.getByTestId('direction')).toHaveTextContent('rtl');
    });

    it('should save language to localStorage when switching', () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Switch to English
      fireEvent.click(screen.getByTestId('switch-to-english'));

      expect(mockLocalStorage.getItem('language')).toBe('en');
    });

    it('should update document direction when switching languages', () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Initially Arabic (rtl)
      expect(document.documentElement.dir).toBe('rtl');
      expect(document.documentElement.lang).toBe('ar');

      // Switch to English
      fireEvent.click(screen.getByTestId('switch-to-english'));

      expect(document.documentElement.dir).toBe('ltr');
      expect(document.documentElement.lang).toBe('en');
    });
  });

  describe('Translation Function', () => {
    it('should return correct translation for current language', () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Arabic translations
      expect(screen.getByTestId('welcome-text')).toHaveTextContent('مرحباً');
      expect(screen.getByTestId('login-text')).toHaveTextContent('تسجيل الدخول');

      // Switch to English
      fireEvent.click(screen.getByTestId('switch-to-english'));

      // English translations
      expect(screen.getByTestId('welcome-text')).toHaveTextContent('Welcome');
      expect(screen.getByTestId('login-text')).toHaveTextContent('Login');
    });

    it('should fallback to English when key exists in English but not in current language', () => {
      // Mock translations with missing Arabic key
      const mockTranslations = {
        en: {
          welcome: 'Welcome',
          englishOnly: 'English Only'
        },
        ar: {
          welcome: 'مرحباً'
          // Missing 'englishOnly' key
        }
      };

      jest.doMock('@/lib/translations', () => ({
        translations: mockTranslations
      }));

      const TestComponentFallback = () => {
        const { t } = useLanguage();
        return <div data-testid="fallback-text">{t('englishOnly' as any)}</div>;
      };

      render(
        <LanguageProvider>
          <TestComponentFallback />
        </LanguageProvider>
      );

      // Should fallback to English
      expect(screen.getByTestId('fallback-text')).toHaveTextContent('English Only');
    });

    it('should return the key itself when translation is missing in both languages', () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('missing-key')).toHaveTextContent('nonExistentKey');
    });

    it('should handle translation keys with special characters', () => {
      const TestComponentSpecial = () => {
        const { t } = useLanguage();
        return <div data-testid="special-key">{t('key-with-dash' as any)}</div>;
      };

      render(
        <LanguageProvider>
          <TestComponentSpecial />
        </LanguageProvider>
      );

      // Should return the key itself since it doesn't exist
      expect(screen.getByTestId('special-key')).toHaveTextContent('key-with-dash');
    });
  });

  describe('Direction Properties', () => {
    it('should provide both dir and direction properties', () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('direction')).toHaveTextContent('rtl');
      expect(screen.getByTestId('direction-prop')).toHaveTextContent('rtl');
    });

    it('should update direction when language changes', () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Initially RTL for Arabic
      expect(screen.getByTestId('direction')).toHaveTextContent('rtl');

      // Switch to English
      fireEvent.click(screen.getByTestId('switch-to-english'));

      // Should be LTR for English
      expect(screen.getByTestId('direction')).toHaveTextContent('ltr');
    });
  });

  describe('Multiple Components', () => {
    it('should provide same context to multiple components', () => {
      const AnotherTestComponent = () => {
        const { language, t } = useLanguage();
        return (
          <div>
            <div data-testid="other-language">{language}</div>
            <div data-testid="other-welcome">{t('welcome' as any)}</div>
          </div>
        );
      };

      render(
        <LanguageProvider>
          <TestComponent />
          <AnotherTestComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('current-language')).toHaveTextContent('ar');
      expect(screen.getByTestId('other-language')).toHaveTextContent('ar');
      expect(screen.getByTestId('welcome-text')).toHaveTextContent('مرحباً');
      expect(screen.getByTestId('other-welcome')).toHaveTextContent('مرحباً');

      // Change language from first component
      fireEvent.click(screen.getByTestId('switch-to-english'));

      // Both components should update
      expect(screen.getByTestId('current-language')).toHaveTextContent('en');
      expect(screen.getByTestId('other-language')).toHaveTextContent('en');
      expect(screen.getByTestId('welcome-text')).toHaveTextContent('Welcome');
      expect(screen.getByTestId('other-welcome')).toHaveTextContent('Welcome');
    });
  });

  describe('useLanguage Hook', () => {
    it('should throw error when used outside of LanguageProvider', () => {
      render(<TestComponentWithoutProvider />);

      expect(screen.getByTestId('error-message')).toHaveTextContent(
        'useLanguage must be used within a LanguageProvider'
      );
    });

    it('should return all required properties', () => {
      const TestComponentProps = () => {
        const context = useLanguage();
        return (
          <div>
            <div data-testid="has-language">{typeof context.language}</div>
            <div data-testid="has-setLanguage">{typeof context.setLanguage}</div>
            <div data-testid="has-t">{typeof context.t}</div>
            <div data-testid="has-dir">{typeof context.dir}</div>
            <div data-testid="has-direction">{typeof context.direction}</div>
          </div>
        );
      };

      render(
        <LanguageProvider>
          <TestComponentProps />
        </LanguageProvider>
      );

      expect(screen.getByTestId('has-language')).toHaveTextContent('string');
      expect(screen.getByTestId('has-setLanguage')).toHaveTextContent('function');
      expect(screen.getByTestId('has-t')).toHaveTextContent('function');
      expect(screen.getByTestId('has-dir')).toHaveTextContent('string');
      expect(screen.getByTestId('has-direction')).toHaveTextContent('string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid language switching', () => {
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Rapidly switch languages
      fireEvent.click(screen.getByTestId('switch-to-english'));
      fireEvent.click(screen.getByTestId('switch-to-arabic'));
      fireEvent.click(screen.getByTestId('switch-to-english'));

      expect(screen.getByTestId('current-language')).toHaveTextContent('en');
      expect(screen.getByTestId('welcome-text')).toHaveTextContent('Welcome');
      expect(mockLocalStorage.getItem('language')).toBe('en');
    });

    it('should handle localStorage being unavailable', () => {
      // Mock localStorage to throw error
      const originalSetItem = mockLocalStorage.setItem;
      mockLocalStorage.setItem = jest.fn().mockImplementation(() => {
        throw new Error('LocalStorage not available');
      });

      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Should still work without throwing
      fireEvent.click(screen.getByTestId('switch-to-english'));
      expect(screen.getByTestId('current-language')).toHaveTextContent('en');

      // Restore original method
      mockLocalStorage.setItem = originalSetItem;
    });

    it('should handle document not being available (SSR)', () => {
      // Mock document to be undefined
      const originalDocument = global.document;
      (global as any).document = undefined;

      // Should not throw error
      expect(() => {
        render(
          <LanguageProvider>
            <TestComponent />
          </LanguageProvider>
        );
      }).not.toThrow();

      // Restore document
      global.document = originalDocument;
    });
  });

  describe('Persistence', () => {
    it('should persist language selection across rerenders', () => {
      const { rerender } = render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Switch to English
      fireEvent.click(screen.getByTestId('switch-to-english'));
      expect(screen.getByTestId('current-language')).toHaveTextContent('en');

      // Rerender component
      rerender(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      // Should maintain English language
      expect(screen.getByTestId('current-language')).toHaveTextContent('en');
    });

    it('should restore language from localStorage on new mount', () => {
      mockLocalStorage.setItem('language', 'en');

      const { unmount } = render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      unmount();

      // Mount again
      render(
        <LanguageProvider>
          <TestComponent />
        </LanguageProvider>
      );

      expect(screen.getByTestId('current-language')).toHaveTextContent('en');
      expect(screen.getByTestId('welcome-text')).toHaveTextContent('Welcome');
    });
  });
});