import mongoose from 'mongoose';
import { ServerApiVersion } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/selective-trading';
const ALLOW_INSECURE_TLS = process.env.ALLOW_INSECURE_TLS === 'true';

console.log('[MongoDB] Connection details:', {
  hasURI: !!MONGODB_URI,
  uriPrefix: MONGODB_URI?.substring(0, 30),
  environment: process.env.NODE_ENV,
  uriLength: MONGODB_URI?.length,
});

if (!MONGODB_URI) {
  console.error('[MongoDB] ❌ CRITICAL: MONGODB_URI is not defined!');
  console.error('[MongoDB] Available env vars:', Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('mongo')));
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 15000,
      tls: true,
      ...(ALLOW_INSECURE_TLS && { tlsAllowInvalidCertificates: true }),
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log('✅ MongoDB Atlas Connected Successfully');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ MongoDB Connection Error:', e);
    throw e;
  }

  return cached.conn;
}

export default connectDB;