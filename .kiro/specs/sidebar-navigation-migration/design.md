# Design Document: Sidebar Navigation Migration

## Overview

This design document outlines the technical approach for migrating a React Native Expo mobile POS application from tab-based navigation to sidebar (drawer) navigation. The solution leverages React Native's Animated API, Expo Router's file-based routing, and custom drawer components to create a smooth, performant navigation experience.

The migration strategy focuses on minimal disruption to existing code by creating a new layout wrapper that can coexist with the current tab navigation during the transition period. The sidebar will be implemented as a custom component rather than using a third-party library to maintain full control over styling and behavior.

## Architecture

### Navigation Structure

The application will use a hybrid navigation approach during migration:

1. **Root Layout** (`app/_layout.tsx`): Remains unchanged, providing context providers
2. **Drawer Layout** (`app/(drawer)/_layout.tsx`): New layout wrapping all main screens
3. **Screen Routes**: Individual pages accessible from the sidebar
4. **Legacy Tab Layout**: Maintained temporarily for backward compatibility

### File Structure

```
app/
├── _layout.tsx                    # Root layout (existing)
├── (drawer)/                      # New drawer navigation group
│   ├── _layout.tsx               # Drawer layout with sidebar
│   ├── dashboard.tsx             # Dashboard page
│   ├── sale.tsx                  # Current sale interface
│   ├── sale-history.tsx          # NEW: Extracted from modal
│   ├── product-management.tsx    # Products list
│   ├── movement-history.tsx      # Stock movements
│   ├── low-stock.tsx             # Low stock overview
│   ├── overview.tsx              # NEW: Analytics overview (from reports tab)
│   ├── customer-analytics.tsx    # NEW: Customer analytics (from reports tab)
│   ├── ai-analytics.tsx          # NEW: AI analytics (from reports tab)
│   ├── customer-management.tsx   # Customer management (from more tab)
│   ├── supplier-management.tsx   # Supplier management (from more tab)
│   ├── expenses.tsx              # Expenses (from more tab)
│   ├── shop-settings.tsx         # Shop settings (from more tab)
│   ├── license-management.tsx    # License management (from more tab)
│   ├── language-settings.tsx     # Language settings (from more tab)
│   ├── data-export.tsx           # Data export (from more tab)
│   └── data-import.tsx           # Data import (from more tab)
├── (tabs)/                        # Legacy tab navigation (temporary)
│   └── ...                       # Existing tab screens
└── ...                           # Other routes (settings, etc.)
```

### Component Architecture

```
DrawerLayout
├── DrawerProvider (Context)
│   └── Drawer state management
├── MenuButton
│   └── Hamburger icon trigger
├── Sidebar
│   ├── Overlay
│   ├── DrawerContent
│   │   ├── MenuItem (regular)
│   │   └── SubmenuItem (expandable)
│   └── Animations
└── Screen Content
    └── Page components
```

## Components and Interfaces

### 1. DrawerContext

Manages the global state of the drawer (open/closed) and provides methods to control it.

```typescript
interface DrawerContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

// Context provider wraps the drawer layout
const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

// Custom hook for accessing drawer state
function useDrawer(): DrawerContextType {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error('useDrawer must be used within DrawerProvider');
  }
  return context;
}
```

### 2. Sidebar Component

The main sidebar component that slides in from the left.

```typescript
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoute: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  route: string;
  submenu?: MenuItem[];
}

// Sidebar component structure
function Sidebar({ isOpen, onClose, currentRoute }: SidebarProps) {
  // Animated value for slide animation
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Menu items configuration
  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: t('navigation.dashboard'), icon: Home, route: '/(drawer)/dashboard' },
    { id: 'sale', label: t('navigation.sale'), icon: ShoppingCart, route: '/(drawer)/sale' },
    { id: 'sale-history', label: t('navigation.saleHistory'), icon: History, route: '/(drawer)/sale-history' },
    { id: 'products', label: t('navigation.products'), icon: Package, route: '/(drawer)/product-management' },
    { id: 'categories', label: t('navigation.categories'), icon: FolderTree, route: '/(drawer)/category-management' },
    { id: 'movements', label: t('navigation.movements'), icon: RotateCcw, route: '/(drawer)/movement-history' },
    { id: 'low-stock', label: t('navigation.lowStock'), icon: AlertTriangle, route: '/(drawer)/low-stock' },
    { id: 'overview', label: t('navigation.overview'), icon: BarChart3, route: '/(drawer)/overview' },
    { id: 'customer-analytics', label: t('navigation.customerAnalytics'), icon: Users, route: '/(drawer)/customer-analytics' },
    { id: 'ai-analytics', label: t('navigation.aiAnalytics'), icon: Brain, route: '/(drawer)/ai-analytics' },
    { id: 'customers', label: t('navigation.customers'), icon: Users, route: '/(drawer)/customer-management' },
    { id: 'suppliers', label: t('navigation.suppliers'), icon: Truck, route: '/(drawer)/supplier-management' },
    { id: 'expenses', label: t('navigation.expenses'), icon: DollarSign, route: '/(drawer)/expenses' },
    { id: 'shop-settings', label: t('navigation.shopSettings'), icon: Store, route: '/(drawer)/shop-settings' },
    { id: 'license', label: t('navigation.licenseManagement'), icon: ShieldCheck, route: '/(drawer)/license-management' },
    { id: 'language', label: t('navigation.language'), icon: Globe, route: '/(drawer)/language-settings' },
    { id: 'export', label: t('navigation.dataExport'), icon: FileUp, route: '/(drawer)/data-export' },
    { id: 'import', label: t('navigation.dataImport'), icon: FileDown, route: '/(drawer)/data-import' },
  ];

  // Animation logic
  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 250,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          opacity: overlayAnim,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        onTouchEnd={onClose}
      />

      {/* Drawer */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: DRAWER_WIDTH,
          backgroundColor: '#FFFFFF',
          transform: [{ translateX: slideAnim }],
          shadowColor: '#000',
          shadowOffset: { width: 2, height: 0 },
          shadowOpacity: 0.25,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView>
            {/* Header */}
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Mobile POS</Text>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Menu Items */}
            {menuItems.map((item) => (
              <DrawerMenuItem
                key={item.id}
                item={item}
                currentRoute={currentRoute}
                onPress={onClose}
              />
            ))}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </>
  );
}
```

### 3. DrawerMenuItem Component

Renders individual menu items in a flat structure.

```typescript
interface DrawerMenuItemProps {
  item: MenuItem;
  currentRoute: string;
  onPress: () => void;
}

function DrawerMenuItem({ item, currentRoute, onPress }: DrawerMenuItemProps) {
  const router = useRouter();
  const isActive = currentRoute === item.route;

  const handlePress = () => {
    router.push(item.route);
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.menuItem,
        isActive && styles.menuItemActive,
      ]}
      onPress={handlePress}
    >
      <item.icon
        size={20}
        color={isActive ? '#059669' : '#6B7280'}
      />
      <Text
        style={[
          styles.menuItemText,
          isActive && styles.menuItemTextActive,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}
```

### 4. MenuButton Component

The hamburger menu button that appears in the top-left corner of each page.

```typescript
interface MenuButtonProps {
  onPress: () => void;
  style?: ViewStyle;
}

function MenuButton({ onPress, style }: MenuButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.menuButton, style]}
      onPress={onPress}
      accessibilityLabel="Open navigation menu"
      accessibilityRole="button"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Menu size={24} color="#111827" />
    </TouchableOpacity>
  );
}

// Styles
const styles = StyleSheet.create({
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
});
```

### 5. DrawerLayout Component

The main layout component that wraps all drawer screens.

```typescript
function DrawerLayout() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const drawerContext: DrawerContextType = {
    isOpen,
    openDrawer: () => setIsOpen(true),
    closeDrawer: () => setIsOpen(false),
    toggleDrawer: () => setIsOpen(!isOpen),
  };

  return (
    <DrawerContext.Provider value={drawerContext}>
      <View style={{ flex: 1 }}>
        {/* Screen content */}
        <Slot />

        {/* Sidebar overlay */}
        <Sidebar
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          currentRoute={pathname}
        />
      </View>
    </DrawerContext.Provider>
  );
}
```

## Data Models

### Navigation Configuration

```typescript
// Menu item type definition
type MenuItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  route: string;
};

// Drawer state
type DrawerState = {
  isOpen: boolean;
};

// Animation configuration
type AnimationConfig = {
  duration: number;
  easing: EasingFunction;
  useNativeDriver: boolean;
};

const DRAWER_CONFIG = {
  width: 280,
  slideInDuration: 250,
  slideOutDuration: 250,
  overlayFadeDuration: 200,
  easing: {
    in: Easing.in(Easing.cubic),
    out: Easing.out(Easing.cubic),
  },
};
```

### Route Mapping

```typescript
// Map old tab routes to new drawer routes
const ROUTE_MIGRATION_MAP: Record<string, string> = {
  '/(tabs)/dashboard': '/(drawer)/dashboard',
  '/(tabs)/sales': '/(drawer)/sale',
  '/(tabs)/inventory': '/(drawer)/product-management',
  '/(tabs)/reports': '/(drawer)/overview',
  '/(tabs)/more': '/(drawer)/customer-management',
};

// Helper function to migrate routes
function migrateRoute(oldRoute: string): string {
  return ROUTE_MIGRATION_MAP[oldRoute] || oldRoute;
}
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Drawer State Consistency

_For any_ sequence of drawer operations (open, close, toggle), the drawer state should always match the visual state of the sidebar.

**Validates: Requirements 1.2, 1.4**

### Property 2: Navigation Preservation

_For any_ navigation action from the sidebar, the current page state should be preserved when returning to that page.

**Validates: Requirements 1.5, 7.4**

### Property 3: Animation Completion

_For any_ drawer animation (open or close), the animation should complete within the specified duration plus a 50ms tolerance.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 4: Menu Item Uniqueness

_For any_ menu configuration, all menu item IDs should be unique across the entire menu structure including submenus.

**Validates: Requirements 1.6**

### Property 5: Route Resolution

_For any_ menu item selection, the navigation system should resolve to a valid route that exists in the routing configuration.

**Validates: Requirements 1.5, 5.5**

### Property 6: Active State Accuracy

_For any_ current route, exactly one menu item should be highlighted as active in the sidebar.

**Validates: Requirements 1.7**

### Property 7: Localization Completeness

_For any_ menu item label, a translation should exist in both English and Myanmar localization files.

**Validates: Requirements 1.8, 9.1, 9.2**

### Property 8: Touch Target Accessibility

_For any_ interactive element in the sidebar (menu items, buttons), the touch target should be at least 44x44 pixels.

**Validates: Requirements 2.4, 9.3**

### Property 9: Overlay Interaction

_For any_ touch event on the overlay when the drawer is open, the drawer should close.

**Validates: Requirements 1.4**

### Property 10: Menu Item Count

_For any_ menu configuration, the sidebar should contain exactly 18 menu items in a flat structure.

**Validates: Requirements 1.6, 5.1, 5.4**

## Error Handling

### Animation Errors

- **Scenario**: Animation fails to complete due to component unmounting
- **Handling**: Use cleanup functions in useEffect to cancel ongoing animations
- **Recovery**: Reset animation values to final state immediately

```typescript
useEffect(() => {
  // Animation code
  return () => {
    // Cleanup: stop animations
    slideAnim.stopAnimation();
    overlayAnim.stopAnimation();
  };
}, [isOpen]);
```

### Route Navigation Errors

- **Scenario**: User navigates to a route that doesn't exist
- **Handling**: Catch navigation errors and show toast notification
- **Recovery**: Redirect to dashboard as fallback

```typescript
const handleNavigation = (route: string) => {
  try {
    router.push(route);
    closeDrawer();
  } catch (error) {
    console.error('Navigation error:', error);
    showToast('Navigation failed. Returning to dashboard.', 'error');
    router.push('/(drawer)/dashboard');
  }
};
```

### Context Access Errors

- **Scenario**: Component tries to use drawer context outside provider
- **Handling**: Throw descriptive error in useDrawer hook
- **Recovery**: Developer must wrap component in DrawerProvider

```typescript
function useDrawer() {
  const context = useContext(DrawerContext);
  if (!context) {
    throw new Error(
      'useDrawer must be used within a DrawerProvider. ' +
        'Wrap your component tree with <DrawerProvider>.',
    );
  }
  return context;
}
```

### Memory Leaks

- **Scenario**: Animated values not cleaned up properly
- **Handling**: Use useRef for animated values and cleanup in useEffect
- **Recovery**: Implement proper cleanup in component unmount

```typescript
useEffect(() => {
  const slideAnimation = Animated.timing(slideAnim, config);
  slideAnimation.start();

  return () => {
    slideAnimation.stop();
    slideAnim.setValue(isOpen ? 0 : -DRAWER_WIDTH);
  };
}, [isOpen]);
```

### Localization Missing Keys

- **Scenario**: Menu item label key doesn't exist in translation file
- **Handling**: Return the key itself as fallback
- **Recovery**: Log warning to console for developer to add translation

```typescript
function getTranslation(key: string): string {
  const translation = t(key);
  if (translation === key) {
    console.warn(`Missing translation for key: ${key}`);
  }
  return translation;
}
```

## Testing Strategy

### Unit Tests

Unit tests will focus on individual components and utility functions:

1. **DrawerContext Tests**
   - Test context provider initialization
   - Test state updates (open, close, toggle)
   - Test error when used outside provider

2. **MenuItem Component Tests**
   - Test rendering with different props
   - Test active state styling
   - Test submenu expansion/collapse
   - Test navigation on press

3. **Animation Utility Tests**
   - Test animation configuration generation
   - Test easing function application
   - Test duration calculations

4. **Route Migration Tests**
   - Test route mapping from old to new structure
   - Test fallback for unmapped routes
   - Test route validation

### Property-Based Tests

Property-based tests will verify universal correctness properties across many generated inputs. Each test should run a minimum of 100 iterations.

1. **Property Test: Drawer State Consistency**
   - **Property 1: Drawer State Consistency**
   - **Validates: Requirements 1.2, 1.4**
   - Generate random sequences of drawer operations
   - Verify state matches visual state after each operation

2. **Property Test: Menu Item Uniqueness**
   - **Property 4: Menu Item Uniqueness**
   - **Validates: Requirements 1.6**
   - Generate random menu configurations
   - Verify all IDs are unique

3. **Property Test: Route Resolution**
   - **Property 5: Route Resolution**
   - **Validates: Requirements 1.5, 5.5**
   - Generate random menu items with routes
   - Verify all routes resolve to valid screens

4. **Property Test: Active State Accuracy**
   - **Property 6: Active State Accuracy**
   - **Validates: Requirements 1.7**
   - Generate random current routes
   - Verify exactly one menu item is active

5. **Property Test: Localization Completeness**
   - **Property 7: Localization Completeness**
   - **Validates: Requirements 1.8, 9.1, 9.2**
   - Generate all menu item label keys
   - Verify translations exist in both languages

6. **Property Test: Touch Target Accessibility**
   - **Property 8: Touch Target Accessibility**
   - **Validates: Requirements 2.4, 9.3**
   - Generate random menu items
   - Verify all touch targets meet minimum size

7. **Property Test: Menu Item Count**
   - **Property 10: Menu Item Count**
   - **Validates: Requirements 1.6, 5.1, 5.4**
   - Verify sidebar contains exactly 18 menu items
   - Verify all items are in flat structure (no nesting)

### Integration Tests

Integration tests will verify component interactions:

1. **Drawer Navigation Flow**
   - Open drawer → select menu item → verify navigation → verify drawer closes
   - Test with all menu items
   - Test with submenu items

2. **Animation Integration**
   - Open drawer → verify slide and overlay animations
   - Close drawer → verify reverse animations
   - Test rapid open/close sequences

3. **Context Integration**
   - Render drawer layout → access context in child → verify state updates
   - Test multiple components accessing same context

4. **Localization Integration**
   - Change language → verify all menu labels update
   - Test with both English and Myanmar

### End-to-End Tests

E2E tests will verify complete user workflows:

1. **Complete Navigation Workflow**
   - Launch app → open drawer → navigate to each page → verify content
   - Test backward navigation
   - Test deep linking

2. **Sale History Extraction**
   - Navigate to sale history → verify data loads
   - Compare with old modal functionality
   - Test filtering and searching

3. **Inventory Feature Separation**
   - Navigate to each inventory page separately
   - Verify independent functionality
   - Test data consistency across pages

### Performance Tests

Performance tests will ensure the navigation remains responsive:

1. **Animation Performance**
   - Measure frame rate during drawer animations
   - Target: 60fps on mid-range devices
   - Test with heavy content in background

2. **Memory Usage**
   - Monitor memory during repeated drawer operations
   - Verify no memory leaks after 100 open/close cycles
   - Test with all pages loaded

3. **Initial Load Time**
   - Measure time from app launch to dashboard render
   - Target: < 2 seconds on mid-range devices
   - Verify lazy loading works correctly

### Testing Tools

- **Unit/Integration Tests**: Jest + React Native Testing Library
- **Property-Based Tests**: fast-check (JavaScript property testing library)
- **E2E Tests**: Detox or Maestro
- **Performance Tests**: React Native Performance Monitor + custom metrics

### Test Configuration

All property-based tests should be configured with:

- Minimum 100 iterations per test
- Seed value for reproducibility
- Timeout of 30 seconds per test
- Tag format: `Feature: sidebar-navigation-migration, Property {number}: {property_text}`
