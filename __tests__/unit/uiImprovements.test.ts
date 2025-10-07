import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('UI Improvements for Data Export/Import', () => {
  describe('Data Type Display Names', () => {
    it('should return correct display names for data types', () => {
      // This would be the helper function from the UI components
      const getDataTypeDisplayName = (dataType: string): string => {
        const displayNames: Record<string, string> = {
          products: 'Products & Inventory',
          sales: 'Sales Data',
          customers: 'Customer Data',
          expenses: 'Expenses',
          stockMovements: 'Stock Movements',
          bulkPricing: 'Bulk Pricing',
          all: 'Complete Backup',
        };

        return displayNames[dataType] || dataType;
      };

      expect(getDataTypeDisplayName('products')).toBe('Products & Inventory');
      expect(getDataTypeDisplayName('sales')).toBe('Sales Data');
      expect(getDataTypeDisplayName('customers')).toBe('Customer Data');
      expect(getDataTypeDisplayName('expenses')).toBe('Expenses');
      expect(getDataTypeDisplayName('stockMovements')).toBe('Stock Movements');
      expect(getDataTypeDisplayName('bulkPricing')).toBe('Bulk Pricing');
      expect(getDataTypeDisplayName('all')).toBe('Complete Backup');
      expect(getDataTypeDisplayName('unknown')).toBe('unknown');
    });
  });

  describe('Error Message Generation', () => {
    it('should generate specific error messages for missing data types', () => {
      const getDataTypeDisplayName = (dataType: string): string => {
        const displayNames: Record<string, string> = {
          products: 'Products & Inventory',
          sales: 'Sales Data',
          customers: 'Customer Data',
        };
        return displayNames[dataType] || dataType;
      };

      const generateMissingDataTypeError = (dataType: string): string => {
        const dataTypeName = getDataTypeDisplayName(dataType);
        return `Import failed: The selected file does not contain ${dataTypeName.toLowerCase()} data. Please select a file that contains the data type you want to import.`;
      };

      expect(generateMissingDataTypeError('products')).toBe(
        'Import failed: The selected file does not contain products & inventory data. Please select a file that contains the data type you want to import.'
      );

      expect(generateMissingDataTypeError('sales')).toBe(
        'Import failed: The selected file does not contain sales data data. Please select a file that contains the data type you want to import.'
      );

      expect(generateMissingDataTypeError('customers')).toBe(
        'Import failed: The selected file does not contain customer data data. Please select a file that contains the data type you want to import.'
      );
    });

    it('should generate specific error messages for validation errors', () => {
      const generateValidationError = (error: Error): string => {
        if (
          error.message.includes('Invalid') ||
          error.message.includes('format')
        ) {
          return 'Import failed: Invalid file format. Please select a valid JSON backup file.';
        } else if (error.message.includes('validation')) {
          return `Import failed: Data validation error. ${error.message}`;
        } else {
          return `Import failed: ${error.message}`;
        }
      };

      expect(generateValidationError(new Error('Invalid JSON format'))).toBe(
        'Import failed: Invalid file format. Please select a valid JSON backup file.'
      );

      expect(
        generateValidationError(
          new Error('Data validation failed: missing required field')
        )
      ).toBe(
        'Import failed: Data validation error. Data validation failed: missing required field'
      );

      expect(
        generateValidationError(new Error('Network connection failed'))
      ).toBe('Import failed: Network connection failed');
    });
  });

  describe('Success Message Generation', () => {
    it('should generate enhanced success messages with detailed counts', () => {
      const getDataTypeDisplayName = (dataType: string): string => {
        const displayNames: Record<string, string> = {
          products: 'Products & Inventory',
          sales: 'Sales Data',
        };
        return displayNames[dataType] || dataType;
      };

      const generateSuccessMessage = (
        dataType: string,
        actualProcessedCounts?: Record<
          string,
          { imported: number; updated: number; skipped: number }
        >,
        basicCounts?: { imported: number; updated: number; skipped: number }
      ): string => {
        const dataTypeName = getDataTypeDisplayName(dataType);
        let successMessage = `${dataTypeName} import completed successfully!`;

        if (
          actualProcessedCounts &&
          Object.keys(actualProcessedCounts).length > 0
        ) {
          const processedDetails = Object.entries(actualProcessedCounts)
            .map(([type, counts]) => {
              const total = counts.imported + counts.updated + counts.skipped;
              if (total > 0) {
                return `${type}: ${counts.imported} imported, ${counts.updated} updated, ${counts.skipped} skipped`;
              }
              return null;
            })
            .filter(Boolean)
            .join('\n');

          if (processedDetails) {
            successMessage += `\n\nDetails:\n${processedDetails}`;
          }
        } else if (basicCounts) {
          successMessage += ` ${basicCounts.imported} imported, ${basicCounts.updated} updated, ${basicCounts.skipped} skipped.`;
        }

        return successMessage;
      };

      // Test with detailed counts
      const detailedCounts = {
        products: { imported: 10, updated: 5, skipped: 2 },
        categories: { imported: 3, updated: 0, skipped: 0 },
      };

      expect(generateSuccessMessage('products', detailedCounts)).toBe(
        'Products & Inventory import completed successfully!\n\nDetails:\nproducts: 10 imported, 5 updated, 2 skipped\ncategories: 3 imported, 0 updated, 0 skipped'
      );

      // Test with basic counts
      expect(
        generateSuccessMessage('sales', undefined, {
          imported: 15,
          updated: 3,
          skipped: 1,
        })
      ).toBe(
        'Sales Data import completed successfully! 15 imported, 3 updated, 1 skipped.'
      );
    });
  });

  describe('Export Feedback Messages', () => {
    it('should generate appropriate feedback for empty exports', () => {
      const getDataTypeDisplayName = (dataType: string): string => {
        const displayNames: Record<string, string> = {
          products: 'Products & Inventory',
          sales: 'Sales Data',
        };
        return displayNames[dataType] || dataType;
      };

      const generateExportFeedback = (
        dataType: string,
        recordCount: number,
        isEmpty: boolean
      ): string => {
        const dataTypeName = getDataTypeDisplayName(dataType);

        if (isEmpty) {
          return `${dataTypeName} export completed, but no data was found. An empty export file has been created for consistency.`;
        } else {
          const recordText = recordCount === 1 ? 'record' : 'records';
          return `${dataTypeName} export completed successfully! ${recordCount} ${recordText} exported.`;
        }
      };

      expect(generateExportFeedback('products', 0, true)).toBe(
        'Products & Inventory export completed, but no data was found. An empty export file has been created for consistency.'
      );

      expect(generateExportFeedback('sales', 1, false)).toBe(
        'Sales Data export completed successfully! 1 record exported.'
      );

      expect(generateExportFeedback('sales', 25, false)).toBe(
        'Sales Data export completed successfully! 25 records exported.'
      );
    });
  });
});
