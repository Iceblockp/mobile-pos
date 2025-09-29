// Validation interfaces
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

export interface DatabaseSnapshot {
  products: any[];
  categories: any[];
  suppliers: any[];
  customers: any[];
  expenseCategories: any[];
}

export class ValidationService {
  // Validate product data
  validateProductData(product: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields validation
    if (
      !product.name ||
      typeof product.name !== 'string' ||
      product.name.trim().length === 0
    ) {
      errors.push({
        field: 'name',
        message: 'Product name is required and must be a non-empty string',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }

    if (!product.category_id && !product.category) {
      errors.push({
        field: 'category',
        message: 'Product category is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }

    // Price validation
    if (product.price === undefined || product.price === null) {
      errors.push({
        field: 'price',
        message: 'Product price is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    } else if (typeof product.price !== 'number' || product.price <= 0) {
      errors.push({
        field: 'price',
        message: 'Product price must be a positive number',
        code: 'INVALID_PRICE',
        severity: 'error',
      });
    }

    // Cost validation
    if (product.cost === undefined || product.cost === null) {
      errors.push({
        field: 'cost',
        message: 'Product cost is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    } else if (typeof product.cost !== 'number' || product.cost <= 0) {
      errors.push({
        field: 'cost',
        message: 'Product cost must be a positive number',
        code: 'INVALID_COST',
        severity: 'error',
      });
    }

    // Price vs cost validation
    if (product.price && product.cost && product.price <= product.cost) {
      warnings.push({
        field: 'price',
        message: 'Product price should be higher than cost for profitability',
        code: 'LOW_PROFIT_MARGIN',
      });
    }

    // Quantity validation
    if (
      product.quantity !== undefined &&
      (typeof product.quantity !== 'number' || product.quantity < 0)
    ) {
      errors.push({
        field: 'quantity',
        message: 'Product quantity must be a non-negative number',
        code: 'INVALID_QUANTITY',
        severity: 'error',
      });
    }

    // Min stock validation
    if (
      product.min_stock !== undefined &&
      (typeof product.min_stock !== 'number' || product.min_stock < 0)
    ) {
      errors.push({
        field: 'min_stock',
        message: 'Minimum stock must be a non-negative number',
        code: 'INVALID_MIN_STOCK',
        severity: 'error',
      });
    }

    // Barcode validation (if provided)
    if (
      product.barcode &&
      (typeof product.barcode !== 'string' ||
        product.barcode.trim().length === 0)
    ) {
      errors.push({
        field: 'barcode',
        message: 'Barcode must be a non-empty string if provided',
        code: 'INVALID_BARCODE',
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Validate sales data
  validateSalesData(sale: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Total validation
    if (sale.total === undefined || sale.total === null) {
      errors.push({
        field: 'total',
        message: 'Sale total is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    } else if (typeof sale.total !== 'number' || sale.total <= 0) {
      errors.push({
        field: 'total',
        message: 'Sale total must be a positive number',
        code: 'INVALID_TOTAL',
        severity: 'error',
      });
    }

    // Payment method validation
    if (!sale.payment_method || typeof sale.payment_method !== 'string') {
      errors.push({
        field: 'payment_method',
        message: 'Payment method is required and must be a string',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    } else {
      const validPaymentMethods = [
        'cash',
        'card',
        'mobile',
        'bank_transfer',
        'other',
      ];
      if (!validPaymentMethods.includes(sale.payment_method.toLowerCase())) {
        warnings.push({
          field: 'payment_method',
          message:
            'Payment method should be one of: cash, card, mobile, bank_transfer, other',
          code: 'UNKNOWN_PAYMENT_METHOD',
        });
      }
    }

    // Date validation
    if (sale.created_at && !this.isValidDate(sale.created_at)) {
      errors.push({
        field: 'created_at',
        message: 'Invalid date format for created_at',
        code: 'INVALID_DATE',
        severity: 'error',
      });
    }

    // Sale items validation
    if (sale.items && Array.isArray(sale.items)) {
      sale.items.forEach((item: any, index: number) => {
        const itemValidation = this.validateSaleItem(item);
        itemValidation.errors.forEach((error) => {
          errors.push({
            ...error,
            field: `items[${index}].${error.field}`,
          });
        });
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Validate sale item data
  validateSaleItem(item: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!item.product_id && !item.product_name) {
      errors.push({
        field: 'product',
        message: 'Product ID or name is required for sale item',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }

    if (
      item.quantity === undefined ||
      typeof item.quantity !== 'number' ||
      item.quantity <= 0
    ) {
      errors.push({
        field: 'quantity',
        message: 'Sale item quantity must be a positive number',
        code: 'INVALID_QUANTITY',
        severity: 'error',
      });
    }

    if (
      item.price === undefined ||
      typeof item.price !== 'number' ||
      item.price <= 0
    ) {
      errors.push({
        field: 'price',
        message: 'Sale item price must be a positive number',
        code: 'INVALID_PRICE',
        severity: 'error',
      });
    }

    // Subtotal validation
    if (item.subtotal !== undefined && item.quantity && item.price) {
      const expectedSubtotal =
        item.quantity * item.price - (item.discount || 0);
      if (Math.abs(item.subtotal - expectedSubtotal) > 0.01) {
        warnings.push({
          field: 'subtotal',
          message: 'Subtotal does not match quantity × price - discount',
          code: 'SUBTOTAL_MISMATCH',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Validate customer data
  validateCustomerData(customer: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Name validation
    if (
      !customer.name ||
      typeof customer.name !== 'string' ||
      customer.name.trim().length === 0
    ) {
      errors.push({
        field: 'name',
        message: 'Customer name is required and must be a non-empty string',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }

    // Phone validation (if provided)
    if (customer.phone && typeof customer.phone === 'string') {
      const phoneRegex = /^[\+]?[0-9\-\(\)\s]+$/;
      if (!phoneRegex.test(customer.phone)) {
        warnings.push({
          field: 'phone',
          message: 'Phone number format may be invalid',
          code: 'INVALID_PHONE_FORMAT',
        });
      }
    }

    // Email validation (if provided)
    if (customer.email && typeof customer.email === 'string') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer.email)) {
        errors.push({
          field: 'email',
          message: 'Invalid email format',
          code: 'INVALID_EMAIL',
          severity: 'error',
        });
      }
    }

    // Statistics validation (if provided)
    if (
      customer.total_spent !== undefined &&
      (typeof customer.total_spent !== 'number' || customer.total_spent < 0)
    ) {
      errors.push({
        field: 'total_spent',
        message: 'Total spent must be a non-negative number',
        code: 'INVALID_TOTAL_SPENT',
        severity: 'error',
      });
    }

    if (
      customer.visit_count !== undefined &&
      (typeof customer.visit_count !== 'number' || customer.visit_count < 0)
    ) {
      errors.push({
        field: 'visit_count',
        message: 'Visit count must be a non-negative number',
        code: 'INVALID_VISIT_COUNT',
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Validate expense data
  validateExpenseData(expense: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Amount validation
    if (expense.amount === undefined || expense.amount === null) {
      errors.push({
        field: 'amount',
        message: 'Expense amount is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    } else if (typeof expense.amount !== 'number' || expense.amount <= 0) {
      errors.push({
        field: 'amount',
        message: 'Expense amount must be a positive number',
        code: 'INVALID_AMOUNT',
        severity: 'error',
      });
    }

    // Category validation
    if (!expense.category_id && !expense.category) {
      errors.push({
        field: 'category',
        message: 'Expense category is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }

    // Description validation
    if (
      !expense.description ||
      typeof expense.description !== 'string' ||
      expense.description.trim().length === 0
    ) {
      warnings.push({
        field: 'description',
        message: 'Expense description is recommended for better tracking',
        code: 'MISSING_DESCRIPTION',
      });
    }

    // Date validation
    if (!expense.date) {
      errors.push({
        field: 'date',
        message: 'Expense date is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    } else if (!this.isValidDate(expense.date)) {
      errors.push({
        field: 'date',
        message: 'Invalid date format',
        code: 'INVALID_DATE',
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Validate stock movement data
  validateStockMovementData(movement: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Product validation
    if (!movement.product_id && !movement.product_name) {
      errors.push({
        field: 'product',
        message: 'Product ID or name is required for stock movement',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }

    // Type validation
    if (!movement.type || !['stock_in', 'stock_out'].includes(movement.type)) {
      errors.push({
        field: 'type',
        message: 'Movement type must be either "stock_in" or "stock_out"',
        code: 'INVALID_TYPE',
        severity: 'error',
      });
    }

    // Quantity validation
    if (
      movement.quantity === undefined ||
      typeof movement.quantity !== 'number' ||
      movement.quantity <= 0
    ) {
      errors.push({
        field: 'quantity',
        message: 'Movement quantity must be a positive number',
        code: 'INVALID_QUANTITY',
        severity: 'error',
      });
    }

    // Unit cost validation (if provided)
    if (
      movement.unit_cost !== undefined &&
      (typeof movement.unit_cost !== 'number' || movement.unit_cost <= 0)
    ) {
      errors.push({
        field: 'unit_cost',
        message: 'Unit cost must be a positive number if provided',
        code: 'INVALID_UNIT_COST',
        severity: 'error',
      });
    }

    // Reason validation for stock_out
    if (
      movement.type === 'stock_out' &&
      (!movement.reason || movement.reason.trim().length === 0)
    ) {
      warnings.push({
        field: 'reason',
        message: 'Reason is recommended for stock_out movements',
        code: 'MISSING_REASON',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Validate bulk pricing data
  validateBulkPricingData(pricing: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Product validation
    if (!pricing.product_id && !pricing.productId && !pricing.productName) {
      errors.push({
        field: 'product',
        message: 'Product ID or name is required for bulk pricing',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    }

    // Bulk tiers validation
    if (
      !pricing.bulkTiers ||
      !Array.isArray(pricing.bulkTiers) ||
      pricing.bulkTiers.length === 0
    ) {
      errors.push({
        field: 'bulkTiers',
        message: 'At least one bulk pricing tier is required',
        code: 'REQUIRED_FIELD',
        severity: 'error',
      });
    } else {
      pricing.bulkTiers.forEach((tier: any, index: number) => {
        if (
          tier.min_quantity === undefined ||
          typeof tier.min_quantity !== 'number' ||
          tier.min_quantity <= 0
        ) {
          errors.push({
            field: `bulkTiers[${index}].min_quantity`,
            message: 'Minimum quantity must be a positive number',
            code: 'INVALID_MIN_QUANTITY',
            severity: 'error',
          });
        }

        if (
          tier.bulk_price === undefined ||
          typeof tier.bulk_price !== 'number' ||
          tier.bulk_price <= 0
        ) {
          errors.push({
            field: `bulkTiers[${index}].bulk_price`,
            message: 'Bulk price must be a positive number',
            code: 'INVALID_BULK_PRICE',
            severity: 'error',
          });
        }
      });

      // Check for overlapping or duplicate tiers
      const sortedTiers = [...pricing.bulkTiers].sort(
        (a, b) => a.min_quantity - b.min_quantity
      );
      for (let i = 1; i < sortedTiers.length; i++) {
        if (sortedTiers[i].min_quantity === sortedTiers[i - 1].min_quantity) {
          errors.push({
            field: 'bulkTiers',
            message: 'Duplicate minimum quantities found in bulk pricing tiers',
            code: 'DUPLICATE_MIN_QUANTITY',
            severity: 'error',
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Validate file format
  validateFileFormat(fileContent: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const data = JSON.parse(fileContent);

      // Check for required top-level fields
      if (!data.version) {
        warnings.push({
          field: 'version',
          message: 'Export version not specified, assuming compatibility',
          code: 'MISSING_VERSION',
        });
      }

      if (!data.exportDate) {
        warnings.push({
          field: 'exportDate',
          message: 'Export date not specified',
          code: 'MISSING_EXPORT_DATE',
        });
      }

      if (!data.dataType) {
        errors.push({
          field: 'dataType',
          message: 'Data type not specified in export file',
          code: 'MISSING_DATA_TYPE',
          severity: 'error',
        });
      }

      if (!data.data) {
        errors.push({
          field: 'data',
          message: 'No data section found in export file',
          code: 'MISSING_DATA_SECTION',
          severity: 'error',
        });
      }
    } catch (parseError) {
      errors.push({
        field: 'file',
        message: 'Invalid JSON format',
        code: 'INVALID_JSON',
        severity: 'error',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Validate data structure
  validateDataStructure(data: any, expectedType: string): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!data || typeof data !== 'object') {
      errors.push({
        field: 'data',
        message: 'Data must be an object',
        code: 'INVALID_DATA_STRUCTURE',
        severity: 'error',
      });
      return { isValid: false, errors, warnings };
    }

    switch (expectedType) {
      case 'products':
        if (!data.products || !Array.isArray(data.products)) {
          errors.push({
            field: 'products',
            message: 'Products data must be an array',
            code: 'INVALID_PRODUCTS_STRUCTURE',
            severity: 'error',
          });
        }
        break;

      case 'sales':
        if (!data.sales || !Array.isArray(data.sales)) {
          errors.push({
            field: 'sales',
            message: 'Sales data must be an array',
            code: 'INVALID_SALES_STRUCTURE',
            severity: 'error',
          });
        }
        break;

      case 'customers':
        if (!data.customers || !Array.isArray(data.customers)) {
          errors.push({
            field: 'customers',
            message: 'Customers data must be an array',
            code: 'INVALID_CUSTOMERS_STRUCTURE',
            severity: 'error',
          });
        }
        break;

      case 'expenses':
        if (!data.expenses || !Array.isArray(data.expenses)) {
          errors.push({
            field: 'expenses',
            message: 'Expenses data must be an array',
            code: 'INVALID_EXPENSES_STRUCTURE',
            severity: 'error',
          });
        }
        break;

      case 'stock_movements':
        if (!data.stockMovements || !Array.isArray(data.stockMovements)) {
          errors.push({
            field: 'stockMovements',
            message: 'Stock movements data must be an array',
            code: 'INVALID_STOCK_MOVEMENTS_STRUCTURE',
            severity: 'error',
          });
        }
        break;

      case 'bulk_pricing':
        if (!data.bulkPricing || !Array.isArray(data.bulkPricing)) {
          errors.push({
            field: 'bulkPricing',
            message: 'Bulk pricing data must be an array',
            code: 'INVALID_BULK_PRICING_STRUCTURE',
            severity: 'error',
          });
        }
        break;

      case 'complete':
        // For complete backups, check that at least some data exists
        const hasAnyData =
          data.products ||
          data.sales ||
          data.customers ||
          data.expenses ||
          data.stockMovements ||
          data.bulkPricing;
        if (!hasAnyData) {
          errors.push({
            field: 'data',
            message: 'Complete backup must contain at least one data type',
            code: 'EMPTY_BACKUP',
            severity: 'error',
          });
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Validate references between data
  validateReferences(
    data: any,
    existingData: DatabaseSnapshot
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate product category references
    if (data.products && Array.isArray(data.products)) {
      data.products.forEach((product: any, index: number) => {
        if (
          product.category &&
          !existingData.categories.find((c) => c.name === product.category)
        ) {
          warnings.push({
            field: `products[${index}].category`,
            message: `Category "${product.category}" not found in existing data`,
            code: 'MISSING_CATEGORY_REFERENCE',
          });
        }
      });
    }

    // Validate customer references in sales
    if (data.sales && Array.isArray(data.sales)) {
      data.sales.forEach((sale: any, index: number) => {
        if (
          sale.customer_name &&
          !existingData.customers.find((c) => c.name === sale.customer_name)
        ) {
          warnings.push({
            field: `sales[${index}].customer_name`,
            message: `Customer "${sale.customer_name}" not found in existing data`,
            code: 'MISSING_CUSTOMER_REFERENCE',
          });
        }
      });
    }

    // Validate expense category references
    if (data.expenses && Array.isArray(data.expenses)) {
      data.expenses.forEach((expense: any, index: number) => {
        if (
          expense.category &&
          !existingData.expenseCategories.find(
            (c) => c.name === expense.category
          )
        ) {
          warnings.push({
            field: `expenses[${index}].category`,
            message: `Expense category "${expense.category}" not found in existing data`,
            code: 'MISSING_EXPENSE_CATEGORY_REFERENCE',
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Check data integrity
  checkDataIntegrity(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for data consistency
    if (data.integrity && data.integrity.recordCounts) {
      const counts = data.integrity.recordCounts;

      if (data.products && counts.products !== data.products.length) {
        warnings.push({
          field: 'integrity',
          message: 'Product count mismatch between data and integrity check',
          code: 'COUNT_MISMATCH',
        });
      }

      if (data.sales && counts.sales !== data.sales.length) {
        warnings.push({
          field: 'integrity',
          message: 'Sales count mismatch between data and integrity check',
          code: 'COUNT_MISMATCH',
        });
      }
    }

    // Check for duplicate entries
    if (data.products && Array.isArray(data.products)) {
      const names = data.products.map((p: any) => p.name);
      const duplicateNames = names.filter(
        (name: string, index: number) => names.indexOf(name) !== index
      );
      if (duplicateNames.length > 0) {
        warnings.push({
          field: 'products',
          message: `Duplicate product names found: ${duplicateNames.join(
            ', '
          )}`,
          code: 'DUPLICATE_PRODUCTS',
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // Helper method to validate date strings
  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}
