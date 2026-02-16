import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ScrollView,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  House as Home,
  ShoppingCart,
  History,
  Package,
  RotateCcw,
  AlertTriangle,
  BarChart3,
  Users,
  Brain,
  Truck,
  DollarSign,
  Store,
  ShieldCheck,
  Globe,
  FileUp,
  FileDown,
  X,
  FolderTree,
  Tag,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { DrawerMenuItem, MenuItem } from './DrawerMenuItem';

const DRAWER_WIDTH = 280;

/**
 * Menu group definition
 */
interface MenuGroup {
  id: string;
  label: string;
  items: MenuItem[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoute: string;
}

/**
 * Sidebar component with animated slide-in/out from left
 * Displays navigation menu items in a flat structure
 * Optimized with useMemo and useCallback for performance (Requirement 8.4)
 */
export function Sidebar({ isOpen, onClose, currentRoute }: SidebarProps) {
  const { t } = useTranslation();

  // Animated values for slide and overlay animations
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Track active item position for auto-scroll
  const scrollViewRef = useRef<ScrollView>(null);

  // Memoize menu groups configuration to prevent recreation on every render (Requirement 8.4)
  const menuGroups: MenuGroup[] = useMemo(
    () => [
      // Dashboard - standalone at top
      {
        id: 'main',
        label: '',
        items: [
          {
            id: 'dashboard',
            label: t('navigation.dashboard'),
            icon: Home,
            route: '/(drawer)/dashboard',
          },
        ],
      },
      // Sales group
      {
        id: 'sales',
        label: t('navigation.groupSales'),
        items: [
          {
            id: 'sale',
            label: t('navigation.sales'),
            icon: ShoppingCart,
            route: '/(drawer)/sale',
          },
          {
            id: 'sale-history',
            label: t('sales.salesHistory'),
            icon: History,
            route: '/(drawer)/sale-history',
          },
        ],
      },
      // Inventory group
      {
        id: 'inventory',
        label: t('navigation.groupInventory'),
        items: [
          {
            id: 'product-management',
            label: t('products.title'),
            icon: Package,
            route: '/(drawer)/product-management',
          },
          {
            id: 'category-management',
            label: t('categories.manageCategories'),
            icon: FolderTree,
            route: '/(drawer)/category-management',
          },
          {
            id: 'movement-history',
            label: t('stockMovement.history'),
            icon: RotateCcw,
            route: '/(drawer)/movement-history',
          },
          {
            id: 'low-stock',
            label: t('inventory.lowStockAlert'),
            icon: AlertTriangle,
            route: '/(drawer)/low-stock',
          },
        ],
      },
      // Analytics & Reports group
      {
        id: 'analytics',
        label: t('navigation.groupAnalytics'),
        items: [
          {
            id: 'overview',
            label: t('navigation.overview'),
            icon: BarChart3,
            route: '/(drawer)/overview',
          },
          {
            id: 'customer-analytics',
            label: t('navigation.customerAnalytics'),
            icon: Users,
            route: '/(drawer)/customer-analytics',
          },
          // {
          //   id: 'ai-analytics',
          //   label: t('aiAnalytics.title'),
          //   icon: Brain,
          //   route: '/(drawer)/ai-analytics',
          // },
        ],
      },
      // Contacts group
      {
        id: 'contacts',
        label: t('navigation.groupContacts'),
        items: [
          {
            id: 'customers',
            label: t('customers.customers'),
            icon: Users,
            route: '/(drawer)/customer-management',
          },
          {
            id: 'suppliers',
            label: t('suppliers.title'),
            icon: Truck,
            route: '/(drawer)/supplier-management',
          },
        ],
      },
      // Financial group
      {
        id: 'financial',
        label: t('navigation.groupFinancial'),
        items: [
          {
            id: 'expenses',
            label: t('expenses.title'),
            icon: DollarSign,
            route: '/(drawer)/expenses',
          },
          {
            id: 'expense-categories',
            label: t('expenses.expenseCategories'),
            icon: Tag,
            route: '/(drawer)/expense-category-management',
          },
        ],
      },
      // Settings group
      {
        id: 'settings',
        label: t('navigation.groupSettings'),
        items: [
          {
            id: 'shop-settings',
            label: t('shopSettings.title'),
            icon: Store,
            route: '/(drawer)/shop-settings',
          },
          {
            id: 'license-management',
            label: t('license.title'),
            icon: ShieldCheck,
            route: '/(drawer)/license-management',
          },
          {
            id: 'language-settings',
            label: t('languageSettings.title'),
            icon: Globe,
            route: '/(drawer)/language-settings',
          },
          {
            id: 'data-export',
            label: t('dataExport.title'),
            icon: FileUp,
            route: '/(drawer)/data-export',
          },
          {
            id: 'data-import',
            label: t('dataImport.title'),
            icon: FileDown,
            route: '/(drawer)/data-import',
          },
        ],
      },
    ],
    [t],
  );

  // Memoize close handler to prevent recreation (Requirement 8.4)
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Animation logic for opening/closing drawer
  // Uses native driver and easing for optimal performance (Requirement 8.4)
  useEffect(() => {
    let slideAnimation: Animated.CompositeAnimation | null = null;
    let overlayAnimation: Animated.CompositeAnimation | null = null;

    if (isOpen) {
      // Open animations with easing for natural motion
      slideAnimation = Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      overlayAnimation = Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      });

      Animated.parallel([slideAnimation, overlayAnimation]).start();
    } else {
      // Close animations with easing for natural motion
      slideAnimation = Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      });
      overlayAnimation = Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      });

      Animated.parallel([slideAnimation, overlayAnimation]).start();
    }

    // Cleanup function to stop animations on unmount or state change (Requirement 8.3)
    return () => {
      // Stop any ongoing animations
      if (slideAnimation) {
        slideAnimation.stop();
      }
      if (overlayAnimation) {
        overlayAnimation.stop();
      }
      slideAnim.stopAnimation();
      overlayAnim.stopAnimation();

      // Reset animation values to final state if component unmounts
      if (!isOpen) {
        slideAnim.setValue(-DRAWER_WIDTH);
        overlayAnim.setValue(0);
      }
    };
  }, [isOpen, slideAnim, overlayAnim]);

  // Auto-scroll to active menu item when drawer opens
  useEffect(() => {
    if (isOpen && scrollViewRef.current) {
      // Delay to ensure drawer animation completes and layout is ready
      const timer = setTimeout(() => {
        // Normalize current route
        const normalizedCurrentRoute = currentRoute.startsWith('/(drawer)')
          ? currentRoute
          : `/(drawer)${currentRoute}`;

        // Calculate cumulative Y position by iterating through menu groups
        let cumulativeY = 8; // Initial padding from paddingVertical: 8
        let found = false;

        for (const group of menuGroups) {
          // Add group label height if it exists
          if (group.label) {
            cumulativeY += 16 + 8 + 20; // paddingTop + paddingBottom + approximate text height
          }

          // Check each item in the group
          for (const item of group.items) {
            if (item.route === normalizedCurrentRoute) {
              found = true;
              break;
            }
            // Add menu item height (minHeight 44 + marginVertical 2*2)
            cumulativeY += 48;
          }

          if (found) break;

          // Add group separator height
          cumulativeY += 12;
        }

        if (found) {
          console.log('Calculated cumulative Y:', cumulativeY);
          // Scroll to position with some offset to show item nicely
          const scrollPosition = Math.max(0, cumulativeY - 100);
          console.log('Scrolling to position:', scrollPosition);

          scrollViewRef.current?.scrollTo({
            y: scrollPosition,
            animated: true,
          });
        }
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [isOpen, currentRoute, menuGroups]);

  // Don't render if not open (performance optimization - Requirement 8.2)
  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Overlay with fade animation */}
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayAnim,
            pointerEvents: isOpen ? 'auto' : 'none',
          },
        ]}
        onTouchEnd={handleClose}
      />

      {/* Drawer with slide animation */}
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Mobile POS</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              accessibilityLabel="Close navigation menu"
              accessibilityRole="button"
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.menuContainer}
            showsVerticalScrollIndicator={false}
          >
            {menuGroups.map((group, groupIndex) => (
              <View key={group.id}>
                {/* Group label - only show if label exists */}
                {group.label && (
                  <Text style={styles.groupLabel}>{group.label}</Text>
                )}

                {/* Group items */}
                {group.items.map((item) => (
                  <DrawerMenuItem
                    key={item.id}
                    item={item}
                    currentRoute={currentRoute}
                    onPress={handleClose}
                  />
                ))}

                {/* Spacing between groups - except for last group */}
                {groupIndex < menuGroups.length - 1 && (
                  <View style={styles.groupSeparator} />
                )}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'NotoSansMyanmar-Bold',
    color: '#111827',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  groupLabel: {
    fontSize: 11,
    fontFamily: 'NotoSansMyanmar-Bold',
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  groupSeparator: {
    height: 12,
  },
});
