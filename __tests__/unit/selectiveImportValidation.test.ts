/**
 * Unit tests for selective import validation functionality
 * Tests the core validation logic without full service dependencies
 */

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { describe } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { describe } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { expect } from 'vitest';

import { it } from 'vitest';

import { describe } from 'vitest';

import { describe } from 'vitest';

describe('Selective Import Validation', () => {
  // Mock the validation function based on the DataImportService logic
  const validateDataTypeAvailability = (
    importData: any,
    selectedType: string
  ): {
    isValid: boolean;
    availableTypes: string[];
    message?: string;
    detailedCounts?: Record<string, number>;
    corruptedSections?: string[];
    validationErrors?: string[];
  } => {
    const dataTypeMap: Record<string, string[]> = {
      sales: ['sales'],
      products: ['products'],
      customers: ['customers'],
      expenses: ['expenses'],
      stockMovements: ['stockMovements'],
      bulkPricing: ['bulkPricing'],
      all: [
        'products',
        'sales',
        'customers',
        'expenses',
        'stockMovements',
        'bulkPricing',
      ],
    };

    const validationErrors: string[] = [];
    const corruptedSections: string[] = [];

    try {
      // Comprehensive validation of import data structure
      if (!importData) {
        return {
          isValid: false,
          availableTypes: [],
          message: 'Import file is empty or null',
          detailedCounts: {},
          corruptedSections: [],
          validationErrors: ['Import file is empty or null'],
        };
      }

      if (typeof importData !== 'object') {
        return {
          isValid: false,
          availableTypes: [],
          message: 'Import file does not contain valid JSON object',
          detailedCounts: {},
          corruptedSections: [],
          validationErrors: ['Import file does not contain valid JSON object'],
        };
      }

      if (!importData.data) {
        return {
          isValid: false,
          availableTypes: [],
          message:
            'Import file does not contain valid data structure (missing "data" field)',
          detailedCounts: {},
          corruptedSections: [],
          validationErrors: ['Missing "data" field in import file'],
        };
      }

      if (typeof importData.data !== 'object') {
        return {
          isValid: false,
          availableTypes: [],
          message: 'Import file data field is not a valid object',
          detailedCounts: {},
          corruptedSections: [],
          validationErrors: ['Data field is not a valid object'],
        };
      }

      // Get available data types in the file with counts and validate each section
      const availableTypes: string[] = [];
      const detailedCounts: Record<string, number> = {};

      Object.keys(importData.data).forEach((key) => {
        try {
          const section = importData.data[key];

          if (!Array.isArray(section)) {
            if (section !== null && section !== undefined) {
              validationErrors.push(
                `Data section "${key}" is not an array (found ${typeof section})`
              );
              corruptedSections.push(key);
            }
            detailedCounts[key] = 0;
            return;
          }

          // Validate array contents
          const validRecords = validateDataSection(section, key);
          const count = validRecords.length;
          detailedCounts[key] = count;

          if (count > 0) {
            availableTypes.push(key);
          }

          // Report corrupted records
          if (validRecords.length < section.length) {
            const corruptedCount = section.length - validRecords.length;
            validationErrors.push(
              `Data section "${key}" has ${corruptedCount} corrupted/invalid records out of ${section.length}`
            );
            if (validRecords.length === 0) {
              corruptedSections.push(key);
            }
          }
        } catch (error) {
          validationErrors.push(
            `Error validating data section "${key}": ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
          corruptedSections.push(key);
          detailedCounts[key] = 0;
        }
      });

      // Check if selected type is supported
      if (!dataTypeMap[selectedType]) {
        return {
          isValid: false,
          availableTypes,
          message: `Unsupported data type: ${selectedType}. Supported types: ${Object.keys(
            dataTypeMap
          ).join(', ')}`,
          detailedCounts,
          corruptedSections,
          validationErrors,
        };
      }

      // For 'all' type, we accept any available data
      if (selectedType === 'all') {
        const hasValidData = availableTypes.length > 0;
        let message: string | undefined;

        if (!hasValidData) {
          if (corruptedSections.length > 0) {
            message = `Import file contains only corrupted data sections: ${corruptedSections.join(
              ', '
            )}`;
          } else {
            message = 'Import file does not contain any valid data';
          }
        } else if (corruptedSections.length > 0) {
          message = `Some data sections are corrupted and will be skipped: ${corruptedSections.join(
            ', '
          )}`;
        }

        return {
          isValid: hasValidData,
          availableTypes,
          message,
          detailedCounts,
          corruptedSections,
          validationErrors,
        };
      }

      // Check if the required fields for the selected type are available
      const requiredFields = dataTypeMap[selectedType];
      const hasRequiredData = requiredFields.some((field) =>
        availableTypes.includes(field)
      );

      if (!hasRequiredData) {
        const availableTypesWithCounts = availableTypes
          .map((type) => `${type} (${detailedCounts[type]} records)`)
          .join(', ');

        let message = `Import file does not contain ${selectedType} data.`;

        if (availableTypes.length > 0) {
          message += ` Available data types: ${availableTypesWithCounts}`;
        } else {
          message += ' No valid data found in import file.';
        }

        if (corruptedSections.length > 0) {
          message += ` Corrupted sections: ${corruptedSections.join(', ')}`;
        }

        return {
          isValid: false,
          availableTypes,
          message,
          detailedCounts,
          corruptedSections,
          validationErrors,
        };
      }

      // Validate that the file's dataType matches the selected type (if specified)
      if (
        importData.dataType &&
        importData.dataType !== selectedType &&
        importData.dataType !== 'all' &&
        importData.dataType !== 'complete'
      ) {
        const availableTypesWithCounts = availableTypes
          .map((type) => `${type} (${detailedCounts[type]} records)`)
          .join(', ');

        let message = `Import file dataType (${importData.dataType}) does not match selected import option (${selectedType}).`;

        if (availableTypes.length > 0) {
          message += ` Available data types: ${availableTypesWithCounts}`;
        }

        return {
          isValid: false,
          availableTypes,
          message,
          detailedCounts,
          corruptedSections,
          validationErrors,
        };
      }

      return {
        isValid: true,
        availableTypes,
        detailedCounts,
        corruptedSections,
        validationErrors:
          validationErrors.length > 0 ? validationErrors : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        availableTypes: [],
        message: `Error validating import file: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        detailedCounts: {},
        corruptedSections: [],
        validationErrors: [
          `Validation error: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        ],
      };
    }
  };

  // Validate individual data section for corrupted or malformed data
  const validateDataSection = (section: any[], sectionName: string): any[] => {
    if (!Array.isArray(section)) {
      return [];
    }

    const validRecords: any[] = [];

    section.forEach((record, index) => {
      try {
        // Basic validation - must be an object
        if (!record || typeof record !== 'object') {
          return;
        }

        // Check for circular references
        try {
          JSON.stringify(record);
        } catch (error) {
          return;
        }

        // Validate required fields based on section type
        if (!validateRecordRequiredFields(record, sectionName)) {
          return;
        }

        // Validate data types
        if (!validateRecordDataTypes(record, sectionName)) {
          return;
        }

        validRecords.push(record);
      } catch (error) {
        // Skip corrupted records
      }
    });

    return validRecords;
  };

  // Validate required fields for different record types
  const validateRecordRequiredFields = (
    record: any,
    sectionName: string
  ): boolean => {
    try {
      switch (sectionName) {
        case 'products':
          return !!(
            record.name &&
            record.price !== undefined &&
            record.cost !== undefined
          );
        case 'sales':
          return !!(record.total !== undefined && record.payment_method);
        case 'customers':
          return !!record.name;
        case 'expenses':
          return !!(record.amount !== undefined && record.description);
        case 'stockMovements':
          return !!(
            record.product_id &&
            record.movement_type &&
            record.quantity !== undefined
          );
        case 'bulkPricing':
          return !!(
            record.product_id &&
            record.min_quantity !== undefined &&
            record.bulk_price !== undefined
          );
        case 'categories':
          return !!record.name;
        case 'suppliers':
          return !!record.name;
        case 'expenseCategories':
          return !!record.name;
        case 'saleItems':
          return !!(
            record.product_id &&
            record.quantity !== undefined &&
            record.price !== undefined
          );
        default:
          return true; // For unknown types, assume valid
      }
    } catch (error) {
      return false;
    }
  };

  // Validate data types for record fields
  const validateRecordDataTypes = (
    record: any,
    sectionName: string
  ): boolean => {
    try {
      switch (sectionName) {
        case 'products':
          return (
            typeof record.name === 'string' &&
            typeof record.price === 'number' &&
            !isNaN(record.price) &&
            typeof record.cost === 'number' &&
            !isNaN(record.cost) &&
            (record.quantity === undefined ||
              (typeof record.quantity === 'number' && !isNaN(record.quantity)))
          );
        case 'sales':
          return (
            typeof record.total === 'number' &&
            !isNaN(record.total) &&
            typeof record.payment_method === 'string'
          );
        case 'customers':
          return typeof record.name === 'string';
        case 'expenses':
          return (
            typeof record.amount === 'number' &&
            !isNaN(record.amount) &&
            typeof record.description === 'string'
          );
        case 'stockMovements':
          return (
            typeof record.product_id === 'string' &&
            typeof record.movement_type === 'string' &&
            typeof record.quantity === 'number' &&
            !isNaN(record.quantity)
          );
        case 'bulkPricing':
          return (
            typeof record.product_id === 'string' &&
            typeof record.min_quantity === 'number' &&
            !isNaN(record.min_quantity) &&
            typeof record.bulk_price === 'number' &&
            !isNaN(record.bulk_price)
          );
        default:
          return true; // For unknown types, assume valid
      }
    } catch (error) {
      return false;
    }
  };

  describe('Data Type Validation', () => {
    it('should validate available data types correctly', () => {
      const mockData = {
        data: {
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
          sales: [{ total: 500, payment_method: 'cash' }],
          customers: [{ name: 'Customer 1' }],
          expenses: [],
          stockMovements: null,
          bulkPricing: undefined,
        },
      };

      const result = validateDataTypeAvailability(mockData, 'products');

      expect(result.isValid).toBe(true);
      expect(result.availableTypes).toEqual(['products', 'sales', 'customers']);
      expect(result.detailedCounts).toEqual({
        products: 1,
        sales: 1,
        customers: 1,
        expenses: 0,
        stockMovements: 0,
        bulkPricing: 0,
      });
    });

    it('should return false for missing data type', () => {
      const mockData = {
        data: {
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
          sales: [{ total: 500, payment_method: 'cash' }],
        },
      };

      const result = validateDataTypeAvailability(mockData, 'customers');

      expect(result.isValid).toBe(false);
      expect(result.availableTypes).toEqual(['products', 'sales']);
      expect(result.message).toContain('customers data');
      expect(result.message).toContain(
        'Available data types: products (1 records), sales (1 records)'
      );
    });

    it('should validate "all" data type when any data is available', () => {
      const mockData = {
        data: {
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
          sales: [],
          customers: null,
        },
      };

      const result = validateDataTypeAvailability(mockData, 'all');

      expect(result.isValid).toBe(true);
      expect(result.availableTypes).toEqual(['products']);
    });

    it('should return false for "all" when no valid data is available', () => {
      const mockData = {
        data: {
          products: [],
          sales: [],
          customers: null,
          expenses: undefined,
        },
      };

      const result = validateDataTypeAvailability(mockData, 'all');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('does not contain any valid data');
    });

    it('should handle corrupted data sections', () => {
      const mockData = {
        data: {
          products: [
            { name: 'Product 1', price: 100, cost: 50 }, // Valid
            { price: 100 }, // Invalid - missing name
            null, // Invalid - null record
          ],
          sales: 'not an array', // Invalid - not an array
          customers: [{ name: 'Customer 1' }], // Valid
        },
      };

      const result = validateDataTypeAvailability(mockData, 'products');

      expect(result.isValid).toBe(true);
      expect(result.availableTypes).toEqual(['products', 'customers']);
      expect(result.detailedCounts?.products).toBe(1); // Only 1 valid product
      expect(result.detailedCounts?.customers).toBe(1);
      expect(result.corruptedSections).toContain('sales');
      expect(result.validationErrors).toContain(
        'Data section "sales" is not an array (found string)'
      );
    });

    it('should handle empty or null import data', () => {
      const result1 = validateDataTypeAvailability(null, 'products');
      expect(result1.isValid).toBe(false);
      expect(result1.message).toContain('empty or null');

      const result2 = validateDataTypeAvailability({}, 'products');
      expect(result2.isValid).toBe(false);
      expect(result2.message).toContain('missing "data" field');

      const result3 = validateDataTypeAvailability({ data: null }, 'products');
      expect(result3.isValid).toBe(false);
      expect(result3.message).toContain('missing "data" field');
    });

    it('should validate dataType field mismatch', () => {
      const mockData = {
        dataType: 'sales',
        data: {
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
        },
      };

      const result = validateDataTypeAvailability(mockData, 'products');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain(
        'dataType (sales) does not match selected import option (products)'
      );
    });

    it('should accept matching dataType field', () => {
      const mockData = {
        dataType: 'products',
        data: {
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
        },
      };

      const result = validateDataTypeAvailability(mockData, 'products');

      expect(result.isValid).toBe(true);
    });

    it('should accept "all" or "complete" dataType for any selection', () => {
      const mockData1 = {
        dataType: 'all',
        data: {
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
        },
      };

      const result1 = validateDataTypeAvailability(mockData1, 'products');
      expect(result1.isValid).toBe(true);

      const mockData2 = {
        dataType: 'complete',
        data: {
          sales: [{ total: 500, payment_method: 'cash' }],
        },
      };

      const result2 = validateDataTypeAvailability(mockData2, 'sales');
      expect(result2.isValid).toBe(true);
    });

    it('should return error for unsupported data type', () => {
      const mockData = {
        data: {
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
        },
      };

      const result = validateDataTypeAvailability(mockData, 'unsupported');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Unsupported data type: unsupported');
    });
  });

  describe('Record Validation', () => {
    it('should validate product records correctly', () => {
      const validProducts = [
        { name: 'Product 1', price: 100, cost: 50 },
        { name: 'Product 2', price: 200, cost: 100, quantity: 10 },
      ];
      const invalidProducts = [
        { price: 100, cost: 50 }, // Missing name
        { name: 'Product 3', cost: 50 }, // Missing price
        { name: 'Product 4', price: 'invalid', cost: 50 }, // Invalid price type
        null, // Null record
      ];

      const allProducts = [...validProducts, ...invalidProducts];
      const result = validateDataSection(allProducts, 'products');

      expect(result).toHaveLength(2);
      expect(result).toEqual(validProducts);
    });

    it('should validate sales records correctly', () => {
      const validSales = [
        { total: 500, payment_method: 'cash' },
        { total: 300, payment_method: 'card' },
      ];
      const invalidSales = [
        { payment_method: 'cash' }, // Missing total
        { total: 'invalid', payment_method: 'cash' }, // Invalid total type
        { total: 500 }, // Missing payment_method
      ];

      const allSales = [...validSales, ...invalidSales];
      const result = validateDataSection(allSales, 'sales');

      expect(result).toHaveLength(2);
      expect(result).toEqual(validSales);
    });

    it('should validate customer records correctly', () => {
      const validCustomers = [
        { name: 'Customer 1' },
        { name: 'Customer 2', phone: '123456789' },
      ];
      const invalidCustomers = [
        { phone: '123456789' }, // Missing name
        { name: null }, // Invalid name
      ];

      const allCustomers = [...validCustomers, ...invalidCustomers];
      const result = validateDataSection(allCustomers, 'customers');

      expect(result).toHaveLength(2);
      expect(result).toEqual(validCustomers);
    });

    it('should validate expense records correctly', () => {
      const validExpenses = [
        { amount: 100, description: 'Office supplies' },
        { amount: 200, description: 'Marketing costs' },
      ];
      const invalidExpenses = [
        { description: 'Office supplies' }, // Missing amount
        { amount: 'invalid', description: 'Marketing' }, // Invalid amount type
        { amount: 100 }, // Missing description
      ];

      const allExpenses = [...validExpenses, ...invalidExpenses];
      const result = validateDataSection(allExpenses, 'expenses');

      expect(result).toHaveLength(2);
      expect(result).toEqual(validExpenses);
    });

    it('should validate stock movement records correctly', () => {
      const validMovements = [
        { product_id: 'prod1', movement_type: 'in', quantity: 10 },
        { product_id: 'prod2', movement_type: 'out', quantity: 5 },
      ];
      const invalidMovements = [
        { movement_type: 'in', quantity: 10 }, // Missing product_id
        { product_id: 'prod1', quantity: 10 }, // Missing movement_type
        { product_id: 'prod1', movement_type: 'in' }, // Missing quantity
        { product_id: 'prod1', movement_type: 'in', quantity: 'invalid' }, // Invalid quantity type
      ];

      const allMovements = [...validMovements, ...invalidMovements];
      const result = validateDataSection(allMovements, 'stockMovements');

      expect(result).toHaveLength(2);
      expect(result).toEqual(validMovements);
    });

    it('should validate bulk pricing records correctly', () => {
      const validBulkPricing = [
        { product_id: 'prod1', min_quantity: 10, bulk_price: 90 },
        { product_id: 'prod2', min_quantity: 20, bulk_price: 180 },
      ];
      const invalidBulkPricing = [
        { min_quantity: 10, bulk_price: 90 }, // Missing product_id
        { product_id: 'prod1', bulk_price: 90 }, // Missing min_quantity
        { product_id: 'prod1', min_quantity: 10 }, // Missing bulk_price
        { product_id: 'prod1', min_quantity: 'invalid', bulk_price: 90 }, // Invalid min_quantity type
      ];

      const allBulkPricing = [...validBulkPricing, ...invalidBulkPricing];
      const result = validateDataSection(allBulkPricing, 'bulkPricing');

      expect(result).toHaveLength(2);
      expect(result).toEqual(validBulkPricing);
    });
  });

  describe('Error Handling', () => {
    it('should handle completely corrupted data sections', () => {
      const mockData = {
        data: {
          products: 'not an array',
          sales: { invalid: 'object' },
          customers: 123,
          expenses: null,
        },
      };

      const result = validateDataTypeAvailability(mockData, 'products');

      expect(result.isValid).toBe(false);
      expect(result.availableTypes).toEqual([]);
      expect(result.corruptedSections).toEqual([
        'products',
        'sales',
        'customers',
      ]);
      expect(result.validationErrors).toContain(
        'Data section "products" is not an array (found string)'
      );
      expect(result.validationErrors).toContain(
        'Data section "sales" is not an array (found object)'
      );
      expect(result.validationErrors).toContain(
        'Data section "customers" is not an array (found number)'
      );
    });

    it('should provide detailed error messages for missing data types', () => {
      const mockData = {
        data: {
          products: [{ name: 'Product 1', price: 100, cost: 50 }],
          customers: [{ name: 'Customer 1' }],
        },
      };

      const result = validateDataTypeAvailability(mockData, 'sales');

      expect(result.isValid).toBe(false);
      expect(result.message).toContain(
        'Import file does not contain sales data'
      );
      expect(result.message).toContain(
        'Available data types: products (1 records), customers (1 records)'
      );
      expect(result.availableTypes).toEqual(['products', 'customers']);
      expect(result.detailedCounts).toEqual({
        products: 1,
        customers: 1,
      });
    });

    it('should handle mixed valid and invalid records', () => {
      const mockData = {
        data: {
          products: [
            { name: 'Valid Product', price: 100, cost: 50 }, // Valid
            { name: 'Invalid Product', price: 'not a number', cost: 50 }, // Invalid price
            { price: 100, cost: 50 }, // Missing name
            { name: 'Another Valid Product', price: 200, cost: 100 }, // Valid
          ],
        },
      };

      const result = validateDataTypeAvailability(mockData, 'products');

      expect(result.isValid).toBe(true);
      expect(result.availableTypes).toEqual(['products']);
      expect(result.detailedCounts?.products).toBe(2); // Only 2 valid products
      expect(result.validationErrors).toContain(
        'Data section "products" has 2 corrupted/invalid records out of 4'
      );
    });
  });
});
