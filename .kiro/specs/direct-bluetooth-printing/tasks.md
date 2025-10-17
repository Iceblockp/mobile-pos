# Implementation Plan

- [x] 1. Setup project for Bluetooth development

  - Switch from Expo Go to Expo Development Build
  - Install required Bluetooth dependencies
  - Configure permissions for iOS and Android
  - _Requirements: 1.1, 2.1_

- [x] 2. Create ESC/POS converter utility

  - Write simple ESC/POS command generator for Xprinter P300
  - Convert receipt data to thermal printer format (58mm width)
  - Handle basic text formatting and alignment
  - _Requirements: 1.2, 3.2_

- [x] 3. Implement Bluetooth printer service

  - Create BluetoothPrinterService with basic connection methods
  - Add printer scanning and pairing functionality
  - Implement simple print method for ESC/POS commands
  - _Requirements: 1.1, 2.1, 2.2_

- [x] 4. Create dedicated printer settings page

  - Create app/printer-settings.tsx page for thermal printer configuration
  - Create ThermalPrinterSettings component for printer pairing and management
  - Add printer storage using AsyncStorage
  - _Requirements: 2.2, 2.3_

- [x] 5. Add printer settings navigation to More tab

  - Add "Printer Settings" menu item to app/(tabs)/more.tsx
  - Include printer icon and navigation to printer-settings page
  - Position appropriately in the More tab menu structure
  - _Requirements: 2.1_

- [x] 6. Enhance EnhancedPrintManager with direct printing

  - Add "Print Direct" button to existing print options
  - Integrate BluetoothPrinterService for direct printing
  - Implement fallback to PDF sharing on Bluetooth failure
  - _Requirements: 1.1, 1.3, 3.3_

- [ ] 7. Create basic unit tests

  - Test ESC/POS converter with sample receipt data
  - Test BluetoothPrinterService with mocked Bluetooth operations
  - Test ThermalPrinterSettings component interactions
  - _Requirements: 1.1, 2.1, 3.1_

- [ ] 8. Add error handling and user feedback

  - Handle Bluetooth connection failures gracefully
  - Show clear error messages for printer issues
  - Ensure PDF fallback always works
  - _Requirements: 1.3, 3.3_

- [ ] 9. Test with physical Xprinter P300
  - Test printer pairing and connection
  - Verify receipt formatting on thermal paper
  - Test error scenarios and fallback behavior
  - _Requirements: 1.1, 1.2, 1.3_
