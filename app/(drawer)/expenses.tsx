import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '@/context/LocalizationContext';
import { MenuButton } from '@/components/MenuButton';
import { useDrawer } from '@/context/DrawerContext';
import Expenses from '@/components/ExpensesManager';
import { MyanmarText as Text } from '@/components/MyanmarText';

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { openDrawer } = useDrawer();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with menu button */}
      <View style={styles.header}>
        <MenuButton onPress={openDrawer} />
        <View style={styles.headerContent}>
          <Text style={styles.title} weight="medium">
            {t('expenses.title')}
          </Text>
        </View>
      </View>

      {/* Expenses Manager Component */}
      <View style={styles.content}>
        <Expenses />
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
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
    marginLeft: 8,
  },
  title: {
    fontSize: 20,
    color: '#111827',
  },
  content: {
    flex: 1,
  },
});
