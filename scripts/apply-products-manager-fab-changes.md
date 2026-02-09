# Apply ProductsManager FAB Changes

## Manual Steps Required

The ProductsManager.tsx file is too large (3050 lines) for automated replacement. Please apply these changes manually:

### Step 1: Remove Category Functions (Lines 308-680 approximately)

Delete these four functions entirely:

1. `resetCategoryForm()` - starts around line 308
2. `handleCategorySubmit()` - starts around line 516
3. `handleEditCategory()` - starts around line 583
4. `handleDeleteCategory()` - starts around line 615

### Step 2: Remove Add Button from Header (Line ~1236)

Find and DELETE:

```typescript
<TouchableOpacity
  style={styles.compactAddButton}
  onPress={handleAddNew}
>
  <Plus size={16} color="#FFFFFF" />
</TouchableOpacity>
```

### Step 3: Remove Category Menu Item (Line ~1284)

Find and DELETE:

```typescript
<TouchableOpacity
  style={styles.actionMenuItem}
  onPress={() => {
    setShowCategoryModal(true);
    setShowActionsMenu(false);
  }}
>
  <View style={styles.actionMenuItemContent}>
    <Settings size={16} color="#6B7280" />
    <Text style={styles.actionMenuItemText}>
      {t('products.categories')}
    </Text>
  </View>
</TouchableOpacity>
```

### Step 4: Remove Category Modal (Lines ~1895-2020)

Find and DELETE the entire Category Management Modal block starting with:

```typescript
{/* Category Management Modal */}
<Modal
  visible={showCategoryModal}
  ...
</Modal>
```

### Step 5: Add FAB Before Closing View

Find the end of the return statement (before `</View>` around line 2030) and ADD:

```typescript
      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddNew}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}
```

### Step 6: Add FAB Style

In the StyleSheet.create section, ADD:

```typescript
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
```

## Verification

After changes:

1. No TypeScript errors
2. FAB appears in bottom-right
3. Tapping FAB opens add product form
4. No category modal appears
5. Actions menu has no "Manage Categories" option

## Already Completed

✅ Removed `FolderPlus` from imports
✅ Removed `useCategoryMutations` from imports  
✅ Removed `showCategoryModal` state
✅ Removed `editingCategory` state
✅ Removed `categoryFormData` state
✅ Removed category mutations declaration
