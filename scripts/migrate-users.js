const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

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

async function migrateUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Read db.json
    const dbPath = path.join(__dirname, '../data/db.json');
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const usersFromFile = dbData.users || [];

    console.log(`📋 Found ${usersFromFile.length} users in db.json`);

    let imported = 0;
    let skipped = 0;
    let failed = 0;

    for (const userData of usersFromFile) {
      try {
        // Skip if user already exists in MongoDB
        const existingUser = await User.findOne({ phone: userData.phone });
        
        if (existingUser) {
          console.log(`⏭️  Skipped: ${userData.name} (${userData.phone}) - already in MongoDB`);
          skipped++;
          continue;
        }

        // Create new user
        const newUser = new User({
          phone: userData.phone.toString(),
          email: userData.email ? userData.email.toLowerCase() : '',
          name: userData.name || '',
          companyName: userData.companyName || '',
          address: userData.address || '',
          isAdmin: userData.isAdmin || false,
          isActive: userData.isActive !== false,
          lastLogin: userData.lastLogin ? new Date(userData.lastLogin) : null,
        });

        await newUser.save();
        console.log(`✅ Imported: ${userData.name} (${userData.phone})`);
        imported++;
      } catch (error) {
        console.error(`❌ Failed: ${userData.name} (${userData.phone}) - ${error.message}`);
        failed++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error migrating users:', error.message);
    process.exit(1);
  }
}

migrateUsers();