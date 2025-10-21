const mongoose = require('mongoose');

const mongodbUri = 'mongodb+srv://mr000000_db_user:zohwlq0wOWpwihaK@cluster0.wv2o5h4.mongodb.net/selective-trading?retryWrites=true&w=majority&appName=Cluster0';

// Define User Schema
const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true,
  },
  companyName: String,
  name: String,
  address: String,
  isAdmin: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: Date,
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function addTestUser() {
  try {
    await mongoose.connect(mongodbUri);
    console.log('✅ Connected to MongoDB');

    const testPhone = '90908041';
    
    // Check if user exists
    const existingUser = await User.findOne({ phone: testPhone });
    
    if (existingUser) {
      console.log('ℹ️ Test user already exists');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Create test user
    const testUser = new User({
      phone: testPhone,
      email: 'test@example.com',
      name: 'Test User',
      companyName: 'Test Company',
      address: 'Test Address',
      isAdmin: false,
      isActive: true,
    });

    await testUser.save();
    console.log('✅ Test user created successfully:');
    console.log('   Phone: ' + testPhone);
    console.log('   Email: test@example.com');
    console.log('   Name: Test User');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding test user:', error.message);
    process.exit(1);
  }
}

addTestUser();