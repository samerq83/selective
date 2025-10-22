const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local or .env
let envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  envPath = path.join(process.cwd(), '.env');
}
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const eqIndex = trimmedLine.indexOf('=');
    if (eqIndex !== -1) {
      const key = trimmedLine.substring(0, eqIndex).trim();
      let value = trimmedLine.substring(eqIndex + 1).trim();
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
    }
  }
});

// Define Product model inline
const productSchema = new mongoose.Schema(
  {
    name: {
      en: { type: String, required: true },
      ar: { type: String, required: true },
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    image: {
      type: String,
      required: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

async function syncProducts() {
  try {
    // Connect to MongoDB
    const mongoUri = envVars.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Get Product model
    const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

    // Read products from db.json
    const dbPath = path.join(process.cwd(), 'data', 'db.json');
    console.log(`\nReading products from: ${dbPath}`);
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const products = dbData.products || [];

    console.log(`Found ${products.length} products in db.json`);

    // Clear existing products
    console.log('\nClearing existing products from MongoDB...');
    await Product.deleteMany({});
    console.log('✅ Cleared existing products');

    // Insert products
    console.log('\nInserting products to MongoDB...');
    const insertedProducts = await Product.insertMany(
      products.map((p) => ({
        name: {
          en: p.name.en,
          ar: p.name.ar,
        },
        slug: p.slug,
        image: p.image,
        isAvailable: p.isAvailable ?? true,
        order: p.order ?? 0,
      }))
    );

    console.log(`\n✅ Successfully synced ${insertedProducts.length} products to MongoDB`);
    
    // List all synced products
    console.log('\n📦 Synced products:');
    insertedProducts.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name.en} (${p.slug})`);
      console.log(`     Image: ${p.image}`);
      console.log(`     Available: ${p.isAvailable}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing products:', error.message);
    process.exit(1);
  }
}

syncProducts();