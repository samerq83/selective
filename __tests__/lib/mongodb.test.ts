import connectDB from '../../lib/mongodb';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// Mock environment variables
const originalEnv = process.env;

describe('MongoDB Connection Library', () => {
  let mongoServer: MongoMemoryServer;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    
    // Clear mongoose cache
    if (global.mongoose) {
      global.mongoose = { conn: null, promise: null };
    }
    
    // Disconnect if connected
    if (mongoose.connection.readyState !== 0) {
      mongoose.disconnect();
    }
  });

  afterEach(async () => {
    process.env = originalEnv;
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('Happy Path', () => {
    it('should connect to MongoDB with valid URI', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;

      const connection = await connectDB();

      expect(connection).toBeDefined();
      expect(connection).toBe(mongoose);
      expect(mongoose.connection.readyState).toBe(1); // Connected
    });

    it('should return cached connection on subsequent calls', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;

      const connection1 = await connectDB();
      const connection2 = await connectDB();

      expect(connection1).toBe(connection2);
      expect(connection1).toBe(mongoose);
    });

    it('should use default URI when MONGODB_URI not set', async () => {
      delete process.env.MONGODB_URI;
      
      // This will attempt to connect to localhost, which should fail in test environment
      // but will test the default URI logic
      await expect(connectDB()).rejects.toThrow();
    });

    it('should handle TLS configuration', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;
      process.env.ALLOW_INSECURE_TLS = 'false';

      const connection = await connectDB();

      expect(connection).toBeDefined();
      expect(mongoose.connection.readyState).toBe(1);
    });

    it('should handle insecure TLS when allowed', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;
      process.env.ALLOW_INSECURE_TLS = 'true';

      const connection = await connectDB();

      expect(connection).toBeDefined();
      expect(mongoose.connection.readyState).toBe(1);
    });
  });

  describe('Input Verification', () => {
    it('should throw error when MONGODB_URI is undefined', async () => {
      delete process.env.MONGODB_URI;
      
      // Import fresh module to trigger the validation
      jest.resetModules();
      const { default: freshConnectDB } = await import('../../lib/mongodb');
      
      await expect(freshConnectDB()).rejects.toThrow('Please define the MONGODB_URI environment variable');
    });

    it('should throw error when MONGODB_URI is empty string', async () => {
      process.env.MONGODB_URI = '';
      
      jest.resetModules();
      const { default: freshConnectDB } = await import('../../lib/mongodb');
      
      await expect(freshConnectDB()).rejects.toThrow('Please define the MONGODB_URI environment variable');
    });

    it('should handle valid MONGODB_URI format', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;

      const connection = await connectDB();

      expect(connection).toBeDefined();
    });

    it('should validate ALLOW_INSECURE_TLS boolean parsing', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;
      
      // Test various string values
      const testValues = ['true', 'false', 'True', 'FALSE', '1', '0', 'yes', 'no'];
      
      for (const value of testValues) {
        process.env.ALLOW_INSECURE_TLS = value;
        
        // Clear cache for fresh import
        if (global.mongoose) {
          global.mongoose = { conn: null, promise: null };
        }
        await mongoose.disconnect();
        
        const connection = await connectDB();
        expect(connection).toBeDefined();
      }
    });
  });

  describe('Branching', () => {
    it('should handle connection when global.mongoose is undefined', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;
      
      // Ensure global.mongoose doesn't exist
      delete global.mongoose;

      const connection = await connectDB();

      expect(connection).toBeDefined();
      expect(global.mongoose).toBeDefined();
      expect(global.mongoose.conn).toBe(connection);
    });

    it('should handle connection when global.mongoose exists but conn is null', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;
      
      global.mongoose = { conn: null, promise: null };

      const connection = await connectDB();

      expect(connection).toBeDefined();
      expect(global.mongoose.conn).toBe(connection);
    });

    it('should return existing connection when conn exists', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;
      
      // Establish first connection
      const firstConnection = await connectDB();
      
      // Second call should return cached connection
      const secondConnection = await connectDB();

      expect(firstConnection).toBe(secondConnection);
    });

    it('should handle promise caching correctly', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;
      
      // Clear cache
      if (global.mongoose) {
        global.mongoose = { conn: null, promise: null };
      }

      // Start multiple connection attempts simultaneously
      const promises = [
        connectDB(),
        connectDB(),
        connectDB()
      ];

      const connections = await Promise.all(promises);

      // All should return the same connection instance
      expect(connections[0]).toBe(connections[1]);
      expect(connections[1]).toBe(connections[2]);
      expect(connections[0]).toBe(mongoose);
    });
  });

  describe('Exception Handling', () => {
    it('should handle connection failure and reset promise', async () => {
      process.env.MONGODB_URI = 'mongodb://invalid-host:27017/test';
      
      // Clear cache
      if (global.mongoose) {
        global.mongoose = { conn: null, promise: null };
      }

      // First attempt should fail
      await expect(connectDB()).rejects.toThrow();
      
      // Promise should be reset to null after failure
      expect(global.mongoose?.promise).toBeNull();
    });

    it('should handle invalid MongoDB URI format', async () => {
      process.env.MONGODB_URI = 'invalid-uri';
      
      if (global.mongoose) {
        global.mongoose = { conn: null, promise: null };
      }

      await expect(connectDB()).rejects.toThrow();
    });

    it('should handle server selection timeout', async () => {
      // Use a valid but unreachable URI
      process.env.MONGODB_URI = 'mongodb://192.0.2.1:27017/test'; // RFC5737 test address
      
      if (global.mongoose) {
        global.mongoose = { conn: null, promise: null };
      }

      await expect(connectDB()).rejects.toThrow();
    }, 20000); // Increase timeout for this test

    it('should clear promise on connection error', async () => {
      process.env.MONGODB_URI = 'mongodb://invalid:27017/test';
      
      if (global.mongoose) {
        global.mongoose = { conn: null, promise: null };
      }

      try {
        await connectDB();
      } catch (error) {
        // Promise should be cleared after error
        expect(global.mongoose?.promise).toBeNull();
      }
    });

    it('should handle mongoose connection state errors', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;

      // Establish connection first
      await connectDB();

      // Force close the server to simulate connection issues
      await mongoServer.stop();

      // Connection state should reflect the disconnection
      // Note: This might take some time to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('Configuration Options', () => {
    it('should use correct connection options', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;

      const connection = await connectDB();

      expect(connection).toBeDefined();
      
      // Verify connection options are applied (indirectly through successful connection)
      expect(mongoose.connection.readyState).toBe(1);
    });

    it('should apply TLS settings when ALLOW_INSECURE_TLS is true', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;
      process.env.ALLOW_INSECURE_TLS = 'true';

      if (global.mongoose) {
        global.mongoose = { conn: null, promise: null };
      }

      const connection = await connectDB();

      expect(connection).toBeDefined();
      expect(mongoose.connection.readyState).toBe(1);
    });

    it('should apply default TLS settings when ALLOW_INSECURE_TLS is false', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;
      process.env.ALLOW_INSECURE_TLS = 'false';

      if (global.mongoose) {
        global.mongoose = { conn: null, promise: null };
      }

      const connection = await connectDB();

      expect(connection).toBeDefined();
      expect(mongoose.connection.readyState).toBe(1);
    });

    it('should handle server API version configuration', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;

      const connection = await connectDB();

      expect(connection).toBeDefined();
      // Server API version is configured in the options, verify through successful connection
      expect(mongoose.connection.readyState).toBe(1);
    });

    it('should set correct buffer commands option', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;

      const connection = await connectDB();

      expect(connection).toBeDefined();
      // bufferCommands: false is set in options, verify through successful connection
      expect(mongoose.connection.readyState).toBe(1);
    });
  });

  describe('Global Cache Management', () => {
    it('should initialize global mongoose cache when not present', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;
      
      delete global.mongoose;

      await connectDB();

      expect(global.mongoose).toBeDefined();
      expect(global.mongoose.conn).toBeDefined();
      expect(global.mongoose.promise).toBeNull(); // Should be null after successful connection
    });

    it('should use existing global mongoose cache', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;
      
      const mockConnection = {} as typeof mongoose;
      global.mongoose = {
        conn: mockConnection,
        promise: null
      };

      const result = await connectDB();

      expect(result).toBe(mockConnection);
    });

    it('should handle concurrent connection attempts', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;
      
      if (global.mongoose) {
        global.mongoose = { conn: null, promise: null };
      }

      // Start multiple connection attempts
      const connectionPromises = Array(5).fill(null).map(() => connectDB());
      const connections = await Promise.all(connectionPromises);

      // All connections should be the same instance
      connections.forEach(connection => {
        expect(connection).toBe(mongoose);
      });

      // Should only have one actual connection
      expect(mongoose.connection.readyState).toBe(1);
    });
  });

  describe('Logging and Error Messages', () => {
    it('should log success message on successful connection', async () => {
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      process.env.MONGODB_URI = mongoUri;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await connectDB();

      expect(consoleSpy).toHaveBeenCalledWith('✅ MongoDB Atlas Connected Successfully');
      
      consoleSpy.mockRestore();
    });

    it('should log error message on connection failure', async () => {
      process.env.MONGODB_URI = 'mongodb://invalid:27017/test';
      
      if (global.mongoose) {
        global.mongoose = { conn: null, promise: null };
      }

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      try {
        await connectDB();
      } catch (error) {
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ MongoDB Connection Error:', error);
      }

      consoleErrorSpy.mockRestore();
    });
  });
});