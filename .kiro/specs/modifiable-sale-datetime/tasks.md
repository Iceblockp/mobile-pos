# Implementation Plan

- [x] 1. Create SaleDateTimeSelector component

  - Create a new component that displays current date/time in compact format
  - Implement tap handler to open native date/time picker
  - Add proper styling and localization support
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [x] 2. Update database service to support custom created_at timestamps

  - Modify addSale method to accept optional created_at parameter
  - Update SQL INSERT statement to use provided timestamp when available
  - Ensure proper timestamp formatting for SQLite storage
  - _Requirements: 2.4_

- [x] 3. Integrate SaleDateTimeSelector into sales interface

  - Add saleDateTime state to sales.tsx component
  - Position SaleDateTimeSelector component in cart header area
  - Connect date/time changes to component state
  - Reset timestamp when cart is cleared
  - _Requirements: 1.1, 1.2, 3.2_

- [x] 4. Update sale processing to use selected timestamp

  - Modify processSale function to include selected timestamp in saleData
  - Pass timestamp to addSale database method
  - Ensure fallback to current time when no custom time is set
  - _Requirements: 2.3, 2.4_

- [x] 5. Add localization support for date/time display

  - Add translation keys for date/time formatting
  - Implement proper date formatting using existing localization system
  - Test with both English and Myanmar locales
  - _Requirements: 1.3_

- [x] 6. Write unit tests for new functionality

  - Test SaleDateTimeSelector component rendering and interactions
  - Test database addSale method with custom timestamps
  - Test date/time formatting functions
  - _Requirements: All requirements_

- [ ] 7. Write integration tests for complete sales flow
  - Test sales creation with modified timestamps
  - Test sales creation with default timestamps (unchanged behavior)
  - Verify timestamp accuracy in created sales
  - _Requirements: 2.3, 2.4, 3.1_
