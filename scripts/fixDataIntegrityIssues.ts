/**
 * Data integrity fix script for UUID migration
 * Automatically fixes common data integrity issues that prevent migration
 */

import * as SQLite from 'expo-sqlite';

interface DataIntegrityIssue {
  table: string;
  issue: string;
  count: number;
  fixQuery?: string;
  description: string;
}

export class DataIntegrityFixer {
  private db: SQLite.SQLiteDatabase;
  private issues: DataIntegrityIssue[] = [];

  constructor(database: SQLite.SQLiteDatabase) {
    this.db = database;
  }

  async diagnoseAndFix(): Promise<{
    issuesFound: number;
    issuesFixed: number;
  }> {
    console.log('🔍 Diagnosing data integrity issues...');

    await this.findDataIntegrityIssues();

    if (this.issues.length === 0) {
      console.log('✅ No data integrity issues found!');
      return { issuesFound: 0, issuesFixed: 0 };
    }

    console.log(`\n⚠️  Found ${this.issues.length} data integrity issue(s):`);
    this.issues.forEach((issue, index) => {
      console.log(
        `${index + 1}. ${issue.table}: ${issue.description} (${
          issue.count
        } records)`
      );
    });

    console.log('\n🔧 Fixing data integrity issues...');
    const fixedCount = await this.fixDataIntegrityIssues();

    return { issuesFound: this.issues.length, issuesFixed: fixedCount };
  }

  private async findDataIntegrityIssues(): Promise<void> {
    this.issues = [];

    // Check for orphaned sale_items records
    try {
      const orphanedSaleItems = (await this.db.getAllAsync(`
        SELECT COUNT(*) as count 
        FROM sale_items si 
        LEFT JOIN products p ON si.product_id = p.id 
        WHERE p.id IS NULL
      `)) as { count: number }[];

      if (orphanedSaleItems[0].count > 0) {
        this.issues.push({
          table: 'sale_items',
          issue: 'orphaned_product_references',
          count: orphanedSaleItems[0].count,
          fixQuery:
            'DELETE FROM sale_items WHERE product_id NOT IN (SELECT id FROM products)',
          description: 'Sale items referencing non-existent products',
        });
      }
    } catch (error) {
      console.warn('Could not check sale_items orphaned records:', error);
    }

    // Check for orphaned sale_items sales references
    try {
      const orphanedSaleItemsSales = (await this.db.getAllAsync(`
        SELECT COUNT(*) as count 
        FROM sale_items si 
        LEFT JOIN sales s ON si.sale_id = s.id 
        WHERE s.id IS NULL
      `)) as { count: number }[];

      if (orphanedSaleItemsSales[0].count > 0) {
        this.issues.push({
          table: 'sale_items',
          issue: 'orphaned_sale_references',
          count: orphanedSaleItemsSales[0].count,
          fixQuery:
            'DELETE FROM sale_items WHERE sale_id NOT IN (SELECT id FROM sales)',
          description: 'Sale items referencing non-existent sales',
        });
      }
    } catch (error) {
      console.warn(
        'Could not check sale_items orphaned sales references:',
        error
      );
    }

    // Check for orphaned products
    try {
      const orphanedProducts = (await this.db.getAllAsync(`
        SELECT COUNT(*) as count 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE c.id IS NULL
      `)) as { count: number }[];

      if (orphanedProducts[0].count > 0) {
        this.issues.push({
          table: 'products',
          issue: 'orphaned_category_references',
          count: orphanedProducts[0].count,
          description:
            'Products referencing non-existent categories (requires manual fix)',
        });
      }
    } catch (error) {
      console.warn('Could not check products orphaned records:', error);
    }

    // Check for orphaned stock_movements
    try {
      const orphanedStockMovements = (await this.db.getAllAsync(`
        SELECT COUNT(*) as count 
        FROM stock_movements sm 
        LEFT JOIN products p ON sm.product_id = p.id 
        WHERE p.id IS NULL
      `)) as { count: number }[];

      if (orphanedStockMovements[0].count > 0) {
        this.issues.push({
          table: 'stock_movements',
          issue: 'orphaned_product_references',
          count: orphanedStockMovements[0].count,
          fixQuery:
            'DELETE FROM stock_movements WHERE product_id NOT IN (SELECT id FROM products)',
          description: 'Stock movements referencing non-existent products',
        });
      }
    } catch (error) {
      console.warn('Could not check stock_movements orphaned records:', error);
    }

    // Check for orphaned bulk_pricing
    try {
      const orphanedBulkPricing = (await this.db.getAllAsync(`
        SELECT COUNT(*) as count 
        FROM bulk_pricing bp 
        LEFT JOIN products p ON bp.product_id = p.id 
        WHERE p.id IS NULL
      `)) as { count: number }[];

      if (orphanedBulkPricing[0].count > 0) {
        this.issues.push({
          table: 'bulk_pricing',
          issue: 'orphaned_product_references',
          count: orphanedBulkPricing[0].count,
          fixQuery:
            'DELETE FROM bulk_pricing WHERE product_id NOT IN (SELECT id FROM products)',
          description: 'Bulk pricing referencing non-existent products',
        });
      }
    } catch (error) {
      console.warn('Could not check bulk_pricing orphaned records:', error);
    }

    // Check for orphaned expenses
    try {
      const orphanedExpenses = (await this.db.getAllAsync(`
        SELECT COUNT(*) as count 
        FROM expenses e 
        LEFT JOIN expense_categories ec ON e.category_id = ec.id 
        WHERE ec.id IS NULL
      `)) as { count: number }[];

      if (orphanedExpenses[0].count > 0) {
        this.issues.push({
          table: 'expenses',
          issue: 'orphaned_category_references',
          count: orphanedExpenses[0].count,
          fixQuery:
            'DELETE FROM expenses WHERE category_id NOT IN (SELECT id FROM expense_categories)',
          description: 'Expenses referencing non-existent expense categories',
        });
      }
    } catch (error) {
      console.warn('Could not check expenses orphaned records:', error);
    }

    // Check for null foreign keys in critical tables
    try {
      const nullForeignKeys = (await this.db.getAllAsync(`
        SELECT COUNT(*) as count 
        FROM sale_items 
        WHERE product_id IS NULL OR sale_id IS NULL
      `)) as { count: number }[];

      if (nullForeignKeys[0].count > 0) {
        this.issues.push({
          table: 'sale_items',
          issue: 'null_foreign_keys',
          count: nullForeignKeys[0].count,
          fixQuery:
            'DELETE FROM sale_items WHERE product_id IS NULL OR sale_id IS NULL',
          description: 'Sale items with null foreign keys',
        });
      }
    } catch (error) {
      console.warn('Could not check null foreign keys:', error);
    }
  }

  private async fixDataIntegrityIssues(): Promise<number> {
    let fixedCount = 0;

    for (const issue of this.issues) {
      if (issue.fixQuery) {
        try {
          console.log(`🔧 Fixing ${issue.table}: ${issue.description}`);
          await this.db.execAsync(issue.fixQuery);
          console.log(`✅ Fixed ${issue.count} records in ${issue.table}`);
          fixedCount++;
        } catch (error) {
          console.error(`❌ Failed to fix ${issue.table}: ${error}`);
        }
      } else {
        console.log(
          `⚠️  Manual fix required for ${issue.table}: ${issue.description}`
        );
      }
    }

    return fixedCount;
  }

  async createMissingDefaultCategories(): Promise<void> {
    console.log('🔧 Creating default categories for orphaned products...');

    try {
      // Check if there are products without categories
      const orphanedProducts = (await this.db.getAllAsync(`
        SELECT DISTINCT p.category_id 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        WHERE c.id IS NULL AND p.category_id IS NOT NULL
      `)) as { category_id: number }[];

      if (orphanedProducts.length > 0) {
        // Create a default category
        const defaultCategoryId = 999999; // Use a high ID to avoid conflicts

        try {
          await this.db.runAsync(
            'INSERT OR IGNORE INTO categories (id, name, description) VALUES (?, ?, ?)',
            [
              defaultCategoryId,
              'Default Category',
              'Auto-created category for orphaned products',
            ]
          );

          // Update orphaned products to use the default category
          for (const product of orphanedProducts) {
            await this.db.runAsync(
              'UPDATE products SET category_id = ? WHERE category_id = ?',
              [defaultCategoryId, product.category_id]
            );
          }

          console.log(
            `✅ Created default category and updated ${orphanedProducts.length} orphaned products`
          );
        } catch (error) {
          console.error('❌ Failed to create default categories:', error);
        }
      }
    } catch (error) {
      console.warn('Could not create default categories:', error);
    }
  }

  async generateDataIntegrityReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      issuesFound: this.issues.length,
      issues: this.issues,
      recommendations: [
        'Run this script before attempting UUID migration',
        'Backup your database before running fixes',
        'Review manually fixed data for accuracy',
        'Consider adding foreign key constraints to prevent future issues',
      ],
    };

    console.log('\n📊 Data Integrity Report:');
    console.log(`Issues Found: ${report.issuesFound}`);
    console.log('Issues Details:');
    report.issues.forEach((issue, index) => {
      console.log(
        `  ${index + 1}. ${issue.table}: ${issue.description} (${
          issue.count
        } records)`
      );
    });
  }
}

// Export for use in other modules
export default DataIntegrityFixer;
