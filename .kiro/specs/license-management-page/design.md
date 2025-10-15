# Design Document

## Overview

The License Management feature adds a dedicated page accessible from the More tab that allows users to view their current license status and extend their license duration. The design leverages the existing license validation system and extends it to support license duration extensions by adding new validity periods to the current expiry date.

## Architecture

### Navigation Integration

- Add "License Management" menu item to the More tab
- Create new route `/license-management`
- Use existing router navigation pattern

### License Extension Flow

```
Current License Valid → License Management Page → Select Duration → Generate Challenge → Enter Response → Extend License
```

### Data Flow

1. **License Status Display**: Use existing `useLicense` hook to get current license information
2. **Extension Process**: Generate new challenge with selected duration, validate response, then extend current expiry date
3. **State Management**: Update license status in storage with new extended expiry date

## Components and Interfaces

### New Components

#### LicenseManagementPage (`app/license-management.tsx`)

- Main page component displaying current license status
- License extension interface
- Contact information section

#### LicenseExtensionModal (`components/LicenseExtensionModal.tsx`)

- Modal for license extension process
- Duration selection
- Challenge display and response input
- Success/error feedback

### Modified Components

#### More Tab (`app/(tabs)/more.tsx`)

- Add "License Management" menu item with Shield icon
- Position after "Shop Settings" in the menu grid

### Hook Extensions

#### useLicense Hook Enhancement

Add new method `extendLicense(validityMonths: number, responseCode: string)`:

- Validates response code against current challenge
- Calculates new expiry date by adding extension to current expiry
- Updates license status with extended expiry date
- Returns success/failure status

## Data Models

### License Extension Interface

```typescript
interface LicenseExtension {
  currentExpiryDate: string;
  extensionMonths: number;
  newExpiryDate: string;
  challenge: Challenge;
}
```

### Extended License Status

The existing `LicenseStatus` interface supports the extension functionality without modification.

## Error Handling

### Validation Errors

- Invalid response code: Display clear error message
- Expired current license: Redirect to main license validation
- Network/storage errors: Show retry option with error details

### Edge Cases

- License already expired: Treat as new license activation
- Invalid challenge generation: Regenerate challenge automatically
- Storage failures: Maintain current state, show error message

## Testing Strategy

### Unit Tests

- License extension calculation logic
- Challenge generation for extensions
- Date manipulation and validation
- Error handling scenarios

### Integration Tests

- Complete license extension flow
- Navigation from More tab to License Management
- Storage persistence of extended license
- UI state updates after successful extension

### E2E Tests

- Full user journey: More tab → License Management → Extension → Success
- License extension with various duration packages
- Error scenarios and recovery flows

## UI/UX Design

### License Management Page Layout

```
Header: Current License Status
├── License Status Badge (Active/Expiring/Expired)
├── Current Expiry Date
├── Days Remaining
└── License Type/Duration

Extension Section:
├── "Extend License" Button
├── Available Duration Packages
└── Extension Benefits

Contact Section:
├── Support Phone Number
└── Help Information
```

### Visual Design Principles

- Clean, minimal interface following existing app design
- Clear status indicators with appropriate colors
- Consistent button and card styling
- Accessible typography and spacing

### User Experience Flow

1. **Entry**: User taps "License Management" from More tab
2. **Status Review**: User sees current license information clearly
3. **Extension Decision**: User chooses to extend license
4. **Duration Selection**: User selects extension duration
5. **Validation**: User completes challenge-response validation
6. **Confirmation**: User sees updated license information

## Implementation Notes

### License Extension Logic

```typescript
// Calculate new expiry date by adding extension to current expiry
const currentExpiry = new Date(parseExpiryDate(currentLicense.expiryDate));
const extensionMonths = selectedPackage.validityMonths;
const newExpiry = new Date(currentExpiry);
newExpiry.setMonth(newExpiry.getMonth() + extensionMonths);
```

### Challenge Generation for Extensions

- Use existing `generateChallenge()` function
- Generate challenge with extension duration
- Maintain same validation mechanism
- Store extension challenge separately from current license

### Storage Strategy

- Update existing license status with new expiry date
- Maintain license history for audit purposes
- Use existing storage utilities (`saveLicenseStatus`, `getLicenseStatus`)

### Localization Support

- Add new translation keys for license management
- Support existing language switching
- Maintain consistent terminology with main license page
