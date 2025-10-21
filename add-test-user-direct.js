const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://mr000000_db_user:zohwlq0wOWpwihaK@cluster0.wv2o5h4.mongodb.net/selective-trading?retryWrites=true&w=majority&appName=Cluster0';

// Define User Schema
const userSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  email: String,
  companyName: String,
  name: String,
  address: String,
  isAdmin: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function addTestUser() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(MONGODB_URI, {
      tls: true,
      serverSelectionTimeoutMS: 15000,
    });
    
    console.log('✅ Connected to MongoDB');

    // Check if user exists
    const existingUser = await User.findOne({ phone: '90908041' });
    
    if (existingUser) {
      console.log('⚠️ User 90908041 already exists');
      console.log(existingUser);
    } else {
      // Create new user
      const newUser = await User.create({
        phone: '90908041',
        email: 'test@example.com',
        companyName: 'CLAY',
        name: 'ALAA',
        address: 'Kuwait',
        isAdmin: false,
        isActive: true,
      });
      
      console.log('✅ Test user created successfully:');
      console.log(newUser);
    }

    await mongoose.connection.close();
    console.log('✅ Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addTestUser();