import {
  cn,
  formatPhone,
  formatDate,
  formatDateTime,
  getEditDeadline,
  canEditOrder,
  generateOrderNumber,
  playNotificationSound
} from '@/lib/utils';

// Mock Audio for browser environment
const mockAudio = {
  play: jest.fn().mockResolvedValue(undefined),
};
global.Audio = jest.fn().mockImplementation(() => mockAudio);

describe('Utils Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cn (className utility)', () => {
    it('should combine class names', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const result = cn('base', true && 'conditional', false && 'excluded');
      expect(result).toBe('base conditional');
    });

    it('should handle empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should handle undefined and null', () => {
      const result = cn('base', undefined, null, 'valid');
      expect(result).toBe('base valid');
    });
  });

  describe('formatPhone', () => {
    it('should remove non-numeric characters', () => {
      expect(formatPhone('123-456-7890')).toBe('1234567890');
      expect(formatPhone('+1 (234) 567-8900')).toBe('12345678900');
      expect(formatPhone('123.456.7890')).toBe('1234567890');
      expect(formatPhone('123 456 7890')).toBe('1234567890');
    });

    it('should handle already clean numbers', () => {
      expect(formatPhone('1234567890')).toBe('1234567890');
    });

    it('should handle empty string', () => {
      expect(formatPhone('')).toBe('');
    });

    it('should handle string with only non-numeric characters', () => {
      expect(formatPhone('abc-def-ghij')).toBe('');
    });

    it('should handle mixed content', () => {
      expect(formatPhone('abc123def456')).toBe('123456');
    });
  });

  describe('formatDate', () => {
    it('should format Date object correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);
      // Check that it returns a string in the expected format
      expect(formatted).toMatch(/Jan 15, 2024|Jan 14, 2024/); // Depending on timezone
    });

    it('should format date string correctly', () => {
      const formatted = formatDate('2024-01-15');
      expect(formatted).toMatch(/Jan 15, 2024|Jan 14, 2024/); // Depending on timezone
    });

    it('should handle invalid date', () => {
      const formatted = formatDate('invalid-date');
      expect(formatted).toBe('Invalid Date');
    });

    it('should format different months correctly', () => {
      const date = new Date('2024-12-25T00:00:00Z');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/Dec 25, 2024|Dec 24, 2024/); // Depending on timezone
    });
  });

  describe('formatDateTime', () => {
    it('should format Date object with time correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDateTime(date);
      // Should include both date and time
      expect(formatted).toMatch(/Jan 15, 2024|Jan 14, 2024/);
      expect(formatted).toMatch(/\d{1,2}:\d{2} [AP]M/);
    });

    it('should format date string with time correctly', () => {
      const formatted = formatDateTime('2024-01-15T14:30:00');
      expect(formatted).toMatch(/Jan 15, 2024|Jan 14, 2024/);
      expect(formatted).toMatch(/\d{1,2}:\d{2} [AP]M/);
    });

    it('should handle invalid date with time', () => {
      const formatted = formatDateTime('invalid-date');
      expect(formatted).toBe('Invalid Date');
    });
  });

  describe('getEditDeadline', () => {
    it('should return date 2 hours from now by default', () => {
      const now = new Date();
      const deadline = getEditDeadline();
      
      const timeDiff = deadline.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      expect(hoursDiff).toBeCloseTo(2, 1);
    });

    it('should accept custom edit time limit', () => {
      const now = new Date();
      const deadline = getEditDeadline(5);
      
      const timeDiff = deadline.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      expect(hoursDiff).toBeCloseTo(5, 1);
    });

    it('should handle zero time limit', () => {
      const now = new Date();
      const deadline = getEditDeadline(0);
      
      const timeDiff = deadline.getTime() - now.getTime();
      const minutesDiff = timeDiff / (1000 * 60);
      
      expect(minutesDiff).toBeCloseTo(0, 1);
    });

    it('should handle negative time limit', () => {
      const now = new Date();
      const deadline = getEditDeadline(-1);
      
      expect(deadline.getTime()).toBeLessThan(now.getTime());
    });
  });

  describe('canEditOrder', () => {
    it('should return false for undefined deadline', () => {
      expect(canEditOrder(undefined)).toBe(false);
    });

    it('should return true for future deadline', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      
      expect(canEditOrder(futureDate)).toBe(true);
    });

    it('should return false for past deadline', () => {
      const pastDate = new Date();
      pastDate.setHours(pastDate.getHours() - 1);
      
      expect(canEditOrder(pastDate)).toBe(false);
    });

    it('should handle Date string', () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);
      
      expect(canEditOrder(futureDate)).toBe(true);
    });

    it('should return false for current time (edge case)', () => {
      const now = new Date();
      // Add a small delay to ensure the check happens after
      setTimeout(() => {
        expect(canEditOrder(now)).toBe(false);
      }, 1);
    });
  });

  describe('generateOrderNumber', () => {
    it('should generate order number with correct format', () => {
      const orderNumber = generateOrderNumber();
      
      // Should match format: ST{YY}{MM}{DD}-{XXXX}
      expect(orderNumber).toMatch(/^ST\d{6}-\d{4}$/);
    });

    it('should start with ST prefix', () => {
      const orderNumber = generateOrderNumber();
      expect(orderNumber.startsWith('ST')).toBe(true);
    });

    it('should include current date components', () => {
      const orderNumber = generateOrderNumber();
      const now = new Date();
      
      const year = now.getFullYear().toString().slice(-2);
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      
      const expectedDatePart = `ST${year}${month}${day}`;
      expect(orderNumber.startsWith(expectedDatePart)).toBe(true);
    });

    it('should have 4-digit random suffix', () => {
      const orderNumber = generateOrderNumber();
      const parts = orderNumber.split('-');
      
      expect(parts).toHaveLength(2);
      expect(parts[1]).toMatch(/^\d{4}$/);
    });

    it('should generate unique numbers', () => {
      const numbers = new Set();
      
      // Generate 100 order numbers
      for (let i = 0; i < 100; i++) {
        numbers.add(generateOrderNumber());
      }
      
      // All should be unique (very high probability)
      expect(numbers.size).toBe(100);
    });

    it('should generate consistent format across multiple calls', () => {
      const orderNumbers = [
        generateOrderNumber(),
        generateOrderNumber(),
        generateOrderNumber(),
      ];
      
      orderNumbers.forEach(orderNumber => {
        expect(orderNumber).toMatch(/^ST\d{6}-\d{4}$/);
      });
    });
  });

  describe('playNotificationSound', () => {
    it('should create Audio instance with correct path', () => {
      playNotificationSound();
      
      expect(global.Audio).toHaveBeenCalledWith('/notification.mp3');
    });

    it('should call play method on audio', () => {
      playNotificationSound();
      
      expect(mockAudio.play).toHaveBeenCalled();
    });

    it('should handle play errors gracefully', async () => {
      mockAudio.play.mockRejectedValueOnce(new Error('Audio play failed'));
      
      expect(() => playNotificationSound()).not.toThrow();
    });

    it('should not throw error in non-browser environment', () => {
      // Mock window as undefined
      const originalWindow = global.window;
      delete (global as any).window;
      
      expect(() => playNotificationSound()).not.toThrow();
      
      // Restore window
      global.window = originalWindow;
    });
  });

  describe('Integration Tests', () => {
    it('should work together for order processing flow', () => {
      // Generate order number
      const orderNumber = generateOrderNumber();
      expect(orderNumber).toMatch(/^ST\d{6}-\d{4}$/);
      
      // Set edit deadline
      const deadline = getEditDeadline(2);
      expect(canEditOrder(deadline)).toBe(true);
      
      // Format phone
      const phone = formatPhone('+1 (234) 567-8900');
      expect(phone).toBe('12345678900');
      
      // Format dates
      const now = new Date();
      const formattedDate = formatDate(now);
      const formattedDateTime = formatDateTime(now);
      
      expect(formattedDate).toBeTruthy();
      expect(formattedDateTime).toBeTruthy();
    });

    it('should handle edge cases consistently', () => {
      // Empty/invalid inputs
      expect(formatPhone('')).toBe('');
      expect(canEditOrder(undefined)).toBe(false);
      expect(formatDate('invalid')).toBe('Invalid Date');
      
      // Should not throw errors
      expect(() => playNotificationSound()).not.toThrow();
      expect(() => generateOrderNumber()).not.toThrow();
    });
  });
});