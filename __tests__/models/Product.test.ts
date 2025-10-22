import mongoose from 'mongoose';
import Product, { IProduct } from '@/models/Product';
import { setupTestDB, teardownTestDB, clearDatabase, mockProduct } from '../test-utils';

describe('Product Model', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  describe('Product Creation', () => {
    it('should create a valid product successfully', async () => {
      const productData = { ...mockProduct };
      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct._id).toBeDefined();
      expect(savedProduct.name.en).toBe(productData.name.en);
      expect(savedProduct.name.ar).toBe(productData.name.ar);
      expect(savedProduct.slug).toBe(productData.slug);
      expect(savedProduct.image).toBe(productData.image);
      expect(savedProduct.isAvailable).toBe(true);
      expect(savedProduct.order).toBe(1);
      expect(savedProduct.createdAt).toBeDefined();
      expect(savedProduct.updatedAt).toBeDefined();
    });

    it('should require English name', async () => {
      const productData = { ...mockProduct };
      delete productData.name.en;
      
      const product = new Product(productData);
      
      await expect(product.save()).rejects.toThrow();
    });

    it('should require Arabic name', async () => {
      const productData = { ...mockProduct };
      delete productData.name.ar;
      
      const product = new Product(productData);
      
      await expect(product.save()).rejects.toThrow();
    });

    it('should require slug', async () => {
      const productData = { ...mockProduct };
      delete productData.slug;
      
      const product = new Product(productData);
      
      await expect(product.save()).rejects.toThrow();
    });

    it('should require image', async () => {
      const productData = { ...mockProduct };
      delete productData.image;
      
      const product = new Product(productData);
      
      await expect(product.save()).rejects.toThrow();
    });

    it('should enforce unique slug', async () => {
      const productData = { ...mockProduct };
      
      // Create first product
      const product1 = new Product(productData);
      await product1.save();

      // Try to create second product with same slug
      const product2 = new Product({
        ...productData,
        name: { en: 'Different Milk', ar: 'حليب مختلف' }
      });
      await expect(product2.save()).rejects.toThrow();
    });

    it('should lowercase slug', async () => {
      const productData = { ...mockProduct, slug: 'TEST-MILK-PRODUCT' };
      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct.slug).toBe('test-milk-product');
    });

    it('should set default values correctly', async () => {
      const productData = {
        name: { en: 'Default Test', ar: 'اختبار افتراضي' },
        slug: 'default-test',
        image: '/default.jpg',
      };
      
      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct.isAvailable).toBe(true);
      expect(savedProduct.order).toBe(0);
    });
  });

  describe('Product Validation', () => {
    it('should validate bilingual names', async () => {
      const productData = {
        name: {
          en: 'Coconut Milk',
          ar: 'حليب جوز الهند',
        },
        slug: 'coconut-milk',
        image: '/coconut.jpg',
      };
      
      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct.name.en).toBe('Coconut Milk');
      expect(savedProduct.name.ar).toBe('حليب جوز الهند');
    });

    it('should handle boolean fields correctly', async () => {
      const productData = { 
        ...mockProduct, 
        isAvailable: false 
      };
      
      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct.isAvailable).toBe(false);
    });

    it('should handle numeric order field', async () => {
      const productData = { 
        ...mockProduct, 
        order: 99 
      };
      
      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct.order).toBe(99);
    });
  });

  describe('Product Indexes', () => {
    it('should have indexes defined', async () => {
      const indexes = await Product.collection.getIndexes();
      
      // Check if indexes exist
      expect(indexes).toMatchObject({
        '_id_': expect.any(Array),
        'slug_1': expect.any(Array),
      });
    });
  });

  describe('Product Methods', () => {
    it('should update product availability', async () => {
      const productData = { ...mockProduct };
      const product = new Product(productData);
      const savedProduct = await product.save();

      expect(savedProduct.isAvailable).toBe(true);

      savedProduct.isAvailable = false;
      const updatedProduct = await savedProduct.save();

      expect(updatedProduct.isAvailable).toBe(false);
    });

    it('should update product order', async () => {
      const productData = { ...mockProduct };
      const product = new Product(productData);
      const savedProduct = await product.save();

      savedProduct.order = 10;
      const updatedProduct = await savedProduct.save();

      expect(updatedProduct.order).toBe(10);
    });

    it('should update product names', async () => {
      const productData = { ...mockProduct };
      const product = new Product(productData);
      const savedProduct = await product.save();

      savedProduct.name = {
        en: 'Updated Milk',
        ar: 'حليب محدث'
      };
      const updatedProduct = await savedProduct.save();

      expect(updatedProduct.name.en).toBe('Updated Milk');
      expect(updatedProduct.name.ar).toBe('حليب محدث');
    });
  });

  describe('Product Query Operations', () => {
    beforeEach(async () => {
      // Create test products
      await Product.create({
        name: { en: 'Almond Milk', ar: 'حليب اللوز' },
        slug: 'almond-milk',
        image: '/almond.jpg',
        isAvailable: true,
        order: 1
      });

      await Product.create({
        name: { en: 'Soy Milk', ar: 'حليب الصويا' },
        slug: 'soy-milk',
        image: '/soy.jpg',
        isAvailable: true,
        order: 2
      });

      await Product.create({
        name: { en: 'Oat Milk', ar: 'حليب الشوفان' },
        slug: 'oat-milk',
        image: '/oat.jpg',
        isAvailable: false,
        order: 3
      });
    });

    it('should find products by slug', async () => {
      const product = await Product.findOne({ slug: 'almond-milk' });
      expect(product).toBeDefined();
      expect(product?.name.en).toBe('Almond Milk');
    });

    it('should find available products only', async () => {
      const availableProducts = await Product.find({ isAvailable: true });
      expect(availableProducts).toHaveLength(2);
      availableProducts.forEach(product => {
        expect(product.isAvailable).toBe(true);
      });
    });

    it('should sort products by order', async () => {
      const products = await Product.find().sort({ order: 1 });
      expect(products).toHaveLength(3);
      expect(products[0].order).toBe(1);
      expect(products[1].order).toBe(2);
      expect(products[2].order).toBe(3);
    });

    it('should count total products', async () => {
      const count = await Product.countDocuments();
      expect(count).toBe(3);
    });

    it('should find products with text search', async () => {
      const products = await Product.find({
        $or: [
          { 'name.en': { $regex: 'Milk', $options: 'i' } },
          { 'name.ar': { $regex: 'حليب', $options: 'i' } }
        ]
      });
      expect(products.length).toBe(3);
    });

    it('should find products with pagination', async () => {
      const limit = 2;
      const skip = 1;
      
      const products = await Product.find().limit(limit).skip(skip).sort({ order: 1 });
      expect(products).toHaveLength(limit);
      expect(products[0].order).toBe(2); // Second product due to skip
    });
  });
});