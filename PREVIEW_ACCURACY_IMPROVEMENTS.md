# Preview Accuracy Improvements

## Problem

The template preview in the WebView was not matching the actual PDF template output due to aggressive responsive CSS overrides that changed font sizes and layout proportions.

## Solution

Enhanced the preview system to maintain template accuracy while being responsive for mobile viewing.

## Changes Made

### 1. Improved Responsive Preview CSS (`getResponsivePreviewCSS`)

**Before:**

- Used `clamp()` functions with `!important` declarations
- Overrode font sizes with viewport-based scaling
- Lost the relationship between actual template and preview

**After:**

- Uses CSS custom properties (variables) for consistent scaling
- Maintains font size ratios between elements
- Scales down proportionally (0.4x) for mobile viewing
- Preserves template layout and spacing

### 2. Enhanced Font Size Scaling (`applyFontSizeScaling`)

**Added CSS Variables:**

```css
:root {
  --shop-name-size: 48px;
  --shop-details-size: 36px;
  --item-name-size: 40px;
  --item-details-size: 36px;
  --item-discount-size: 32px;
  --total-size: 48px;
  --footer-size: 32px;
  --info-size: 36px;
}
```

**Preview Scaling:**

```css
.shop-name {
  font-size: calc(var(--shop-name-size) * 0.4);
}
```

This ensures the preview maintains the same font size relationships as the actual template.

### 3. Improved WebView Configuration

**Enhanced Settings:**

- `scalesPageToFit={false}` - Prevents automatic scaling
- `javaScriptEnabled={false}` - Improves security and performance
- `startInLoadingState={true}` - Better loading experience
- Added shadow and better styling for preview container

**Better Visual Presentation:**

- Increased preview height to 500px
- Added preview header showing template name and font size
- Improved container styling with shadows
- Better background colors to match actual output

### 4. Preview Header Information

Added informative header showing:

- Template name (Classic, Modern, Minimal)
- Current font size setting
- Clear visual separation

## Font Size Scaling Accuracy

### Scaling Factor: 0.4x for Mobile Preview

| Element      | Actual Size | Preview Size | Maintains Ratio |
| ------------ | ----------- | ------------ | --------------- |
| Shop Name    | 48px        | 19.2px       | ✅              |
| Item Name    | 40px        | 16px         | ✅              |
| Item Details | 36px        | 14.4px       | ✅              |
| Total        | 48px        | 19.2px       | ✅              |

### Font Size Variations

| Font Setting       | Shop Name Actual | Shop Name Preview | Ratio Maintained |
| ------------------ | ---------------- | ----------------- | ---------------- |
| Small (0.8x)       | 38px             | 15.2px            | ✅               |
| Medium (1.0x)      | 48px             | 19.2px            | ✅               |
| Large (1.3x)       | 62px             | 24.8px            | ✅               |
| Extra Large (1.6x) | 77px             | 30.8px            | ✅               |

## Benefits

1. **Accurate Preview**: Preview now matches actual PDF output proportions
2. **Font Size Consistency**: Users see exactly how different font sizes will look
3. **Better UX**: Clear preview header shows current settings
4. **Responsive Design**: Still works well on mobile devices
5. **Performance**: Optimized WebView settings for better rendering
6. **Visual Polish**: Enhanced styling with shadows and proper spacing

## Testing

Created `testPreviewAccuracy.ts` to verify:

- Font size ratios match between preview and actual
- CSS variables are properly applied
- Responsive CSS is included in preview
- All templates work correctly with all font sizes

## Result

The template preview now accurately represents what users will see in their printed receipts, making the template selection process much more reliable and user-friendly.
