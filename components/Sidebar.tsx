import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Chrome as Home,
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
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { DrawerMenuItem, MenuItem } from './DrawerMenuItem';

const DRAWER_WIDTH = 280;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoute: string;
}

/**
 * Sidebar component with animated slide-in/out from left
 * Displays navigation menu items in a flat structure
 */
export function Sidebar({ isOpen, onClose, currentRoute }: SidebarProps) {
  const { t } = useTranslation();

  // Animated values for slide and overlay animations
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Menu items configuration with 17 flat items
  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: t('navigation.dashboard'),
      icon: Home,
      route: '/(drawer)/dashboard',
    },
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
    {
      id: 'product-management',
      label: t('products.title'),
      icon: Package,
      route: '/(drawer)/product-management',
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
    {
      id: 'overview',
      label: t('navigation.overview'),
      icon: BarChart3,
      route: '/(drawer)/overview',
    },
    {
      id: 'customer-analytics',
      label: t('reports.analytics'),
      icon: Users,
      route: '/(drawer)/customer-analytics',
    },
    {
      id: 'ai-analytics',
      label: t('aiAnalytics.title'),
      icon: Brain,
      route: '/(drawer)/ai-analytics',
    },
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
    {
      id: 'expenses',
      label: t('expenses.title'),
      icon: DollarSign,
      route: '/(drawer)/expenses',
    },
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
  ];

  // Animation logic for opening/closing drawer
  useEffect(() => {
    if (isOpen) {
      // Open animations
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Close animations
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Cleanup function to stop animations on unmount
    return () => {
      slideAnim.stopAnimation();
      overlayAnim.stopAnimation();
    };
  }, [isOpen, slideAnim, overlayAnim]);

  // Don't render if not open (performance optimization)
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
        onTouchEnd={onClose}
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
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close navigation menu"
              accessibilityRole="button"
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <ScrollView
            style={styles.menuContainer}
            showsVerticalScrollIndicator={false}
          >
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
});
