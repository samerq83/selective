const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://mr000000_db_user:zohwlq0wOWpwihaK@cluster0.wv2o5h4.mongodb.net/selective-trading';

const userSchema = new mongoose.Schema(
  {
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
    companyName: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const adminPhone = '97654369';
    const adminEmail = 'samer.q81@gmail.com';
    const adminName = 'Samer Admin';

    const existingAdmin = await User.findOne({ phone: adminPhone });
    
    if (existingAdmin) {
      console.log('⚠️ Admin already exists:');
      console.log('   Phone:', existingAdmin.phone);
      console.log('   Email:', existingAdmin.email);
      console.log('   Is Admin:', existingAdmin.isAdmin);
      process.exit(0);
    }

    const admin = new User({
      phone: adminPhone,
      email: adminEmail.toLowerCase(),
      name: adminName,
      isAdmin: true,
      isActive: true,
    });

    await admin.save();
    console.log('✅ Admin created successfully:');
    console.log('   Phone:', adminPhone);
    console.log('   Email:', adminEmail);
    console.log('   Name:', adminName);
    console.log('   Is Admin: true');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
}

createAdmin();