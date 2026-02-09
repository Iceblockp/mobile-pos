# Product Management - Page-Based Navigation

## Overview

Converting product management from modal-based to page-based navigation for better UX and cleaner code structure.

## New Pages Created

### 1. Product Detail Page ✅

**File:** `app/(drawer)/product-detail.tsx`

- Full-page product details view
- Shows all product information (price, cost, profit, stock, supplier, bulk pricing)
- Edit and Delete action buttons
- Back navigation to product list
- Route: `/(drawer)/product-detail?id={productId}`

### 2. Product Form Page (To Create)

**File:** `app/(drawer)/product-form.tsx`

- Single page for both create and edit modes
- Mode determined by URL params: `?mode=create` or `?mode=edit&id={productId}`
- Full-screen form with all product fields
- Save and Cancel buttons
- Route: `/(drawer)/product-form?mode=create` or `/(drawer)/product-form?mode=edit&id={productId}`

## ProductsManager Changes Required

### Current Modal-Based Flow

```
ProductsManager (List)
  ├─ FAB → showAddForm modal
  ├─ Edit button → showAddForm modal (with product data)
  └─ Card tap → ProductDetailModal
```

### New Page-Based Flow

```
ProductsManager (List)
  ├─ FAB → Navigate to product-form?mode=create
  ├─ Edit button → Navigate to product-form?mode=edit&id={id}
  └─ Card tap → Navigate to product-detail?id={id}
```

## Implementation Steps

### Step 1: Update ProductsManager Navigation

**Replace modal state with navigation:**

```typescript
// REMOVE these states:
const [showAddForm, setShowAddForm] = useState(false);
const [editingProduct, setEditingProduct] = useState<Product | null>(null);
const [showProductDetail, setShowProductDetail] = useState(false);
const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

// REMOVE all form-related states (formData, numericValues, bulkPricingTiers, etc.)
```

**Update handlers to use navigation:**

```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

// FAB handler - navigate to create page
const handleAddNew = () => {
  router.push('/(drawer)/product-form?mode=create');
};

// Edit handler - navigate to edit page
const handleEdit = (product: Product) => {
  router.push(`/(drawer)/product-form?mode=edit&id=${product.id}`);
};

// Card tap handler - navigate to detail page
const handleProductPress = (product: Product) => {
  router.push(`/(drawer)/product-detail?id=${product.id}`);
};
```

### Step 2: Remove Modal Components

**Remove these entire sections from ProductsManager:**

1. Product Add/Edit Form Modal (large modal with all form fields)
2. ProductDetailModal component usage
3. All form submission logic (handleSubmit function)
4. All form reset logic (resetForm function)
5. Image picker functions (pickImage, takePhoto)
6. Barcode scanner for product form

### Step 3: Simplify ProductCard Component

**Update ProductCard to use navigation:**

```typescript
const ProductCard = React.memo(({ product }: { product: Product }) => {
  const router = useRouter();

  const handlePress = useCallback(() => {
    router.push(`/(drawer)/product-detail?id=${product.id}`);
  }, [product.id]);

  const handleEditPress = useCallback((e: any) => {
    e.stopPropagation();
    router.push(`/(drawer)/product-form?mode=edit&id=${product.id}`);
  }, [product.id]);

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <Card style={styles.productCard}>
        {/* ... card content ... */}
        <TouchableOpacity onPress={handleEditPress}>
          <Edit size={16} color="#6B7280" />
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  );
});
```

### Step 4: Create Product Form Page

**File:** `app/(drawer)/product-form.tsx`

This page should include:

- Header with back button and title ("Add Product" or "Edit Product")
- ScrollView with all form fields:
  - Product image picker
  - Name input
  - Barcode input with scanner button
  - Category selector
  - Price input
  - Cost input
  - Quantity input
  - Min stock input
  - Supplier selector
  - Bulk pricing tiers component
- Save and Cancel buttons at bottom
- Form validation
- Loading states
- Success/error handling

**Key features:**

```typescript
export default function ProductForm() {
  const { mode, id } = useLocalSearchParams<{ mode: 'create' | 'edit'; id?: string }>();
  const router = useRouter();
  const isEditMode = mode === 'edit';

  // Load product data if editing
  const { data: product } = useProduct(id || '', { enabled: isEditMode });

  // Form state and handlers
  // ... (similar to current modal form logic)

  const handleSave = async () => {
    // Validate and save
    // Navigate back on success
    router.back();
  };

  return (
    <SafeAreaView>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft />
        </TouchableOpacity>
        <Text>{isEditMode ? 'Edit Product' : 'Add Product'}</Text>
      </View>

      <ScrollView>
        {/* All form fields */}
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Cancel" onPress={() => router.back()} />
        <Button title="Save" onPress={handleSave} />
      </View>
    </SafeAreaView>
  );
}
```

## Benefits

### User Experience

- **Better Navigation**: Standard page navigation feels more natural
- **Back Button**: Native back button works correctly
- **Deep Linking**: Can link directly to product detail or edit pages
- **State Preservation**: Navigation stack preserves scroll position
- **Cleaner UI**: No modal overlays, full-screen forms

### Technical

- **Simpler Code**: ProductsManager becomes much simpler (just list + FAB)
- **Separation of Concerns**: Each page has single responsibility
- **Easier Testing**: Can test pages independently
- **Better Performance**: Only load form code when needed
- **Maintainability**: Easier to modify individual pages

## File Structure

```
app/(drawer)/
├── product-management.tsx      # List view with FAB
├── product-detail.tsx          # ✅ Product details page
└── product-form.tsx            # Create/Edit form page (to create)

components/inventory/
└── ProductsManager.tsx         # Simplified list component
```

## Migration Checklist

- [x] Create product-detail.tsx page
- [ ] Create product-form.tsx page
- [ ] Update ProductsManager to remove modals
- [ ] Update ProductsManager to use navigation
- [ ] Remove form-related state from ProductsManager
- [ ] Remove ProductDetailModal usage
- [ ] Update ProductCard to navigate on tap
- [ ] Update edit button to navigate
- [ ] Update FAB to navigate
- [ ] Test create flow
- [ ] Test edit flow
- [ ] Test detail view flow
- [ ] Test back navigation
- [ ] Test deep linking

## Testing Scenarios

1. **Create Product**
   - Tap FAB → Navigate to form → Fill form → Save → Return to list → See new product

2. **Edit Product**
   - Tap edit icon → Navigate to form → Modify data → Save → Return to list → See changes

3. **View Details**
   - Tap product card → Navigate to detail → See all info → Tap edit → Navigate to form

4. **Navigation**
   - Back button works from all pages
   - Can navigate between pages multiple times
   - State is preserved when returning to list

5. **Deep Linking**
   - Can open product detail directly with URL
   - Can open product edit directly with URL

## Notes

- The product form page will be similar to the current modal form but as a full page
- All existing form logic can be reused in the new page
- The ProductsManager will become much simpler (< 1000 lines instead of 3000+)
- This pattern matches other management pages (customers, suppliers, etc.)
