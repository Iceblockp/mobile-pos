import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyanmarText as Text } from '@/components/MyanmarText';
import ProductsManager from '@/components/inventory/ProductsManager';
import { MenuButton } from '@/components/MenuButton';
import { useDrawer } from '@/context/DrawerContext';
import { useTranslation } from '@/context/LocalizationContext';
import {
  MoreVertical,
  ArrowUpAZ,
  ArrowDownAZ,
  Calendar,
  Grid3X3,
  List,
} from 'lucide-react-native';

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
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'updated_at' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');

  return (
    <TouchableWithoutFeedback
      onPress={() => {
        setShowOptionsMenu(false);
        setShowSortOptions(false);
      }}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header with menu button */}
        <View style={styles.header}>
          <MenuButton onPress={openDrawer} />
          <Text style={styles.title} weight="bold">
            {t('inventory.products')}
          </Text>
          <TouchableOpacity
            style={styles.moreButton}
            onPress={() => setShowOptionsMenu(!showOptionsMenu)}
          >
            <MoreVertical size={20} color="#111827" />
          </TouchableOpacity>

          {/* Options Dropdown Menu */}
          {showOptionsMenu && (
            <View style={styles.optionsMenu}>
              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={() => {
                  setShowSortOptions(!showSortOptions);
                  setShowOptionsMenu(false);
                }}
              >
                <View style={styles.optionsMenuItemContent}>
                  {sortBy === 'name' ? (
                    sortOrder === 'asc' ? (
                      <ArrowUpAZ size={18} color="#059669" />
                    ) : (
                      <ArrowDownAZ size={18} color="#059669" />
                    )
                  ) : (
                    <Calendar size={18} color="#059669" />
                  )}
                  <Text style={styles.optionsMenuItemText}>
                    {t('products.sort')} {sortOrder === 'asc' ? '↑' : '↓'}
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.optionsMenuDivider} />

              <TouchableOpacity
                style={styles.optionsMenuItem}
                onPress={() => {
                  setViewMode(viewMode === 'card' ? 'table' : 'card');
                  setShowOptionsMenu(false);
                }}
              >
                <View style={styles.optionsMenuItemContent}>
                  {viewMode === 'card' ? (
                    <List size={18} color="#059669" />
                  ) : (
                    <Grid3X3 size={18} color="#059669" />
                  )}
                  <Text style={styles.optionsMenuItemText}>
                    {viewMode === 'card'
                      ? t('products.tableView')
                      : t('products.cardView')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Sort Options - appears when sort is selected */}
          {showSortOptions && (
            <View style={styles.sortOptionsMenu}>
              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortBy === 'updated_at' &&
                    sortOrder === 'desc' &&
                    styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSortBy('updated_at');
                  setSortOrder('desc');
                  setShowSortOptions(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === 'updated_at' &&
                      sortOrder === 'desc' &&
                      styles.sortOptionTextActive,
                  ]}
                >
                  Newest First
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortBy === 'updated_at' &&
                    sortOrder === 'asc' &&
                    styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSortBy('updated_at');
                  setSortOrder('asc');
                  setShowSortOptions(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === 'updated_at' &&
                      sortOrder === 'asc' &&
                      styles.sortOptionTextActive,
                  ]}
                >
                  Oldest First
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortBy === 'name' &&
                    sortOrder === 'asc' &&
                    styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSortBy('name');
                  setSortOrder('asc');
                  setShowSortOptions(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === 'name' &&
                      sortOrder === 'asc' &&
                      styles.sortOptionTextActive,
                  ]}
                >
                  Name A-Z
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortOption,
                  sortBy === 'name' &&
                    sortOrder === 'desc' &&
                    styles.sortOptionActive,
                ]}
                onPress={() => {
                  setSortBy('name');
                  setSortOrder('desc');
                  setShowSortOptions(false);
                }}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    sortBy === 'name' &&
                      sortOrder === 'desc' &&
                      styles.sortOptionTextActive,
                  ]}
                >
                  Name Z-A
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Reuse existing ProductsManager component */}
        <ProductsManager
          compact={false}
          sortBy={sortBy}
          sortOrder={sortOrder}
          viewMode={viewMode}
        />
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  optionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  optionsMenuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionsMenuItemText: {
    fontSize: 15,
    color: '#111827',
  },
  optionsMenuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  sortOptionsMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1001,
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortOptionActive: {
    backgroundColor: '#F0FDF4',
  },
  sortOptionText: {
    fontSize: 15,
    color: '#374151',
  },
  sortOptionTextActive: {
    color: '#059669',
    fontWeight: '500',
  },
});
