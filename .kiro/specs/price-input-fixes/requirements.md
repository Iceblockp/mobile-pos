# Requirements Document

## Introduction

This spec addresses two critical issues in the inventory system:

1. Missing translation key "common.optional" causing repeated warning logs
2. Infinite rendering issue in PriceInput component when typing in product create modal

## Requirements

### Requirement 1: Fix Missing Translation Key

**User Story:** As a user, I want the app to display proper translations without console warnings, so that the app runs smoothly without performance issues.

#### Acceptance Criteria

1. WHEN the app loads inventory page THEN no "Translation key not found: common.optional" warnings SHALL appear in console
2. WHEN StockMovementForm displays optional fields THEN proper translation text SHALL be shown instead of missing key warnings
3. WHEN the app switches between English and Myanmar languages THEN the optional field labels SHALL display correctly in both languages

### Requirement 2: Fix PriceInput Infinite Rendering

**User Story:** As a user, I want to type in price input fields without performance issues, so that I can efficiently add and edit product information.

#### Acceptance Criteria

1. WHEN user opens product create modal THEN the modal SHALL load without infinite re-renders
2. WHEN user types in price input field THEN the input SHALL respond normally without causing performance issues
3. WHEN user changes price values THEN the component SHALL update once per change without triggering additional re-renders
4. WHEN PriceInput component receives external value changes THEN it SHALL sync properly without creating render loops
