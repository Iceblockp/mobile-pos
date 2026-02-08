import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyanmarText as Text } from '@/components/MyanmarText';
import ProductsManager from '@/components/inventory/ProductsManager';
import { MenuButton } from '@/components/MenuButton';
import { useDrawer } from '@/context/DrawerContext';
import { useTranslation } from '@/context/LocalizationContext';

/**
 * Product Management Page
 * Dedicated page for managing products (extracted from inventory tab)
 *
 * Features:
 * - Full product list with search and filtering
 * - Add, edit, and delete products
 * - Bulk pricing management
 * - Category management
 * - Barcode scanning
 * - Image upload
 *
 * Requirements:
 * - 4.1: Navigate to products list page from sidebar
 * - 4.4: Display all products with search and filter functionality
 */
export default function ProductManagement() {
  const { openDrawer } = useDrawer();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with menu button */}
      <View style={styles.header}>
        <MenuButton onPress={openDrawer} />
        <Text style={styles.title} weight="bold">
          {t('inventory.products')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Reuse existing ProductsManager component */}
      <ProductsManager compact={false} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  title: {
    fontSize: 24,
    color: '#111827',
    flex: 1,
  },
  headerSpacer: {
    width: 44, // Match MenuButton width for centering
  },
});
