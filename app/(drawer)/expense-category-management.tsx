import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Edit, Trash2, Tag, X } from 'lucide-react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { MenuButton } from '@/components/MenuButton';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useDrawer } from '@/context/DrawerContext';
import { useExpenseCategories, useExpenseMutations } from '@/hooks/useQueries';
import { ExpenseCategory } from '@/services/database';
import { useTranslation } from '@/context/LocalizationContext';
import { useToast } from '@/context/ToastContext';

export default function ExpenseCategoryManagement() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { openDrawer } = useDrawer();

  const [showModal, setShowModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [editingCategory, setEditingCategory] =
    useState<ExpenseCategory | null>(null);

  const {
    data: categories = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useExpenseCategories();

  const { addExpenseCategory, updateExpenseCategory, deleteExpenseCategory } =
    useExpenseMutations();

  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setShowModal(true);
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
    setShowModal(true);
  };

  const handleDeleteCategory = (category: ExpenseCategory) => {
    Alert.alert(
      t('expenses.deleteCategory'),
      t('expenses.deleteCategoryConfirmation', { name: category.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpenseCategory.mutateAsync(category.id);
              showToast(t('expenses.categoryDeleted'), 'success');
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert(
                t('common.error'),
                t('expenses.failedToDeleteCategory'),
              );
            }
          },
        },
      ],
    );
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert(t('common.error'), t('expenses.categoryNameRequired'));
      return;
    }

    try {
      if (editingCategory) {
        await updateExpenseCategory.mutateAsync({
          id: editingCategory.id,
          name: categoryName.trim(),
          description: categoryDescription.trim() || undefined,
        });
        showToast(t('expenses.categoryUpdated'), 'success');
      } else {
        await addExpenseCategory.mutateAsync({
          name: categoryName.trim(),
          description: categoryDescription.trim() || undefined,
        });
        showToast(t('expenses.categoryAdded'), 'success');
      }
      setShowModal(false);
      setCategoryName('');
      setCategoryDescription('');
      setEditingCategory(null);
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert(t('common.error'), t('expenses.failedToSaveCategory'));
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCategoryName('');
    setCategoryDescription('');
    setEditingCategory(null);
  };

  const renderCategory = ({ item }: { item: ExpenseCategory }) => (
    <View style={styles.categoryCard}>
      <View style={styles.categoryIcon}>
        <Tag size={20} color="#059669" />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName} weight="medium">
          {item.name}
        </Text>
        {item.description && (
          <Text style={styles.categoryDescription}>{item.description}</Text>
        )}
      </View>
      <View style={styles.categoryActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEditCategory(item)}
        >
          <Edit size={18} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteCategory(item)}
        >
          <Trash2 size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Tag size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle} weight="medium">
        {t('expenses.noCategories')}
      </Text>
      <Text style={styles.emptyDescription}>
        {t('expenses.addFirstCategory')}
      </Text>
    </View>
  );

  if (isLoading && !categories.length) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>{t('common.errorLoadingData')}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText} weight="medium">
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <MenuButton onPress={openDrawer} />
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} weight="bold">
            {t('expenses.expenseCategories')}
          </Text>
          {/* <Text style={styles.headerSubtitle}>
            {categories.length} {t('expenses.categories')}
          </Text> */}
        </View>
      </View>

      {/* Category List */}
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          categories.length === 0 && styles.emptyListContainer,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddCategory}>
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Category Form Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <KeyboardAvoidingView
            style={styles.modalKeyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={handleCloseModal}
            >
              <TouchableOpacity
                style={styles.modalContent}
                activeOpacity={1}
                onPress={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle} weight="medium">
                    {editingCategory
                      ? t('expenses.editCategory')
                      : t('expenses.addCategory')}
                  </Text>
                  <TouchableOpacity onPress={handleCloseModal}>
                    <X size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <View style={styles.formContainer}>
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel} weight="medium">
                      {t('expenses.categoryName')} *
                    </Text>
                    <TextInput
                      style={styles.textInput}
                      value={categoryName}
                      onChangeText={setCategoryName}
                      placeholder={t('expenses.categoryNamePlaceholder')}
                      placeholderTextColor="#9CA3AF"
                      maxLength={50}
                    />
                  </View>

                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel} weight="medium">
                      {t('expenses.description')}
                    </Text>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={categoryDescription}
                      onChangeText={setCategoryDescription}
                      placeholder={t('expenses.descriptionPlaceholder')}
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      maxLength={200}
                    />
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCloseModal}
                  >
                    <Text style={styles.cancelButtonText} weight="medium">
                      {t('common.cancel')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      !categoryName.trim() && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSaveCategory}
                    disabled={!categoryName.trim()}
                  >
                    <Text style={styles.saveButtonText} weight="medium">
                      {editingCategory ? t('common.update') : t('common.save')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
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
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
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
  modalSafeArea: {
    flex: 1,
  },
  modalKeyboardView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    color: '#111827',
  },
  formContainer: {
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
});
