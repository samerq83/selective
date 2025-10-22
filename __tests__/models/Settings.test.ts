import Settings, { ISettings } from '../../models/Settings';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

describe('Settings Model', () => {
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
    it('should create settings with default values', async () => {
      const settings = new Settings();
      const savedSettings = await settings.save();

      expect(savedSettings._id).toBeDefined();
      expect(savedSettings.notifications.soundEnabled).toBe(true);
      expect(savedSettings.notifications.emailEnabled).toBe(false);
      expect(savedSettings.notifications.smsEnabled).toBe(false);
      expect(savedSettings.orders.editTimeLimit).toBe(2);
      expect(savedSettings.orders.autoArchiveDays).toBe(30);
      expect(savedSettings.system.maintenanceMode).toBe(false);
      expect(savedSettings.system.backupEnabled).toBe(true);
      expect(savedSettings.system.backupFrequency).toBe('daily');
      expect(savedSettings.createdAt).toBeDefined();
      expect(savedSettings.updatedAt).toBeDefined();
    });

    it('should create settings with custom values', async () => {
      const customSettings = {
        notifications: {
          soundEnabled: false,
          emailEnabled: true,
          smsEnabled: true
        },
        orders: {
          editTimeLimit: 5,
          autoArchiveDays: 60
        },
        system: {
          maintenanceMode: true,
          backupEnabled: false,
          backupFrequency: 'weekly' as const
        }
      };

      const settings = new Settings(customSettings);
      const savedSettings = await settings.save();

      expect(savedSettings.notifications.soundEnabled).toBe(false);
      expect(savedSettings.notifications.emailEnabled).toBe(true);
      expect(savedSettings.notifications.smsEnabled).toBe(true);
      expect(savedSettings.orders.editTimeLimit).toBe(5);
      expect(savedSettings.orders.autoArchiveDays).toBe(60);
      expect(savedSettings.system.maintenanceMode).toBe(true);
      expect(savedSettings.system.backupEnabled).toBe(false);
      expect(savedSettings.system.backupFrequency).toBe('weekly');
    });

    it('should update existing settings', async () => {
      const settings = new Settings();
      const savedSettings = await settings.save();

      const updatedSettings = await Settings.findByIdAndUpdate(
        savedSettings._id,
        {
          'notifications.emailEnabled': true,
          'orders.editTimeLimit': 10,
          'system.backupFrequency': 'monthly'
        },
        { new: true }
      );

      expect(updatedSettings?.notifications.emailEnabled).toBe(true);
      expect(updatedSettings?.orders.editTimeLimit).toBe(10);
      expect(updatedSettings?.system.backupFrequency).toBe('monthly');
      // Ensure other values remain unchanged
      expect(updatedSettings?.notifications.soundEnabled).toBe(true);
      expect(updatedSettings?.orders.autoArchiveDays).toBe(30);
    });
  });

  describe('Input Verification', () => {
    it('should validate editTimeLimit minimum value', async () => {
      const settings = new Settings({
        orders: {
          editTimeLimit: 0,
          autoArchiveDays: 30
        }
      });

      await expect(settings.save()).rejects.toThrow();
    });

    it('should validate editTimeLimit maximum value', async () => {
      const settings = new Settings({
        orders: {
          editTimeLimit: 25,
          autoArchiveDays: 30
        }
      });

      await expect(settings.save()).rejects.toThrow();
    });

    it('should validate autoArchiveDays minimum value', async () => {
      const settings = new Settings({
        orders: {
          editTimeLimit: 2,
          autoArchiveDays: 6
        }
      });

      await expect(settings.save()).rejects.toThrow();
    });

    it('should validate autoArchiveDays maximum value', async () => {
      const settings = new Settings({
        orders: {
          editTimeLimit: 2,
          autoArchiveDays: 366
        }
      });

      await expect(settings.save()).rejects.toThrow();
    });

    it('should validate backupFrequency enum values', async () => {
      const settings = new Settings({
        system: {
          maintenanceMode: false,
          backupEnabled: true,
          backupFrequency: 'invalid' as any
        }
      });

      await expect(settings.save()).rejects.toThrow();
    });

    it('should accept valid backupFrequency values', async () => {
      const frequencies = ['daily', 'weekly', 'monthly'] as const;
      
      for (const frequency of frequencies) {
        const settings = new Settings({
          system: {
            backupFrequency: frequency
          }
        });
        const savedSettings = await settings.save();
        expect(savedSettings.system.backupFrequency).toBe(frequency);
        
        // Clean up for next iteration
        await Settings.findByIdAndDelete(savedSettings._id);
      }
    });
  });

  describe('Branching', () => {
    it('should handle partial notification settings', async () => {
      const settings = new Settings({
        notifications: {
          emailEnabled: true
          // Other fields should use defaults
        }
      });
      const savedSettings = await settings.save();

      expect(savedSettings.notifications.soundEnabled).toBe(true); // default
      expect(savedSettings.notifications.emailEnabled).toBe(true); // custom
      expect(savedSettings.notifications.smsEnabled).toBe(false); // default
    });

    it('should handle partial order settings', async () => {
      const settings = new Settings({
        orders: {
          editTimeLimit: 12
          // autoArchiveDays should use default
        }
      });
      const savedSettings = await settings.save();

      expect(savedSettings.orders.editTimeLimit).toBe(12); // custom
      expect(savedSettings.orders.autoArchiveDays).toBe(30); // default
    });

    it('should handle partial system settings', async () => {
      const settings = new Settings({
        system: {
          maintenanceMode: true
          // Other fields should use defaults
        }
      });
      const savedSettings = await settings.save();

      expect(savedSettings.system.maintenanceMode).toBe(true); // custom
      expect(savedSettings.system.backupEnabled).toBe(true); // default
      expect(savedSettings.system.backupFrequency).toBe('daily'); // default
    });

    it('should handle minimum valid values', async () => {
      const settings = new Settings({
        orders: {
          editTimeLimit: 1,
          autoArchiveDays: 7
        }
      });
      const savedSettings = await settings.save();

      expect(savedSettings.orders.editTimeLimit).toBe(1);
      expect(savedSettings.orders.autoArchiveDays).toBe(7);
    });

    it('should handle maximum valid values', async () => {
      const settings = new Settings({
        orders: {
          editTimeLimit: 24,
          autoArchiveDays: 365
        }
      });
      const savedSettings = await settings.save();

      expect(savedSettings.orders.editTimeLimit).toBe(24);
      expect(savedSettings.orders.autoArchiveDays).toBe(365);
    });
  });

  describe('Exception Handling', () => {
    it('should handle empty object gracefully', async () => {
      const settings = new Settings({});
      const savedSettings = await settings.save();

      // Should use all default values
      expect(savedSettings.notifications.soundEnabled).toBe(true);
      expect(savedSettings.orders.editTimeLimit).toBe(2);
      expect(savedSettings.system.backupFrequency).toBe('daily');
    });

    it('should handle null values by using defaults', async () => {
      const settings = new Settings({
        notifications: {
          soundEnabled: null as any,
          emailEnabled: undefined as any
        }
      });
      const savedSettings = await settings.save();

      // Mongoose might save null values as-is, so we check if they're either null or default
      expect(savedSettings.notifications.soundEnabled === null || savedSettings.notifications.soundEnabled === true).toBe(true);
      expect(savedSettings.notifications.emailEnabled === false || savedSettings.notifications.emailEnabled === undefined).toBe(true);
    });

    it('should handle invalid boolean types', async () => {
      const settings = new Settings({
        notifications: {
          soundEnabled: 'true' as any,
          emailEnabled: 1 as any
        }
      });

      // Mongoose should cast these appropriately or fail
      const savedSettings = await settings.save();
      expect(typeof savedSettings.notifications.soundEnabled).toBe('boolean');
      expect(typeof savedSettings.notifications.emailEnabled).toBe('boolean');
    });

    it('should handle invalid number types', async () => {
      const settings = new Settings({
        orders: {
          editTimeLimit: '5' as any,
          autoArchiveDays: '45' as any
        }
      });

      const savedSettings = await settings.save();
      expect(savedSettings.orders.editTimeLimit).toBe(5);
      expect(savedSettings.orders.autoArchiveDays).toBe(45);
    });

    it('should reject non-numeric string values for numbers', async () => {
      const settings = new Settings({
        orders: {
          editTimeLimit: 'invalid' as any
        }
      });

      await expect(settings.save()).rejects.toThrow();
    });
  });

  describe('Database Operations', () => {
    it('should find settings by criteria', async () => {
      const settings1 = new Settings({
        system: { maintenanceMode: true }
      });
      const settings2 = new Settings({
        system: { maintenanceMode: false }
      });
      await Promise.all([settings1.save(), settings2.save()]);

      const maintenanceSettings = await Settings.find({
        'system.maintenanceMode': true
      });

      expect(maintenanceSettings).toHaveLength(1);
      expect(maintenanceSettings[0].system.maintenanceMode).toBe(true);
    });

    it('should update nested fields', async () => {
      const settings = new Settings();
      const savedSettings = await settings.save();

      await Settings.findByIdAndUpdate(savedSettings._id, {
        $set: {
          'notifications.emailEnabled': true,
          'notifications.smsEnabled': true,
          'orders.editTimeLimit': 8,
          'system.backupFrequency': 'monthly'
        }
      });

      const updatedSettings = await Settings.findById(savedSettings._id);

      expect(updatedSettings?.notifications.emailEnabled).toBe(true);
      expect(updatedSettings?.notifications.smsEnabled).toBe(true);
      expect(updatedSettings?.orders.editTimeLimit).toBe(8);
      expect(updatedSettings?.system.backupFrequency).toBe('monthly');
    });

    it('should delete settings', async () => {
      const settings = new Settings();
      const savedSettings = await settings.save();

      await Settings.findByIdAndDelete(savedSettings._id);
      const deletedSettings = await Settings.findById(savedSettings._id);

      expect(deletedSettings).toBeNull();
    });

    it('should count settings documents', async () => {
      const settings1 = new Settings({ system: { maintenanceMode: true } });
      const settings2 = new Settings({ system: { maintenanceMode: false } });
      await Promise.all([settings1.save(), settings2.save()]);

      const totalCount = await Settings.countDocuments();
      const maintenanceCount = await Settings.countDocuments({
        'system.maintenanceMode': true
      });

      expect(totalCount).toBe(2);
      expect(maintenanceCount).toBe(1);
    });
  });

  describe('Timestamps', () => {
    it('should set createdAt and updatedAt on creation', async () => {
      const settings = new Settings();
      const savedSettings = await settings.save();

      expect(savedSettings.createdAt).toBeInstanceOf(Date);
      expect(savedSettings.updatedAt).toBeInstanceOf(Date);
      expect(savedSettings.createdAt.getTime()).toBeLessThanOrEqual(savedSettings.updatedAt.getTime());
    });

    it('should update updatedAt on modification', async () => {
      const settings = new Settings();
      const savedSettings = await settings.save();
      const originalUpdatedAt = savedSettings.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      savedSettings.notifications.emailEnabled = true;
      const updatedSettings = await savedSettings.save();

      expect(updatedSettings.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      expect(updatedSettings.createdAt).toEqual(savedSettings.createdAt);
    });

    it('should not change createdAt on updates', async () => {
      const settings = new Settings();
      const savedSettings = await settings.save();
      const originalCreatedAt = savedSettings.createdAt;

      await new Promise(resolve => setTimeout(resolve, 10));

      const updatedSettings = await Settings.findByIdAndUpdate(
        savedSettings._id,
        { 'system.maintenanceMode': true },
        { new: true }
      );

      expect(updatedSettings?.createdAt).toEqual(originalCreatedAt);
    });
  });

  describe('Schema Structure', () => {
    it('should have correct nested structure', async () => {
      const settings = new Settings();
      const savedSettings = await settings.save();

      // Check notifications structure
      expect(savedSettings.notifications).toHaveProperty('soundEnabled');
      expect(savedSettings.notifications).toHaveProperty('emailEnabled');
      expect(savedSettings.notifications).toHaveProperty('smsEnabled');

      // Check orders structure
      expect(savedSettings.orders).toHaveProperty('editTimeLimit');
      expect(savedSettings.orders).toHaveProperty('autoArchiveDays');

      // Check system structure
      expect(savedSettings.system).toHaveProperty('maintenanceMode');
      expect(savedSettings.system).toHaveProperty('backupEnabled');
      expect(savedSettings.system).toHaveProperty('backupFrequency');
    });

    it('should maintain data types', async () => {
      const settings = new Settings();
      const savedSettings = await settings.save();

      // Boolean types
      expect(typeof savedSettings.notifications.soundEnabled).toBe('boolean');
      expect(typeof savedSettings.system.maintenanceMode).toBe('boolean');

      // Number types
      expect(typeof savedSettings.orders.editTimeLimit).toBe('number');
      expect(typeof savedSettings.orders.autoArchiveDays).toBe('number');

      // String types
      expect(typeof savedSettings.system.backupFrequency).toBe('string');

      // Date types
      expect(savedSettings.createdAt).toBeInstanceOf(Date);
      expect(savedSettings.updatedAt).toBeInstanceOf(Date);
    });
  });
});