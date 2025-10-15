# Implementation Plan

- [x] 1. Add license management navigation to More tab

  - Modify `app/(tabs)/more.tsx` to include "License Management" menu item
  - Add Shield icon and appropriate styling
  - Position after "Shop Settings" in the menu grid
  - _Requirements: 1.1, 1.2_

- [x] 2. Extend useLicense hook with license extension functionality

  - Add `extendLicense(validityMonths: number, responseCode: string)` method to `hooks/useLicense.ts`
  - Implement logic to calculate new expiry date by adding extension months to current expiry
  - Add validation for extension process
  - Return success/failure status and updated license information
  - _Requirements: 2.3, 4.2_

- [x] 3. Create license management page component

  - Create `app/license-management.tsx` with current license status display
  - Show license expiry date, remaining days, and status badge
  - Add license extension section with "Extend License" button
  - Include contact information section
  - _Requirements: 1.3, 1.4, 3.1, 3.2, 3.3, 5.1, 5.2, 5.3_

- [x] 4. Create license extension modal component

  - Create `components/LicenseExtensionModal.tsx` for extension process
  - Include duration selection using existing LICENSE_PACKAGES
  - Display challenge code and response input fields
  - Add success/error feedback handling
  - _Requirements: 2.1, 2.2, 4.1, 4.4_

- [x] 5. Add localization support for license management

  - Add translation keys to `locales/en.ts` and `locales/my.ts`
  - Include keys for license management page, extension process, and status messages
  - Ensure consistent terminology with existing license system
  - _Requirements: 1.1, 2.4, 3.1, 3.2, 3.3, 4.4, 5.1_

- [x] 6. Implement license extension success handling

  - Update license management page to refresh data after successful extension
  - Display success message with new expiry date
  - Handle navigation back to license management page
  - _Requirements: 2.4, 4.3_

- [x] 7. Add error handling for license extension process

  - Handle invalid response codes with clear error messages
  - Manage expired license scenarios
  - Add retry functionality for failed operations
  - _Requirements: 4.4_

- [x] 8. Create unit tests for license extension functionality

  - Test license extension calculation logic in `__tests__/unit/licenseExtension.test.ts`
  - Test date manipulation and validation
  - Test error handling scenarios
  - _Requirements: 2.3, 4.2, 4.4_

- [x] 9. Create integration tests for license management flow

  - Test complete license extension process in `__tests__/integration/licenseManagement.integration.test.ts`
  - Test navigation from More tab to License Management
  - Test UI state updates after successful extension
  - _Requirements: 1.2, 2.4, 4.3_

- [x] 10. Add warning indicators for expiring licenses
  - Implement logic to detect licenses expiring within 30 days
  - Add visual warning indicators on license management page
  - Display appropriate warning messages
  - _Requirements: 3.4_
