import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/context/LocalizationContext';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { CustomerAnalytics } from '@/components/CustomerAnalytics';
import { MenuButton } from '@/components/MenuButton';
import { useDrawer } from '@/context/DrawerContext';

/**
 * Customer Analytics page for drawer navigation
 *
 * Features:
 * - Customer analytics and insights
 * - Customer purchase history
 * - Customer segmentation
 * - Includes MenuButton for sidebar navigation
 *
 * Requirements:
 * - 2.1: MenuButton appears in top-left corner
 */
export default function CustomerAnalyticsPage() {
  const { t } = useTranslation();
  const { openDrawer } = useDrawer();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MenuButton onPress={openDrawer} />
        </View>
        <View style={styles.headerCenter}>
          <Text style={styles.title} weight="bold">
            {t('analytics.customers')}
          </Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.content}>
        <CustomerAnalytics customerId={undefined} />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    width: 44,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 44,
  },
  title: {
    fontSize: 28,
    color: '#111827',
  },
  content: {
    flex: 1,
  },
});
