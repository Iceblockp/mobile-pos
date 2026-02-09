import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { MyanmarTextInput as TextInput } from '@/components/MyanmarTextInput';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MenuButton } from '@/components/MenuButton';
import { useDrawer } from '@/context/DrawerContext';
import { useTranslation } from '@/context/LocalizationContext';
import {
  useCategories,
  useCategoryMutations,
  useCategoriesWithCounts,
} from '@/hooks/useQueries';
import { useToast } from '@/context/ToastContext';
import { Category } from '@/services/database';
import { Edit, Trash2, FolderPlus, Plus, X } from 'lucide-react-native';

/**
 * Category Management Page
 * Dedicated page for managing product categories (extracted from product management modal)
 *
 * Features:
 * - View all categories with product counts
 * - Add new categories via modal
 * - Edit existing categories via modal
 * - Delete categories (with validation)
 * - Floating action button for quick add
 * - Real-time product count display
 */
export default function CategoryManagement() {
  const { openDrawer } = useDrawer();
  const { t } = useTranslation();
  const { showToast } = useToast();

  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories();
  const { data: categoriesWithCounts = [], refetch: refreshCategoryWithCount } =
    useCategoriesWithCounts();
  const { addCategory, updateCategory, deleteCategory } =
    useCategoryMutations();

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
  });

  const resetCategoryForm = () => {
    setCategoryFormData({
      name: '',
      description: '',
    });
    setEditingCategory(null);
    setShowFormModal(false);
  };

  const handleAddNew = () => {
    setCategoryFormData({
      name: '',
      description: '',
    });
    setEditingCategory(null);
    setShowFormModal(true);
  };

  const handleCategorySubmit = async () => {
    if (!categoryFormData.name.trim()) {
      Alert.alert(t('common.error'), t('products.enterCategoryName'));
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({
          id: editingCategory.id,
          data: {
            name: categoryFormData.name,
            description: categoryFormData.description,
          },
        });
      } else {
        await addCategory.mutateAsync({
          ...categoryFormData,
          created_at: new Date().toISOString(),
        });
      }

      resetCategoryForm();
      showToast(
        editingCategory
          ? t('products.categoryUpdated')
          : t('products.categoryAdded'),
        'success',
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('products.failedToSaveCategory'));
      console.error('Error saving category:', error);
    }
  };

  const handleEditCategory = (category: Category) => {
    setCategoryFormData({
      name: category.name,
      description: category.description || '',
    });
    setEditingCategory(category);
    setShowFormModal(true);
  };

  const handleDeleteCategory = async (category: Category) => {
    // Check if there are products using this category
    const categoryWithCount = categoriesWithCounts.find(
      (c: any) => c.id === category.id,
    );
    const productCount = categoryWithCount?.product_count || 0;

    if (productCount > 0) {
      Alert.alert(
        t('categories.cannotDelete'),
        `${t('categories.cannotDelete')} "${category.name}" - ${productCount} ${
          productCount > 1
            ? t('categories.productsStillUse')
            : t('categories.productStillUses')
        }`,
        [{ text: t('common.close'), style: 'default' }],
      );
      return;
    }

    Alert.alert(
      t('categories.deleteCategory'),
      `${t('categories.areYouSure')} "${category.name}"?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory.mutateAsync(category.id);
              showToast(t('categories.categoryDeleted'), 'success');
            } catch (error: any) {
              console.error('Error deleting category:', error);
              if (
                error.message &&
                (error.message.includes('FOREIGN KEY constraint') ||
                  error.message.includes('foreign key constraint') ||
                  error.message.includes('constraint failed'))
              ) {
                Alert.alert(
                  t('categories.cannotDelete'),
                  `${t('categories.cannotDelete')} "${category.name}" - ${t(
                    'categories.productsStillUse',
                  )}`,
                  [{ text: t('common.close'), style: 'default' }],
                );
              } else {
                Alert.alert(
                  t('common.error'),
                  `${t('categories.failedToSave')} "${category.name}". ${t(
                    'common.error',
                  )}.`,
                  [{ text: t('common.close'), style: 'default' }],
                );
              }
            }
          },
        },
      ],
    );
  };

  const getCategoryProductCount = (categoryId: string): number => {
    const category = categoriesWithCounts.find((c: any) => c.id === categoryId);
    return category?.product_count || 0;
  };

  if (categoriesLoading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with menu button */}
      <View style={styles.header}>
        <MenuButton onPress={openDrawer} />
        <Text style={styles.title} weight="bold">
          {t('categories.manageCategories')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Categories List Header */}
        <View style={styles.listHeader}>
          <Text style={styles.listTitle} weight="bold">
            {t('categories.existingCategories')}
          </Text>
          <Text style={styles.listCount}>
            {categories.length}{' '}
            {categories.length === 1
              ? t('categories.category')
              : t('categories.categories')}
          </Text>
        </View>

        {/* Empty State */}
        {categories.length === 0 ? (
          <Card style={styles.emptyCard}>
            <FolderPlus size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>{t('categories.noCategories')}</Text>
            <Text style={styles.emptySubtext}>
              {t('categories.addFirstCategory')}
            </Text>
          </Card>
        ) : (
          /* Categories List */
          categories.map((category) => {
            const productCount = getCategoryProductCount(category.id);
            return (
              <Card key={category.id} style={styles.categoryCard}>
                <View style={styles.categoryContent}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName} weight="bold">
                      {category.name}
                    </Text>
                    {category.description && (
                      <Text style={styles.categoryDescription}>
                        {category.description}
                      </Text>
                    )}
                    <View style={styles.categoryMeta}>
                      <Text style={styles.productCount}>
                        {productCount}{' '}
                        {productCount === 1
                          ? t('products.product')
                          : t('products.products')}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.categoryActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditCategory(category)}
                    >
                      <Edit size={20} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteCategory(category)}
                    >
                      <Trash2 size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddNew}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Category Form Modal */}
      <Modal
        visible={showFormModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={resetCategoryForm}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} weight="bold">
              {editingCategory
                ? t('products.editCategory')
                : t('products.addNewCategory')}
            </Text>
            <TouchableOpacity
              onPress={resetCategoryForm}
              style={styles.closeButton}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formSection}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {t('categories.categoryName')} *
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('products.categoryNamePlaceholder')}
                  value={categoryFormData.name}
                  onChangeText={(text) =>
                    setCategoryFormData({ ...categoryFormData, name: text })
                  }
                  autoFocus
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>
                  {t('products.description')}
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder={t('products.description')}
                  value={categoryFormData.description}
                  onChangeText={(text) =>
                    setCategoryFormData({
                      ...categoryFormData,
                      description: text,
                    })
                  }
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={t('common.cancel')}
              onPress={resetCategoryForm}
              variant="secondary"
              style={styles.footerButton}
            />
            <Button
              title={editingCategory ? t('common.update') : t('common.add')}
              onPress={handleCategorySubmit}
              style={styles.footerButton}
            />
          </View>
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
    width: 44,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    color: '#111827',
  },
  listCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyCard: {
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  categoryCard: {
    padding: 16,
    marginBottom: 12,
  },
  categoryContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  categoryInfo: {
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  categoryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productCount: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    color: '#111827',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerButton: {
    flex: 1,
  },
});
