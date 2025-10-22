import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { sendVerificationEmail } from '../../lib/email';

// Mock nodemailer
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn();

jest.mock('nodemailer', () => ({
  default: {
    createTransport: jest.fn()
  }
}));

// Mock console methods to avoid noise in test output
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

describe('Email Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock transporter with sendMail method
    mockCreateTransport.mockReturnValue({
      sendMail: mockSendMail
    });
    
    // Setup nodemailer mock
    const nodemailer = require('nodemailer');
    nodemailer.default.createTransport = mockCreateTransport;
    
    // Mock console methods
    console.log = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
    
    // Mock successful email sending
    mockSendMail.mockResolvedValue({
      messageId: 'test-message-id',
      response: '250 OK'
    });
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    
    // Clear environment variables
    delete process.env.EMAIL_USER;
    delete process.env.APP_PASSWORD;
    
    // Reset module to ensure fresh state for each test
    jest.resetModules();
  });

  describe('Transporter Configuration', () => {
    it('should create Gmail transporter when credentials are provided', async () => {
      process.env.EMAIL_USER = 'test@gmail.com';
      process.env.APP_PASSWORD = 'test-password';

      await sendVerificationEmail('user@example.com', '1234', 'Test User');

      expect(mockCreateTransport).toHaveBeenCalledWith({
        service: 'gmail',
        auth: {
          user: 'test@gmail.com',
          pass: 'test-password'
        }
      });

      expect(console.log).toHaveBeenCalledWith(
        '[Email] Using Gmail SMTP transport for sending real emails.'
      );
    });

    it('should create fallback transporter when credentials are missing', async () => {
      // No credentials set
      delete process.env.EMAIL_USER;
      delete process.env.APP_PASSWORD;

      await sendVerificationEmail('user@example.com', '1234', 'Test User');

      expect(mockCreateTransport).toHaveBeenCalledWith({
        jsonTransport: true
      });

      expect(console.warn).toHaveBeenCalledWith(
        '[Email] Using JSON transport fallback (verification codes will be logged to console).'
      );
    });

    it('should create fallback transporter when only EMAIL_USER is missing', async () => {
      delete process.env.EMAIL_USER;
      process.env.APP_PASSWORD = 'test-password';

      await sendVerificationEmail('user@example.com', '1234', 'Test User');

      expect(mockCreateTransport).toHaveBeenCalledWith({
        jsonTransport: true
      });
    });

    it('should create fallback transporter when only APP_PASSWORD is missing', async () => {
      process.env.EMAIL_USER = 'test@gmail.com';
      delete process.env.APP_PASSWORD;

      await sendVerificationEmail('user@example.com', '1234', 'Test User');

      expect(mockCreateTransport).toHaveBeenCalledWith({
        jsonTransport: true
      });
    });

    it('should reuse existing transporter on subsequent calls', async () => {
      process.env.EMAIL_USER = 'test@gmail.com';
      process.env.APP_PASSWORD = 'test-password';

      // First call
      await sendVerificationEmail('user1@example.com', '1234', 'User One');
      // Second call
      await sendVerificationEmail('user2@example.com', '5678', 'User Two');

      // Transporter should be created only once
      expect(mockCreateTransport).toHaveBeenCalledTimes(1);
    });
  });

  describe('Verification Email Sending', () => {
    beforeEach(() => {
      process.env.EMAIL_USER = 'test@selectivetrading.com';
      process.env.APP_PASSWORD = 'test-password';
    });

    it('should send verification email with correct parameters', async () => {
      const to = 'user@example.com';
      const code = '1234';
      const name = 'John Doe';

      await sendVerificationEmail(to, code, name);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      
      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe(to);
      expect(mailOptions.from).toBe('"Selective Trading" <test@selectivetrading.com>');
      expect(mailOptions.subject).toBe('Your Verification Code - Selective Trading');
    });

    it('should include verification code in email content', async () => {
      const code = '9876';
      const name = 'Jane Smith';

      await sendVerificationEmail('user@example.com', code, name);

      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain(code);
      expect(mailOptions.text).toContain(code);
    });

    it('should include user name in email content', async () => {
      const name = 'Test User';
      
      await sendVerificationEmail('user@example.com', '1234', name);

      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain(`Hello ${name}!`);
      expect(mailOptions.text).toContain(`Hello ${name}!`);
    });

    it('should include current year in email footer', async () => {
      const currentYear = new Date().getFullYear();
      
      await sendVerificationEmail('user@example.com', '1234', 'Test User');

      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain(`© ${currentYear} Selective Trading`);
      expect(mailOptions.text).toContain(`© ${currentYear} Selective Trading`);
    });

    it('should use fallback from address when EMAIL_USER is not set', async () => {
      delete process.env.EMAIL_USER;
      process.env.APP_PASSWORD = 'test-password';

      await sendVerificationEmail('user@example.com', '1234', 'Test User');

      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.from).toBe('"Selective Trading" <no-reply@selectivetrading.com>');
    });

    it('should contain proper HTML structure', async () => {
      await sendVerificationEmail('user@example.com', '1234', 'Test User');

      const mailOptions = mockSendMail.mock.calls[0][0];
      const html = mailOptions.html;

      // Check for HTML doctype and structure
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<html>');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      
      // Check for meta tags
      expect(html).toContain('<meta charset="utf-8">');
      expect(html).toContain('<meta name="viewport"');
      
      // Check for CSS styling
      expect(html).toContain('<style>');
      expect(html).toContain('font-family: Arial');
      
      // Check for logo and branding
      expect(html).toContain('ST'); // Logo text
      expect(html).toContain('Selective Trading');
      expect(html).toContain('Premium Milk Products');
    });

    it('should contain security message about code expiration', async () => {
      await sendVerificationEmail('user@example.com', '1234', 'Test User');

      const mailOptions = mockSendMail.mock.calls[0][0];
      
      expect(mailOptions.html).toContain('expire in <strong>30 minutes</strong>');
      expect(mailOptions.html).toContain('If you didn\'t request this code');
      expect(mailOptions.text).toContain('expire in 30 minutes');
      expect(mailOptions.text).toContain('If you didn\'t request this code');
    });
  });

  describe('Fallback Transport Logging', () => {
    beforeEach(() => {
      // Configure for fallback transport
      delete process.env.EMAIL_USER;
      delete process.env.APP_PASSWORD;
      
      // Mock fallback transport response
      mockSendMail.mockResolvedValue({
        envelope: { from: 'no-reply@selectivetrading.com', to: ['user@example.com'] },
        messageId: 'fallback-message-id',
        message: 'test message'
      });
    });

    it('should log fallback transport output', async () => {
      await sendVerificationEmail('user@example.com', '1234', 'Test User');

      expect(console.info).toHaveBeenCalledWith(
        '[Email] Fallback transport output:',
        expect.stringContaining('envelope')
      );
    });

    it('should handle string response from fallback transport', async () => {
      mockSendMail.mockResolvedValue('string response');

      await sendVerificationEmail('user@example.com', '1234', 'Test User');

      expect(console.info).toHaveBeenCalledWith(
        '[Email] Fallback transport output:',
        'string response'
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.EMAIL_USER = 'test@gmail.com';
      process.env.APP_PASSWORD = 'test-password';
    });

    it('should propagate email sending errors', async () => {
      const error = new Error('SMTP connection failed');
      mockSendMail.mockRejectedValue(error);

      await expect(
        sendVerificationEmail('user@example.com', '1234', 'Test User')
      ).rejects.toThrow('SMTP connection failed');
    });

    it('should handle transport creation errors', async () => {
      mockCreateTransport.mockImplementation(() => {
        throw new Error('Transport creation failed');
      });

      await expect(
        sendVerificationEmail('user@example.com', '1234', 'Test User')
      ).rejects.toThrow('Transport creation failed');
    });

    it('should handle invalid email addresses gracefully', async () => {
      // This would depend on the transporter's validation
      await expect(
        sendVerificationEmail('invalid-email', '1234', 'Test User')
      ).resolves.not.toThrow();

      expect(mockSendMail).toHaveBeenCalled();
    });
  });

  describe('Email Content Validation', () => {
    beforeEach(() => {
      process.env.EMAIL_USER = 'test@gmail.com';
      process.env.APP_PASSWORD = 'test-password';
    });

    it('should handle special characters in user name', async () => {
      const nameWithSpecialChars = 'José María Ñoño';
      
      await sendVerificationEmail('user@example.com', '1234', nameWithSpecialChars);

      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain(nameWithSpecialChars);
      expect(mailOptions.text).toContain(nameWithSpecialChars);
    });

    it('should handle Arabic characters in user name', async () => {
      const arabicName = 'محمد أحمد';
      
      await sendVerificationEmail('user@example.com', '1234', arabicName);

      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain(arabicName);
      expect(mailOptions.text).toContain(arabicName);
    });

    it('should handle empty user name', async () => {
      await sendVerificationEmail('user@example.com', '1234', '');

      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain('Hello !');
      expect(mailOptions.text).toContain('Hello !');
    });

    it('should format verification code with proper styling', async () => {
      const code = '1234';
      
      await sendVerificationEmail('user@example.com', code, 'Test User');

      const mailOptions = mockSendMail.mock.calls[0][0];
      const html = mailOptions.html;
      
      // Check for code styling
      expect(html).toContain('<div class="code">1234</div>');
      expect(html).toContain('font-size: 48px');
      expect(html).toContain('letter-spacing: 10px');
    });
  });

  describe('Email Template Structure', () => {
    beforeEach(() => {
      process.env.EMAIL_USER = 'test@gmail.com';
      process.env.APP_PASSWORD = 'test-password';
    });

    it('should have responsive design meta tag', async () => {
      await sendVerificationEmail('user@example.com', '1234', 'Test User');

      const mailOptions = mockSendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">'
      );
    });

    it('should have proper CSS container styling', async () => {
      await sendVerificationEmail('user@example.com', '1234', 'Test User');

      const mailOptions = mockSendMail.mock.calls[0][0];
      const html = mailOptions.html;
      
      expect(html).toContain('max-width: 600px');
      expect(html).toContain('background: linear-gradient');
      expect(html).toContain('border-radius: 10px');
    });

    it('should include both HTML and text versions', async () => {
      await sendVerificationEmail('user@example.com', '1234', 'Test User');

      const mailOptions = mockSendMail.mock.calls[0][0];
      
      expect(mailOptions.html).toBeDefined();
      expect(mailOptions.text).toBeDefined();
      expect(mailOptions.html).not.toBe(mailOptions.text);
    });
  });
});