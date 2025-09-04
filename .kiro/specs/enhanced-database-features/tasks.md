# Implementation Plan

## Database Layer Implementation

- [x] 1. Create new database interfaces and types

  - Define TypeScript interfaces for Customer, StockMovement, and BulkPricing entities
  - Update existing Product and Sale interfaces to include new optional fields
  - Add proper type definitions for enhanced database operations
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 2. Implement database migration system for new tables

  - Create migration method for customers table with proper indexes
  - Create migration method for stock_movements table with optional supplier relationship
  - Create migration method for bulk_pricing table with product relationships
  - Add migration for sales table to include optional customer_id field
  - Implement rollback mechanism for failed migrations
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 3. Enhance DatabaseService with customer management methods

  - Implement addCustomer, updateCustomer, deleteCustomer methods
  - Create getCustomers with search and pagination functionality
  - Add getCustomerById and getCustomerPurchaseHistory methods
  - Implement customer statistics calculation (total_spent, visit_count)
  - _Requirements: 2.1, 2.4, 10.4_

- [x] 4. Implement stock movement tracking methods

  - Create addStockMovement method for stock_in and stock_out operations
  - Implement getStockMovements with filtering by product, type, date range
  - Add getStockMovementsByProduct for product-specific history
  - Create updateProductQuantityWithMovement method for atomic operations
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [x] 5. Add bulk pricing management methods

  - Implement addBulkPricing, updateBulkPricing, deleteBulkPricing methods
  - Create getBulkPricingForProduct method for price tier retrieval
  - Add calculateBestPrice method for automatic bulk discount application
  - Implement validateBulkPricingTiers for business rule enforcement
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2_

- [x] 6. Update existing sales methods for customer integration
  - Modify addSale method to accept optional customer_id parameter
  - Update getSales methods to include customer information in joined queries
  - Add getSalesByCustomer method for customer purchase history
  - Implement updateCustomerStatistics method called during sales processing
  - _Requirements: 2.2, 2.3, 5.3, 5.4_

## Service Layer and Hooks Implementation

- [x] 7. Create React Query hooks for customer management

  - Implement useCustomers hook with search and pagination
  - Create useCustomer hook for individual customer data
  - Add useCustomerMutations hook for add/update/delete operations
  - Implement useCustomerPurchaseHistory hook for sales data
  - _Requirements: 2.1, 2.4, 8.2_

- [x] 8. Implement stock movement React Query hooks

  - Create useStockMovements hook with filtering capabilities
  - Add useStockMovementsByProduct hook for product-specific history
  - Implement useStockMovementMutations hook for add operations
  - Create useProductStockSummary hook for combined stock and movement data
  - _Requirements: 3.4, 3.6, 8.1_

- [x] 9. Add bulk pricing React Query hooks

  - Implement useBulkPricing hook for product pricing tiers
  - Create useBulkPricingMutations hook for tier management
  - Add useBulkPriceCalculation hook for real-time price calculations
  - _Requirements: 4.4, 5.1, 8.3_

- [x] 10. Update existing hooks for enhanced functionality
  - Modify useProducts hook to include bulk pricing data when needed
  - Update useSales hooks to include customer information
  - Enhance useProductMutations to handle bulk pricing updates
  - _Requirements: 4.4, 2.3, 6.5_

## User Interface Implementation

- [x] 11. Create customer management components

  - Implement CustomerSelector component for sales customer selection
  - Create CustomerForm modal component for add/edit customer operations
  - Add CustomerList component integrated into existing design patterns
  - Implement CustomerCard component for customer display
  - _Requirements: 2.1, 2.2, 6.1, 6.2_

- [x] 12. Integrate customer selection into sales flow

  - Add optional customer selector to sales cart header
  - Implement customer search with autocomplete functionality
  - Create quick "Add New Customer" option during sales
  - Ensure customer selection remains unobtrusive to existing sales flow
  - _Requirements: 2.2, 6.4, 6.5_

- [x] 13. Implement stock movement interface components

  - Create StockMovementForm modal for adding stock in/out operations
  - Implement MovementHistory component following existing list patterns
  - Add MovementSummary stats cards matching current design
  - Create quick stock adjustment buttons in inventory views
  - _Requirements: 3.4, 3.5, 6.3_

- [x] 14. Add bulk pricing configuration to product management

  - Integrate bulk pricing section into existing ProductsManager form
  - Create BulkPricingTiers component for tier management
  - Add bulk pricing display in product cards and lists
  - Implement validation for bulk pricing business rules
  - _Requirements: 4.1, 4.4, 6.3_

- [x] 15. Enhance sales interface for bulk pricing display

  - Update product selection dialog to show bulk pricing tiers
  - Modify cart items to display bulk discounts when applied
  - Add bulk pricing indicators in product lists
  - Ensure automatic price calculation updates cart totals
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 16. Integrate stock movement access into inventory management
  - Add stock movement history tab to inventory overview
  - Create contextual stock movement access from product details
  - Implement quick stock in/out actions in product cards
  - Add stock movement filtering and search capabilities
  - _Requirements: 3.6, 6.3_

## Enhanced Analytics and Reporting

- [ ] 17. Implement customer analytics features

  - Create customer purchase pattern analysis methods
  - Add customer lifetime value calculations
  - Implement customer segmentation based on purchase behavior
  - Create customer analytics dashboard components
  - _Requirements: 10.1, 10.4_

- [ ] 18. Add stock movement analytics and reporting

  - Implement stock movement trend analysis
  - Create stock turnover rate calculations
  - Add stock movement reporting with export functionality
  - Implement low stock prediction based on movement patterns
  - _Requirements: 10.2, 10.5, 9.3_

- [ ] 19. Enhance sales analytics with bulk pricing insights
  - Add bulk discount impact measurement to sales analytics
  - Implement bulk pricing effectiveness reporting
  - Create revenue analysis including bulk discount effects
  - Add bulk pricing optimization suggestions
  - _Requirements: 10.3, 5.5_

## Data Import/Export Enhancement

- [ ] 20. Extend export functionality for new data types

  - Add customer data export with purchase history
  - Implement stock movement export with filtering options
  - Include bulk pricing information in product exports
  - Create comprehensive business data export combining all entities
  - _Requirements: 9.1, 9.3, 9.4_

- [ ] 21. Implement import functionality for enhanced data
  - Create customer data import with validation and conflict resolution
  - Add bulk pricing import for product configuration
  - Implement stock movement import for historical data migration
  - Add data validation and error handling for all import operations
  - _Requirements: 9.2, 9.5_

## Performance Optimization and Testing

- [ ] 22. Implement performance optimizations for new features

  - Add proper database indexes for customer, stock movement, and bulk pricing queries
  - Implement pagination for all new list views
  - Add React Query caching strategies for enhanced data
  - Optimize bulk pricing calculations for real-time performance
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 23. Create comprehensive test suite for enhanced features

  - Write unit tests for all new database methods
  - Implement integration tests for customer management flow
  - Add tests for stock movement tracking accuracy
  - Create tests for bulk pricing calculation correctness
  - Test migration safety and rollback functionality
  - _Requirements: 7.4, 8.5_

- [ ] 24. Perform end-to-end testing and optimization
  - Test complete customer management workflow
  - Validate stock movement tracking through various scenarios
  - Test bulk pricing application in sales scenarios
  - Verify data integrity across all enhanced features
  - Optimize performance based on testing results
  - _Requirements: 6.6, 8.4, 8.5_
