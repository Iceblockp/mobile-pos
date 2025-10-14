// Debug script to test supplier import and relationship resolution
import { DataImportService } from '../services/dataImportService';

// Simple test data that mimics the real export structure
const testImportData = {
  version: '2.0',
  dataType: 'all',
  data: {
    suppliers: [
      {
        id: 'f0a8c490-bbc9-49cb-b4f0-cfc26a3a55f9',
        name: 'Myanmar Fresh Foods',
        contact_name: 'Thant Zin',
        phone: '09-123-456-789',
        email: 'thant@myanmarfresh.com',
        address: 'Yangon, Myanmar',
      },
    ],
    categories: [
      {
        id: '75405065-bcc4-4086-8ebe-eb996c83907d',
        name: 'Personal Care',
        description: 'Personal care products',
      },
    ],
    products: [
      {
        id: '6f0840f4-e46d-41ef-9d95-c3f726112045',
        name: 'Test Product',
        barcode: '8855629000328',
        category_id: '75405065-bcc4-4086-8ebe-eb996c83907d',
        price: 888,
        cost: 555,
        quantity: 0,
        min_stock: 10,
        supplier_id: 'f0a8c490-bbc9-49cb-b4f0-cfc26a3a55f9',
        // Note: No 'supplier' or 'category' display name fields
      },
    ],
  },
};

console.log('🔍 Debug: Testing supplier import with real data structure');
console.log('📊 Test data:');
console.log('- Suppliers:', testImportData.data.suppliers.length);
console.log('- Categories:', testImportData.data.categories.length);
console.log('- Products:', testImportData.data.products.length);

console.log('\n📋 Product data:');
console.log('- Product ID:', testImportData.data.products[0].id);
console.log('- Supplier ID:', testImportData.data.products[0].supplier_id);
console.log('- Category ID:', testImportData.data.products[0].category_id);
console.log(
  '- Has supplier name field:',
  'supplier' in testImportData.data.products[0]
);
console.log(
  '- Has category name field:',
  'category' in testImportData.data.products[0]
);

console.log('\n🔧 This structure should work because:');
console.log('1. Suppliers are imported first');
console.log('2. Categories are imported first');
console.log('3. Products reference existing UUIDs');
console.log('4. resolveSupplierId should find existing supplier by UUID');
console.log('5. resolveCategoryId should find existing category by UUID');

export { testImportData };
