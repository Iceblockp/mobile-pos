/**
 * Diagnostic script to identify UUID migration issues
 * This script helps identify data integrity problems that prevent migration
 */

const fs = require('fs');
const path = require('path');

class MigrationDiagnostic {
  constructor() {
    this.issues = [];
    this.warnings = [];
  }

  async diagnose() {
    console.log('🔍 Diagnosing UUID Migration Issues');
    console.log('='.repeat(50));

    // Since we can't directly access the database in this script,
    // we'll provide guidance on what to check

    console.log('\n📋 Data Integrity Checks to Perform:');
    console.log('\n1. Check for orphaned sale_items records:');
    console.log(
      '   SQL: SELECT si.id, si.product_id FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE p.id IS NULL;'
    );

    console.log('\n2. Check for orphaned records in other tables:');
    console.log('   Products without categories:');
    console.log(
      '   SQL: SELECT p.id, p.category_id FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE c.id IS NULL;'
    );

    console.log('\n   Sales without customers (if customer_id is not null):');
    console.log(
      '   SQL: SELECT s.id, s.customer_id FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.customer_id IS NOT NULL AND c.id IS NULL;'
    );

    console.log('\n3. Check for null or invalid foreign keys:');
    console.log(
      '   SQL: SELECT * FROM sale_items WHERE product_id IS NULL OR sale_id IS NULL;'
    );

    console.log('\n4. Verify table record counts:');
    console.log(
      "   SQL: SELECT 'products' as table_name, COUNT(*) as count FROM products"
    );
    console.log("        UNION SELECT 'categories', COUNT(*) FROM categories");
    console.log("        UNION SELECT 'sale_items', COUNT(*) FROM sale_items");
    console.log("        UNION SELECT 'sales', COUNT(*) FROM sales;");

    console.log('\n🔧 Common Solutions:');
    console.log('\n1. If orphaned records exist:');
    console.log(
      '   - Delete orphaned records: DELETE FROM sale_items WHERE product_id NOT IN (SELECT id FROM products);'
    );
    console.log('   - Or create missing parent records if the data is valid');

    console.log('\n2. If null foreign keys exist:');
    console.log('   - Update null foreign keys to valid values');
    console.log('   - Or delete records with null required foreign keys');

    console.log('\n3. If data corruption is suspected:');
    console.log('   - Restore from a backup');
    console.log('   - Manually fix data inconsistencies');

    console.log('\n📊 Migration Error Analysis:');
    console.log('The error "No UUID mapping found for products.5" indicates:');
    console.log('- A sale_items record references product_id = 5');
    console.log('- But no product with id = 5 exists in the products table');
    console.log('- This is a foreign key constraint violation');

    console.log('\n🚀 Recommended Action Plan:');
    console.log('1. Run the diagnostic SQL queries above');
    console.log('2. Identify and fix data integrity issues');
    console.log('3. Re-run the migration after fixing the data');
    console.log('4. Consider adding data validation to prevent future issues');

    this.generateDiagnosticReport();
  }

  generateDiagnosticReport() {
    const report = {
      timestamp: new Date().toISOString(),
      error: 'No UUID mapping found for products.5',
      analysis: {
        rootCause: 'Foreign key constraint violation',
        description:
          'sale_items table contains records referencing non-existent products',
        impact: 'Migration fails during sale_items processing',
        severity: 'High - Blocks migration completely',
      },
      diagnosticQueries: [
        {
          purpose: 'Find orphaned sale_items',
          sql: 'SELECT si.id, si.product_id FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE p.id IS NULL;',
        },
        {
          purpose: 'Find orphaned products',
          sql: 'SELECT p.id, p.category_id FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE c.id IS NULL;',
        },
        {
          purpose: 'Check for null foreign keys in sale_items',
          sql: 'SELECT * FROM sale_items WHERE product_id IS NULL OR sale_id IS NULL;',
        },
        {
          purpose: 'Verify table counts',
          sql: "SELECT 'products' as table_name, COUNT(*) as count FROM products UNION SELECT 'sale_items', COUNT(*) FROM sale_items;",
        },
      ],
      solutions: [
        {
          type: 'Delete orphaned records',
          sql: 'DELETE FROM sale_items WHERE product_id NOT IN (SELECT id FROM products);',
          risk: 'Data loss - orphaned sale_items will be deleted',
        },
        {
          type: 'Create missing products',
          description:
            'Manually create missing product records if the data is valid',
          risk: 'Low - but requires manual data entry',
        },
        {
          type: 'Update foreign keys',
          description:
            'Update invalid foreign keys to point to existing records',
          risk: 'Medium - may change business logic',
        },
      ],
      prevention: [
        'Add foreign key constraints to prevent orphaned records',
        'Implement data validation in the application',
        'Regular data integrity checks',
        'Backup before major operations',
      ],
    };

    const reportPath = path.join(
      process.cwd(),
      'migration-diagnostic-report.json'
    );
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📄 Diagnostic report saved to: ${reportPath}`);
  }
}

// Main execution
async function main() {
  const diagnostic = new MigrationDiagnostic();
  await diagnostic.diagnose();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  });
}

module.exports = { MigrationDiagnostic };
