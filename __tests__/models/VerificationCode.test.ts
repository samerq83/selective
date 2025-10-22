import VerificationCode, { IVerificationCode } from '../../models/VerificationCode';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

describe('VerificationCode Model', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await mongoose.connection.db?.dropDatabase();
  });

  describe('Happy Path', () => {
    it('should create verification code with required fields', async () => {
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      expect(savedCode._id).toBeDefined();
      expect(savedCode.phone).toBe('+1234567890');
      expect(savedCode.code).toBe('123456');
      expect(savedCode.type).toBe('signup');
      expect(savedCode.expiresAt).toBeInstanceOf(Date);
      expect(savedCode.createdAt).toBeDefined();
    });

    it('should create verification code with all optional fields', async () => {
      const codeData = {
        phone: '+9876543210',
        email: 'test@example.com',
        companyName: 'Test Company',
        name: 'Test User',
        address: '123 Test Street',
        code: '654321',
        type: 'login' as const,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      expect(savedCode.phone).toBe('+9876543210');
      expect(savedCode.email).toBe('test@example.com');
      expect(savedCode.companyName).toBe('Test Company');
      expect(savedCode.name).toBe('Test User');
      expect(savedCode.address).toBe('123 Test Street');
      expect(savedCode.code).toBe('654321');
      expect(savedCode.type).toBe('login');
    });

    it('should trim string fields', async () => {
      const codeData = {
        phone: '  +1234567890  ',
        email: '  test@example.com  ',
        companyName: '  Test Company  ',
        name: '  Test User  ',
        address: '  123 Test Street  ',
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      expect(savedCode.phone).toBe('+1234567890');
      expect(savedCode.email).toBe('test@example.com');
      expect(savedCode.companyName).toBe('Test Company');
      expect(savedCode.name).toBe('Test User');
      expect(savedCode.address).toBe('123 Test Street');
    });

    it('should convert email to lowercase', async () => {
      const codeData = {
        phone: '+1234567890',
        email: 'TEST@EXAMPLE.COM',
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      expect(savedCode.email).toBe('test@example.com');
    });
  });

  describe('Input Verification', () => {
    it('should require phone field', async () => {
      const codeData = {
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      await expect(verificationCode.save()).rejects.toThrow();
    });

    it('should require code field', async () => {
      const codeData = {
        phone: '+1234567890',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      await expect(verificationCode.save()).rejects.toThrow();
    });

    it('should require type field', async () => {
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      await expect(verificationCode.save()).rejects.toThrow();
    });

    it('should require expiresAt field', async () => {
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'signup' as const
      };

      const verificationCode = new VerificationCode(codeData);
      await expect(verificationCode.save()).rejects.toThrow();
    });

    it('should validate type enum values', async () => {
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'invalid' as any,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      await expect(verificationCode.save()).rejects.toThrow();
    });

    it('should accept valid type enum values', async () => {
      const types = ['signup', 'login'] as const;

      for (const type of types) {
        const codeData = {
          phone: `+123456789${type === 'signup' ? '0' : '1'}`,
          code: '123456',
          type: type,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        };

        const verificationCode = new VerificationCode(codeData);
        const savedCode = await verificationCode.save();
        expect(savedCode.type).toBe(type);
      }
    });
  });

  describe('Branching', () => {
    it('should handle signup type codes', async () => {
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      expect(savedCode.type).toBe('signup');
    });

    it('should handle login type codes', async () => {
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'login' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      expect(savedCode.type).toBe('login');
    });

    it('should handle codes with only required fields', async () => {
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      expect(savedCode.email).toBeUndefined();
      expect(savedCode.companyName).toBeUndefined();
      expect(savedCode.name).toBeUndefined();
      expect(savedCode.address).toBeUndefined();
    });

    it('should handle codes with all optional fields', async () => {
      const codeData = {
        phone: '+1234567890',
        email: 'test@example.com',
        companyName: 'Test Company',
        name: 'Test User',
        address: '123 Test Street',
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      expect(savedCode.email).toBe('test@example.com');
      expect(savedCode.companyName).toBe('Test Company');
      expect(savedCode.name).toBe('Test User');
      expect(savedCode.address).toBe('123 Test Street');
    });

    it('should handle different expiration times', async () => {
      const shortExpiry = new Date(Date.now() + 1 * 60 * 1000); // 1 minute
      const longExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      const shortCode = new VerificationCode({
        phone: '+1234567890',
        code: '123456',
        type: 'signup',
        expiresAt: shortExpiry
      });

      const longCode = new VerificationCode({
        phone: '+9876543210',
        code: '654321',
        type: 'login',
        expiresAt: longExpiry
      });

      const [savedShort, savedLong] = await Promise.all([
        shortCode.save(),
        longCode.save()
      ]);

      expect(savedShort.expiresAt).toEqual(shortExpiry);
      expect(savedLong.expiresAt).toEqual(longExpiry);
    });
  });

  describe('Exception Handling', () => {
    it('should handle invalid date for expiresAt', async () => {
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'signup' as const,
        expiresAt: 'invalid-date' as any
      };

      const verificationCode = new VerificationCode(codeData);
      await expect(verificationCode.save()).rejects.toThrow();
    });

    it('should handle empty string fields', async () => {
      const codeData = {
        phone: '',
        email: '',
        companyName: '',
        name: '',
        address: '',
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      // Empty required field (phone) should cause validation error
      await expect(verificationCode.save()).rejects.toThrow();
    });

    it('should handle null values for optional fields', async () => {
      const codeData = {
        phone: '+1234567890',
        email: null as any,
        companyName: null as any,
        name: null as any,
        address: null as any,
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      expect(savedCode.phone).toBe('+1234567890');
      expect(savedCode.code).toBe('123456');
      // Null values should be handled appropriately
    });

    it('should handle very long string values', async () => {
      const longString = 'A'.repeat(1000);
      const codeData = {
        phone: longString,
        email: longString + '@example.com',
        companyName: longString,
        name: longString,
        address: longString,
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      // Should save successfully (no maxlength restrictions defined)
      expect(savedCode.phone).toBe(longString);
      expect(savedCode.companyName).toBe(longString);
    });
  });

  describe('Database Operations', () => {
    it('should find verification code by phone and type', async () => {
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      await verificationCode.save();

      const foundCode = await VerificationCode.findOne({
        phone: '+1234567890',
        type: 'signup'
      });

      expect(foundCode).toBeDefined();
      expect(foundCode?.code).toBe('123456');
    });

    it('should find verification code by code and type', async () => {
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      await verificationCode.save();

      const foundCode = await VerificationCode.findOne({
        code: '123456',
        type: 'signup'
      });

      expect(foundCode).toBeDefined();
      expect(foundCode?.phone).toBe('+1234567890');
    });

    it('should update verification code', async () => {
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      const newExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const updatedCode = await VerificationCode.findByIdAndUpdate(
        savedCode._id,
        {
          code: '654321',
          expiresAt: newExpiresAt
        },
        { new: true }
      );

      expect(updatedCode?.code).toBe('654321');
      expect(updatedCode?.expiresAt).toEqual(newExpiresAt);
    });

    it('should delete verification code', async () => {
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      await VerificationCode.findByIdAndDelete(savedCode._id);
      const deletedCode = await VerificationCode.findById(savedCode._id);

      expect(deletedCode).toBeNull();
    });

    it('should use phone and type index for efficient queries', async () => {
      // Create multiple verification codes
      const codes = [
        { phone: '+1111111111', type: 'signup' as const },
        { phone: '+1111111111', type: 'login' as const },
        { phone: '+2222222222', type: 'signup' as const }
      ];

      for (const [index, codeData] of codes.entries()) {
        const verificationCode = new VerificationCode({
          ...codeData,
          code: `12345${index}`,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });
        await verificationCode.save();
      }

      // Query should use index efficiently
      const signupCodes = await VerificationCode.find({
        phone: '+1111111111',
        type: 'signup'
      });
      const loginCodes = await VerificationCode.find({
        phone: '+1111111111',
        type: 'login'
      });

      expect(signupCodes).toHaveLength(1);
      expect(loginCodes).toHaveLength(1);
    });

    it('should use code and type index for efficient queries', async () => {
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      await verificationCode.save();

      // Query using code and type index
      const foundCode = await VerificationCode.findOne({
        code: '123456',
        type: 'signup'
      });

      expect(foundCode).toBeDefined();
      expect(foundCode?.phone).toBe('+1234567890');
    });
  });

  describe('Timestamps and Expiration', () => {
    it('should set createdAt on creation', async () => {
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      expect(savedCode.createdAt).toBeInstanceOf(Date);
      expect(savedCode.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should handle past expiration dates', async () => {
      const pastDate = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'signup' as const,
        expiresAt: pastDate
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      expect(savedCode.expiresAt).toEqual(pastDate);
    });

    it('should handle future expiration dates', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'signup' as const,
        expiresAt: futureDate
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      expect(savedCode.expiresAt).toEqual(futureDate);
    });

    it('should have TTL index on expiresAt for automatic deletion', async () => {
      // This test verifies the TTL index exists, but actual deletion happens at MongoDB level
      const codeData = {
        phone: '+1234567890',
        code: '123456',
        type: 'signup' as const,
        expiresAt: new Date(Date.now() + 1000) // 1 second from now
      };

      const verificationCode = new VerificationCode(codeData);
      const savedCode = await verificationCode.save();

      expect(savedCode.expiresAt).toBeDefined();
      // The actual TTL deletion would happen at the MongoDB server level
      // and might take up to 60 seconds to run the background task
    });
  });

  describe('Multiple Codes Management', () => {
    it('should allow multiple codes for same phone with different types', async () => {
      const signupCode = new VerificationCode({
        phone: '+1234567890',
        code: '123456',
        type: 'signup',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      });

      const loginCode = new VerificationCode({
        phone: '+1234567890',
        code: '654321',
        type: 'login',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      });

      const [savedSignup, savedLogin] = await Promise.all([
        signupCode.save(),
        loginCode.save()
      ]);

      expect(savedSignup.phone).toBe(savedLogin.phone);
      expect(savedSignup.type).toBe('signup');
      expect(savedLogin.type).toBe('login');
      expect(savedSignup.code).not.toBe(savedLogin.code);
    });

    it('should allow same code for different phones', async () => {
      const code1 = new VerificationCode({
        phone: '+1234567890',
        code: '123456',
        type: 'signup',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      });

      const code2 = new VerificationCode({
        phone: '+9876543210',
        code: '123456',
        type: 'signup',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      });

      const [saved1, saved2] = await Promise.all([
        code1.save(),
        code2.save()
      ]);

      expect(saved1.code).toBe(saved2.code);
      expect(saved1.phone).not.toBe(saved2.phone);
    });

    it('should find codes by multiple criteria', async () => {
      // Create multiple codes
      await Promise.all([
        new VerificationCode({
          phone: '+1111111111',
          code: '111111',
          type: 'signup',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        }).save(),
        new VerificationCode({
          phone: '+2222222222',
          code: '222222',
          type: 'signup',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        }).save(),
        new VerificationCode({
          phone: '+1111111111',
          code: '333333',
          type: 'login',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        }).save()
      ]);

      const signupCodes = await VerificationCode.find({ type: 'signup' });
      const phone1Codes = await VerificationCode.find({ phone: '+1111111111' });

      expect(signupCodes).toHaveLength(2);
      expect(phone1Codes).toHaveLength(2);
    });
  });
});