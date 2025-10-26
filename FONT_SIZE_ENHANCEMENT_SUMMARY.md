# Font Size Enhancement Summary

## Overview

Enhanced the receipt template system to support user-selectable font sizes with proper scaling for both fonts and page dimensions.

## Changes Made

### 1. Shop Settings Storage (`services/shopSettingsStorage.ts`)

- Added `receiptFontSize` field to `ShopSettings` and `ShopSettingsInput` interfaces
- Supported values: `'small' | 'medium' | 'large' | 'extra-large'`
- Default value: `'medium'`
- Added validation for font size settings
- Updated all related methods to handle the new field

### 2. Template Engine (`services/templateEngine.ts`)

- **Font Weight Improvements**: Enhanced font weights for better visibility and professional appearance

  - Shop name: `font-weight: 900` (extra bold)
  - Item names: `font-weight: 800` (bold)
  - Item details (quantity, price, subtotal): `font-weight: 700` (bold)
  - Discount amounts: `font-weight: 700` (bold)
  - Receipt info (date, payment method): `font-weight: 600` (semi-bold)
  - Total amounts: `font-weight: 900` (extra bold)
  - Thank you messages: `font-weight: 800` (bold)

- **Font Size Scaling System**:

  - Added `getFontSizeMultiplier()` method with scaling factors:

    - Small: 0.8x
    - Medium: 1.0x (baseline)
    - Large: 1.3x
    - Extra Large: 1.6x

  - Added `getBaseFontSizes()` method defining base sizes for different elements:

    - Body: 36px
    - Shop name: 48px
    - Shop details: 36px
    - Receipt info: 36px
    - Item name: 40px
    - Item details: 36px
    - Item discount: 32px
    - Total: 48px
    - Footer: 32px

  - Added `applyFontSizeScaling()` method to dynamically scale CSS font sizes

- **Dynamic Page Height Calculation**:

  - Updated height calculation to scale with font size
  - Base height: `9 * fontSizeMultiplier`
  - Item height: `1.5 * fontSizeMultiplier` per item
  - Total height: `baseHeight + (itemCount * itemHeightMultiplier)`

- **Template Context Enhancement**:
  - Added `fontSize` parameter to `TemplateContext` interface
  - Updated `buildTemplateContext()` to accept and use font size
  - Updated `previewTemplate()` to support font size parameter

### 3. Shop Settings Service (`services/shopSettingsService.ts`)

- Updated `previewTemplate()` method to accept and pass through font size parameter
- Ensures font size is applied to both preview and actual receipt generation

### 4. Receipt Template Selector (`components/ReceiptTemplateSelector.tsx`)

- **New Font Size Selector UI**:

  - Added font size selection interface with 4 options
  - Visual indicators for selected font size
  - Descriptive labels for each size option
  - Integrated with existing template selector

- **Props Enhancement**:

  - Added `selectedFontSize` and `onFontSizeChange` props
  - Updated component to regenerate previews when font size changes

- **Preview Regeneration**:
  - Added automatic preview regeneration when font size changes
  - Only regenerates preview for currently expanded template
  - Proper loading states during regeneration

### 5. Shop Settings Screen (`app/shop-settings.tsx`)

- Added `receiptFontSize` to form data with default value `'medium'`
- Updated form initialization to include font size from existing settings
- Connected font size selector to form state management
- Passes font size props to `ReceiptTemplateSelector` component

## Font Size Scaling Details

### Scaling Factors

- **Small (0.8x)**: Compact text for space-saving
- **Medium (1.0x)**: Standard size (current default)
- **Large (1.3x)**: Bigger text for better readability
- **Extra Large (1.6x)**: Maximum size for accessibility

### Example Font Sizes

| Element   | Small | Medium | Large | Extra Large |
| --------- | ----- | ------ | ----- | ----------- |
| Body      | 29px  | 36px   | 47px  | 58px        |
| Shop Name | 38px  | 48px   | 62px  | 77px        |
| Item Name | 32px  | 40px   | 52px  | 64px        |
| Total     | 38px  | 48px   | 62px  | 77px        |

### Page Height Scaling

| Font Size   | Base Height | Per Item | 3 Items Total |
| ----------- | ----------- | -------- | ------------- |
| Small       | 7.2in       | 1.2in    | 10.8in        |
| Medium      | 9.0in       | 1.5in    | 13.5in        |
| Large       | 11.7in      | 1.95in   | 17.55in       |
| Extra Large | 14.4in      | 2.4in    | 21.6in        |

## Benefits

1. **User Customization**: Users can choose font size based on their printer and readability needs
2. **Better Accessibility**: Larger fonts for users with vision difficulties
3. **Printer Compatibility**: Smaller fonts for thermal printers with limited paper width
4. **Professional Appearance**: Bolder fonts for more professional-looking receipts
5. **Dynamic Scaling**: Page height automatically adjusts to prevent content cutoff
6. **Live Preview**: Users can see font size changes immediately in template previews

## Testing

Created test scripts to verify:

- Font size scaling accuracy
- Page height calculation correctness
- Template generation with different font sizes
- Preview regeneration functionality

## Backward Compatibility

- Default font size is `'medium'` (1.0x scaling)
- Existing receipts will use medium size if no font size is specified
- All existing templates work with the new font scaling system
- No breaking changes to existing APIs
