import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { MenuButton } from '@/components/MenuButton';
import { useDrawer } from '@/context/DrawerContext';
import Expenses from '@/components/ExpensesManager';
import { MyanmarText as Text } from '@/components/MyanmarText';

export default function ExpensesPage() {
  const { t } = useTranslation();
  const { openDrawer } = useDrawer();
  const [triggerAddExpense, setTriggerAddExpense] = useState(0);

  const handleAddExpense = () => {
    // Trigger the add expense modal in ExpensesManager
    setTriggerAddExpense((prev) => prev + 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with menu button */}
      <View style={styles.header}>
        <MenuButton onPress={openDrawer} />
        <View style={styles.headerContent}>
          <Text style={styles.title} weight="bold">
            {t('expenses.title')}
          </Text>
        </View>
      </View>

      {/* Expenses Manager Component */}
      <View style={styles.content}>
        <Expenses triggerAdd={triggerAddExpense} />
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddExpense}>
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
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
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 20,
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
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
});
