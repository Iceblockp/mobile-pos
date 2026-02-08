import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { EnhancedMovementHistory } from '@/components/inventory/EnhancedMovementHistory';
import { MovementSummary } from '@/components/MovementSummary';
import { MenuButton } from '@/components/MenuButton';
import { useDrawer } from '@/context/DrawerContext';
import { useTranslation } from '@/context/LocalizationContext';

/**
 * Movement History Page
 * Dedicated page for viewing stock movements (extracted from inventory tab)
 *
 * Features:
 * - Complete stock movement history
 * - Filter by type (stock in/out), product, supplier, date range
 * - Search functionality
 * - Movement summary statistics
 *
 * Requirements:
 * - 4.2: Navigate to stock movements page from sidebar
 * - 4.5: Display all stock movements with filtering options
 */
export default function MovementHistory() {
  const { openDrawer } = useDrawer();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with menu button */}
      <View style={styles.header}>
        <MenuButton onPress={openDrawer} />
        <Text style={styles.title} weight="bold">
          {t('stockMovement.history')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Reuse existing EnhancedMovementHistory component with summary */}
      <View style={styles.content}>
        <EnhancedMovementHistory
          showProductName={true}
          showFilters={true}
          headerComponent={<MovementSummary />}
        />
      </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
});
