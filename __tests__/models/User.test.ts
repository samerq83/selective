import mongoose from 'mongoose';
import User, { IUser } from '@/models/User';
import { setupTestDB, teardownTestDB, clearDatabase, mockUser, mockAdminUser } from '../test-utils';

describe('User Model', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('User Creation', () => {
    it('should create a valid user successfully', async () => {
      const userData = { ...mockUser };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.phone).toBe(userData.phone);
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.companyName).toBe(userData.companyName);
      expect(savedUser.email).toBe(userData.email);
      expect(savedUser.address).toBe(userData.address);
      expect(savedUser.isAdmin).toBe(false);
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.createdAt).toBeDefined();
      expect(savedUser.updatedAt).toBeDefined();
    });

    it('should create an admin user successfully', async () => {
      const adminData = { ...mockAdminUser };
      const user = new User(adminData);
      const savedUser = await user.save();

      expect(savedUser.isAdmin).toBe(true);
      expect(savedUser.phone).toBe(adminData.phone);
    });

    it('should require phone number', async () => {
      const userData = { ...mockUser };
      delete userData.phone;
      
      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow('phone: Path `phone` is required');
    });

    it('should enforce unique phone number', async () => {
      const userData = { ...mockUser };
      
      // Create first user
      const user1 = new User(userData);
      await user1.save();

      // Try to create second user with same phone
      const user2 = new User(userData);
      await expect(user2.save()).rejects.toThrow();
    });

    it('should trim phone number', async () => {
      const userData = { ...mockUser, phone: '  1234567890  ' };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.phone).toBe('1234567890');
    });

    it('should lowercase email', async () => {
      const userData = { ...mockUser, email: 'TEST@EXAMPLE.COM' };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test@example.com');
    });

    it('should set default values correctly', async () => {
      const minimalUser = { phone: '9999999999' };
      const user = new User(minimalUser);
      const savedUser = await user.save();

      expect(savedUser.isAdmin).toBe(false);
      expect(savedUser.isActive).toBe(true);
      expect(savedUser.lastLogin).toBeUndefined();
    });
  });

  describe('User Validation', () => {
    it('should allow empty optional fields', async () => {
      const userData = {
        phone: '5555555555',
        isAdmin: false,
        isActive: true,
      };
      
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser).toBeDefined();
      expect(savedUser.phone).toBe(userData.phone);
    });

    it('should trim all string fields', async () => {
      const userData = {
        phone: '  6666666666  ',
        name: '  Test User  ',
        companyName: '  Test Company  ',
        email: '  test@example.com  ',
        address: '  Test Address  ',
      };
      
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.phone).toBe('6666666666');
      expect(savedUser.name).toBe('Test User');
      expect(savedUser.companyName).toBe('Test Company');
      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.address).toBe('Test Address');
    });
  });

  describe('User Indexes', () => {
    it('should have indexes defined', async () => {
      const indexes = await User.collection.getIndexes();
      
      // Check if indexes exist
      expect(indexes).toMatchObject({
        '_id_': expect.any(Array),
        'phone_1': expect.any(Array),
      });
    });
  });

  describe('User Methods', () => {
    it('should update lastLogin field', async () => {
      const userData = { ...mockUser };
      const user = new User(userData);
      const savedUser = await user.save();

      const loginDate = new Date();
      savedUser.lastLogin = loginDate;
      const updatedUser = await savedUser.save();

      expect(updatedUser.lastLogin).toBeDefined();
      expect(updatedUser.lastLogin?.getTime()).toBe(loginDate.getTime());
    });

    it('should update user status', async () => {
      const userData = { ...mockUser };
      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.isActive).toBe(true);

      savedUser.isActive = false;
      const updatedUser = await savedUser.save();

      expect(updatedUser.isActive).toBe(false);
    });
  });

  describe('User Query Operations', () => {
    beforeEach(async () => {
      // Create test users
      await User.create({ ...mockUser, phone: '1111111111' });
      await User.create({ ...mockAdminUser, phone: '2222222222' });
      await User.create({ 
        ...mockUser, 
        phone: '3333333333', 
        isActive: false 
      });
    });

    it('should find users by phone', async () => {
      const user = await User.findOne({ phone: '1111111111' });
      expect(user).toBeDefined();
      expect(user?.phone).toBe('1111111111');
    });

    it('should find admin users', async () => {
      const admins = await User.find({ isAdmin: true });
      expect(admins).toHaveLength(1);
      expect(admins[0].phone).toBe('2222222222');
    });

    it('should find active users', async () => {
      const activeUsers = await User.find({ isActive: true });
      expect(activeUsers.length).toBeGreaterThan(0);
      activeUsers.forEach(user => {
        expect(user.isActive).toBe(true);
      });
    });

    it('should count total users', async () => {
      const count = await User.countDocuments();
      expect(count).toBe(3);
    });

    it('should find users with pagination', async () => {
      const limit = 2;
      const skip = 1;
      
      const users = await User.find().limit(limit).skip(skip).sort({ createdAt: 1 });
      expect(users).toHaveLength(limit);
    });
  });
});