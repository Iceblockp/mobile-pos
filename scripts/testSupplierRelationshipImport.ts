import { DataImportService } from '../services/dataImportService';
import { DatabaseService } from '../services/database';
import * as FileSystem from 'expo-file-system';

// Test script to debug supplier relationship import issues
async function testSupplierRelationshipImport() {
  console.log('🔍 Testing Supplier Relationship Import...');

  // Mock database service
  const mockDb = {
    getSuppliers: jest.fn(),
    addSupplier: jest.fn(),
    addProduct: jest.fn(),
    getCategories: jest.fn(),
    addCategory: jest.fn(),
  } as any;

  const dataImportService = new DataImportService(mockDb);

  // Test case 1: Supplier exists by UUID
  console.log('\n📋 Test 1: Supplier exists by UUID');
  mockDb.getSuppliers.mockResolvedValue([
    { id: 'sup-1', name: 'Test Supplier' },
  ]);

  const resolveSupplierId = (dataImportService as any).resolveSupplierId.bind(
    dataImportService
  );
  const result1 = await resolveSupplierId('sup-1', undefined);
  console.log('Result:', result1); // Should be 'sup-1'

  // Test case 2: Supplier doesn't exist by UUID, no name provided
  console.log('\n📋 Test 2: Supplier UUID not found, no name provided');
  const result2 = await resolveSupplierId('sup-nonexistent', undefined);
  console.log('Result:', result2); // Should be null

  // Test case 3: Supplier doesn't exist by UUID, name provided
  console.log('\n📋 Test 3: Supplier UUID not found, name provided');
  mockDb.addSupplier.mockResolvedValue('new-sup-id');
  const result3 = await resolveSupplierId('sup-nonexistent', 'New Supplier');
  console.log('Result:', result3); // Should be 'new-sup-id'

  // Test case 4: No UUID, supplier found by name
  console.log('\n📋 Test 4: No UUID, supplier found by name');
  const result4 = await resolveSupplierId(undefined, 'Test Supplier');
  console.log('Result:', result4); // Should be 'sup-1'

  // Test case 5: Real-world scenario - product with supplier_id but no supplier name
  console.log('\n📋 Test 5: Real-world scenario');
  const productRecord = {
    id: 'prod-1',
    name: 'Test Product',
    supplier_id: 'f0a8c490-bbc9-49cb-b4f0-cfc26a3a55f9',
    // Note: no 'supplier' field (display name)
    category_id: 'cat-1',
    category: 'Electronics',
    price: 100,
    cost: 50,
  };

  // Mock suppliers including the one from export data
  mockDb.getSuppliers.mockResolvedValue([
    { id: 'f0a8c490-bbc9-49cb-b4f0-cfc26a3a55f9', name: 'Myanmar Fresh Foods' },
  ]);
  mockDb.getCategories.mockResolvedValue([
    { id: 'cat-1', name: 'Electronics' },
  ]);

  const result5 = await resolveSupplierId(
    productRecord.supplier_id,
    (productRecord as any).supplier
  );
  console.log('Supplier resolution result:', result5); // Should be 'f0a8c490-bbc9-49cb-b4f0-cfc26a3a55f9'

  // Test the full product import process
  console.log('\n📋 Test 6: Full product import');
  const addRecord = (dataImportService as any).addRecord.bind(
    dataImportService
  );

  await addRecord('products', productRecord);

  console.log('Product add call:', mockDb.addProduct.mock.calls[0]);
  const addedProduct = mockDb.addProduct.mock.calls[0][0];
  console.log('Supplier ID in added product:', addedProduct.supplier_id);

  console.log('\n✅ Test completed!');
}

// Run the test
testSupplierRelationshipImport().catch(console.error);
