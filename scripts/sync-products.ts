import mongoose from 'mongoose';
import Product from '../models/Product';
import * as fs from 'fs';
import * as path from 'path';

async function syncProducts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined');
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Read products from db.json
    const dbPath = path.join(process.cwd(), 'data', 'db.json');
    const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    const products = dbData.products || [];

    console.log(`Found ${products.length} products in db.json`);

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Insert products
    const insertedProducts = await Product.insertMany(
      products.map((p: any) => ({
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

    console.log(`✅ Successfully synced ${insertedProducts.length} products to MongoDB`);
    
    // List all synced products
    console.log('\nSynced products:');
    insertedProducts.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name.en} (${p.slug}) - ${p.image}`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error syncing products:', error);
    process.exit(1);
  }
}

syncProducts();