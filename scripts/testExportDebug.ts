// Test export with debug logging
console.log('🔍 Testing Export with Debug Logging');

// Mock the database service methods to see what's being called
const mockDb = {
  getStockMovements: async (filters, page, pageSize) => {
    console.log('📦 getStockMovements called with:', {
      filters,
      page,
      pageSize,
    });
    // Return some mock data to test
    return [
      {
        id: 'test-stock-movement-1',
        product_id: 'test-product-1',
        movement_type: 'stock_in',
        quantity: 10,
        created_at: new Date().toISOString(),
      },
    ];
  },

  getBulkPricingForProduct: async (productId) => {
    console.log('💰 getBulkPricingForProduct called for product:', productId);
    // Return some mock data to test
    return [
      {
        id: 'test-bulk-pricing-1',
        product_id: productId,
        min_quantity: 5,
        bulk_price: 100,
      },
    ];
  },

  getProducts: async () => {
    console.log('📦 getProducts called');
    return [
      {
        id: 'test-product-1',
        name: 'Test Product',
        price: 150,
        cost: 100,
      },
    ];
  },
};

async function testExportLogic() {
  try {
    console.log('\n🔄 Testing Export Logic:');

    // Simulate the export service logic
    const products = await mockDb.getProducts();
    console.log(`Found ${products.length} products`);

    const stockMovements = await mockDb.getStockMovements({}, 1, 10000);
    console.log(`Found ${stockMovements.length} stock movements`);

    // Get bulk pricing
    const bulkPricingData = await Promise.all(
      products.map(async (product) => {
        try {
          const bulkTiers = await mockDb.getBulkPricingForProduct(product.id);
          return {
            productId: product.id,
            productName: product.name,
            bulkTiers,
          };
        } catch (error) {
          return {
            productId: product.id,
            productName: product.name,
            bulkTiers: [],
          };
        }
      })
    );

    console.log('Bulk pricing data:', JSON.stringify(bulkPricingData, null, 2));

    // Filter bulk pricing (same as export service)
    const filteredBulkPricing = bulkPricingData.filter(
      (item) => item.bulkTiers.length > 0
    );

    console.log(`Filtered bulk pricing: ${filteredBulkPricing.length} items`);
    console.log(
      'Filtered bulk pricing data:',
      JSON.stringify(filteredBulkPricing, null, 2)
    );

    // Prepare data structure (same as export service)
    const allData = {
      stockMovements,
      bulkPricing: filteredBulkPricing,
    };

    console.log('Final data structure:');
    console.log('- stockMovements:', allData.stockMovements.length);
    console.log('- bulkPricing:', allData.bulkPricing.length);
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testExportLogic().catch(console.error);
