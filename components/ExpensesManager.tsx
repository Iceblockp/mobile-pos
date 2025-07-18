import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useExpenseCategories, useExpenseMutations } from '@/hooks/useQueries';
import { useInfiniteExpenses } from '@/hooks/useInfiniteQueries';
import { Expense, ExpenseCategory } from '@/services/database';
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  ChevronDown,
  X,
  Filter,
  Tag,
  Settings,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button } from '@/components/Button';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/LocalizationContext';

export default function Expenses() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // New state variables for category management
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [editingCategory, setEditingCategory] =
    useState<ExpenseCategory | null>(null);

  // Date filtering state (similar to sales.tsx)
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFormDatePicker, setShowFormDatePicker] = useState(false);

  // Form state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formCategory, setFormCategory] = useState<number>(0);
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date());

  // Category selector state
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  // Use infinite query for optimized data fetching with pagination
  const {
    data,
    isLoading,
    isRefetching,
    refetch: refetchExpenses,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteExpenses(dateFilter, selectedDate);

  // Flatten the paginated data
  const expenses = data?.pages.flatMap((page) => page.data) || [];

  const { data: categories = [], isLoading: categoriesLoading } =
    useExpenseCategories();

  const {
    addExpense,
    updateExpense,
    deleteExpense,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
  } = useExpenseMutations();

  // Add the date range calculation function (from sales.tsx)
  const calculateDateRange = (
    dateFilterType: string,
    selectedDate: Date
  ): [Date, Date] => {
    const now = new Date();
    const startDate = new Date();
    const endDate = new Date();

    switch (dateFilterType) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        const customDate = new Date(selectedDate);
        customDate.setHours(0, 0, 0, 0);
        startDate.setTime(customDate.getTime());
        endDate.setTime(customDate.getTime());
        endDate.setHours(23, 59, 59, 999);
        break;
      default: // 'all'
        // For 'all', set a very old start date and current date as end date
        startDate.setFullYear(startDate.getFullYear() - 10); // 10 years ago
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
    }

    return [startDate, endDate];
  };

  const onRefresh = () => {
    refetchExpenses();
  };

  // Note: Pagination and load more functionality would need to be implemented
  // with React Query's useInfiniteQuery for better performance

  const handleAddExpense = async () => {
    if (!formCategory) {
      Alert.alert(t('common.error'), t('expenses.selectCategory'));
      return;
    }

    if (!formAmount || isNaN(Number(formAmount)) || Number(formAmount) <= 0) {
      Alert.alert(t('common.error'), t('expenses.enterValidAmount'));
      return;
    }

    try {
      if (editingExpense) {
        await updateExpense.mutateAsync({
          id: editingExpense.id,
          category_id: formCategory,
          amount: Number(formAmount),
          description: formDescription,
          date: formDate.toISOString(),
        });
      } else {
        await addExpense.mutateAsync({
          category_id: formCategory,
          amount: Number(formAmount),
          description: formDescription,
          date: formDate.toISOString(),
        });
      }

      setShowAddModal(false);
      resetForm();

      // Show success toast
      showToast(
        editingExpense
          ? t('expenses.expenseUpdated')
          : t('expenses.expenseAdded'),
        'success'
      );
    } catch (error) {
      console.error('Error saving expense:', error);
      Alert.alert(t('common.error'), t('expenses.failedToSave'));
    }
  };

  const handleDeleteExpense = async (id: number) => {
    Alert.alert(t('expenses.confirmDelete'), t('expenses.areYouSureDelete'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExpense.mutateAsync(id);
            showToast(t('expenses.expenseDeleted'), 'success');
          } catch (error) {
            console.error('Error deleting expense:', error);
            Alert.alert(t('common.error'), t('expenses.failedToDelete'));
          }
        },
      },
    ]);
  };

  const handleEditExpense = (expense: Expense & { category_name: string }) => {
    setEditingExpense(expense);
    setFormCategory(expense.category_id);
    setFormAmount(expense.amount.toString());
    setFormDescription(expense.description);
    setFormDate(new Date(expense.date));
    setShowAddModal(true);
  };

  const resetForm = () => {
    setEditingExpense(null);
    setFormCategory(0);
    setFormAmount('');
    setFormDescription('');
    setFormDate(new Date());
  };

  const resetCategoryForm = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert(t('common.error'), t('categories.enterCategoryName'));
      return;
    }

    try {
      const categoryData = {
        name: categoryName,
        description: categoryDescription,
      };

      if (editingCategory) {
        await updateExpenseCategory.mutateAsync({
          id: editingCategory.id,
          name: categoryName,
          description: categoryDescription,
        });
      } else {
        await addExpenseCategory.mutateAsync(categoryData);
      }

      resetCategoryForm();

      // Show success toast
      showToast(
        editingCategory
          ? t('categories.categoryUpdated')
          : t('categories.categoryAdded'),
        'success'
      );
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert(t('common.error'), t('categories.failedToSave'));
    }
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
  };

  const handleDeleteCategory = async (id: number) => {
    // Find the category name for better error messages
    const category = categories.find((c) => c.id === id);
    const categoryName = category?.name || 'this category';

    // First check if there are expenses using this category
    const expensesInCategory = expenses.filter((e) => e.category_id === id);

    if (expensesInCategory.length > 0) {
      // Show alert for error - it will appear on top of modal and be clearly visible
      Alert.alert(
        t('categories.cannotDelete'),
        `${t('categories.cannotDelete')} "${categoryName}" - ${
          expensesInCategory.length
        } ${
          expensesInCategory.length > 1
            ? t('categories.expensesStillUse')
            : t('categories.expenseStillUses')
        }`,
        [{ text: t('common.close'), style: 'default' }]
      );
      return;
    }

    Alert.alert(
      t('categories.deleteCategory'),
      `${t('categories.areYouSure')} "${categoryName}"?`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExpenseCategory.mutateAsync(id);
              setShowCategoryModal(false);
              setTimeout(() => {
                showToast(t('categories.categoryDeleted'), 'success');
              }, 300);
            } catch (error: any) {
              console.error('Error deleting category:', error);
              showToast(
                `${t('categories.failedToSave')} "${categoryName}". ${t(
                  'common.error'
                )}.`,
                'error'
              );
            }
          },
        },
      ]
    );
  };

  // Add date picker handler (from sales.tsx)
  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
      setDateFilter('custom');
    }
  };

  // Reload expenses when date filter changes
  // useEffect(() => {
  //   if (isReady) {
  //     setCurrentPage(1);
  //     loadExpenses(1);
  //   }
  // }, [dateFilter, selectedDate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatMMK = (amount: number) => {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) + ' MMK'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('expenses.title')}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowCategoryModal(true)}
          >
            <Settings size={20} color="#3B82F6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom
          ) {
            // Load more data if available and not already fetching
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }
        }}
        scrollEventThrottle={400}
      >
        {/* Date Filter Chips (similar to sales.tsx) */}
        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.dateFilters}
          >
            {[
              { key: 'all', label: t('common.all') },
              { key: 'today', label: t('common.today') },
              { key: 'week', label: t('common.thisWeek') },
              { key: 'month', label: t('common.thisMonth') },
              { key: 'custom', label: t('common.selectDate') },
            ].map((filter) => (
              <TouchableOpacity
                key={filter.key}
                style={[
                  styles.dateFilterChip,
                  dateFilter === filter.key && styles.dateFilterChipActive,
                ]}
                onPress={() => {
                  if (filter.key === 'custom') {
                    setShowDatePicker(true);
                  } else {
                    setDateFilter(filter.key);
                  }
                }}
              >
                <Text
                  style={[
                    styles.dateFilterText,
                    dateFilter === filter.key && styles.dateFilterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {dateFilter === 'custom' && (
            <View style={styles.customDateContainer}>
              <TouchableOpacity
                style={styles.customDateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Calendar size={16} color="#6B7280" />
                <Text style={styles.customDateText}>
                  {selectedDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.summaryContainer}>
            <Text style={styles.summaryText}>
              {expenses.length} {t('expenses.title').toLowerCase()} •{' '}
              {t('common.total')}:{' '}
              {formatMMK(
                expenses.reduce((sum, expense) => sum + expense.amount, 0)
              )}
            </Text>
          </View>
        </View>

        {isLoading && expenses.length === 0 ? (
          <LoadingSpinner />
        ) : expenses.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              {t('expenses.noExpensesFound')}
            </Text>
          </Card>
        ) : (
          <>
            {expenses.map((expense) => (
              <Card key={expense.id} style={styles.expenseCard}>
                <View style={styles.expenseHeader}>
                  <View>
                    <Text style={styles.expenseCategory}>
                      {
                        //@ts-ignore
                        expense.category_name
                      }
                    </Text>
                    <Text style={styles.expenseDate}>
                      {formatDate(expense.date)}
                    </Text>
                  </View>
                  <Text style={styles.expenseAmount}>
                    {formatMMK(expense.amount)}
                  </Text>
                </View>

                {expense.description ? (
                  <Text style={styles.expenseDescription}>
                    {expense.description}
                  </Text>
                ) : null}

                <View style={styles.expenseActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    //@ts-ignore
                    onPress={() => handleEditExpense(expense)}
                  >
                    <Edit size={16} color="#3B82F6" />
                    <Text style={styles.actionText}>{t('common.edit')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteExpense(expense.id)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={[styles.actionText, { color: '#EF4444' }]}>
                      {t('common.delete')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}

            {/* Loading indicator for fetching more data */}
            {isFetchingNextPage && (
              <View style={styles.loadMoreContainer}>
                <LoadingSpinner />
                <Text style={styles.loadMoreText}>
                  {t('common.loadingMore')}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Add/Edit Expense Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingExpense
                ? t('expenses.editExpense')
                : t('expenses.addExpense')}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              <Text style={styles.modalClose}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScrollView}
            contentContainerStyle={styles.formContent}
          >
            <Card style={styles.categoryFormCard}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('common.category')}</Text>
                <TouchableOpacity
                  style={styles.select}
                  onPress={() => setShowCategorySelector(!showCategorySelector)}
                >
                  <Text>
                    {formCategory
                      ? categories.find((c) => c.id === formCategory)?.name ||
                        t('expenses.selectCategory')
                      : t('expenses.selectCategory')}
                  </Text>
                  <ChevronDown
                    size={16}
                    color="#000000"
                    style={{
                      transform: [
                        { rotate: showCategorySelector ? '180deg' : '0deg' },
                      ],
                    }}
                  />
                </TouchableOpacity>

                {/* Inline Category Selector */}
                {showCategorySelector && (
                  <View style={styles.inlineCategorySelector}>
                    {categories.length === 0 ? (
                      <View style={styles.emptyCategoryState}>
                        <Tag size={32} color="#9CA3AF" />
                        <Text style={styles.emptyCategoryText}>
                          {t('expenses.noCategoriesFound')}
                        </Text>
                        <Text style={styles.emptyCategorySubtext}>
                          {t('expenses.createCategoriesFirst')}
                        </Text>
                        <TouchableOpacity
                          style={styles.createCategoryButton}
                          onPress={() => {
                            setShowCategorySelector(false);
                            setShowCategoryModal(true);
                          }}
                        >
                          <Plus size={14} color="#FFFFFF" />
                          <Text style={styles.createCategoryButtonText}>
                            {t('expenses.createCategory')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        <ScrollView
                          style={styles.categoryList}
                          showsVerticalScrollIndicator={false}
                          nestedScrollEnabled={true}
                        >
                          {categories.map((category) => (
                            <TouchableOpacity
                              key={category.id}
                              style={[
                                styles.inlineCategoryOption,
                                formCategory === category.id &&
                                  styles.inlineCategoryOptionSelected,
                              ]}
                              onPress={() => {
                                setFormCategory(category.id);
                                setShowCategorySelector(false);
                                showToast(
                                  `${t('expenses.selected')}: ${category.name}`,
                                  'success'
                                );
                              }}
                            >
                              <View style={styles.inlineCategoryContent}>
                                <View
                                  style={[
                                    styles.inlineCategoryIcon,
                                    formCategory === category.id &&
                                      styles.inlineCategoryIconSelected,
                                  ]}
                                >
                                  <Tag
                                    size={16}
                                    color={
                                      formCategory === category.id
                                        ? '#FFFFFF'
                                        : '#6B7280'
                                    }
                                  />
                                </View>
                                <View style={styles.inlineCategoryInfo}>
                                  <Text
                                    style={[
                                      styles.inlineCategoryName,
                                      formCategory === category.id &&
                                        styles.inlineCategoryNameSelected,
                                    ]}
                                  >
                                    {category.name}
                                  </Text>
                                  {category.description && (
                                    <Text
                                      style={[
                                        styles.inlineCategoryDescription,
                                        formCategory === category.id &&
                                          styles.inlineCategoryDescriptionSelected,
                                      ]}
                                    >
                                      {category.description}
                                    </Text>
                                  )}
                                </View>
                                {formCategory === category.id && (
                                  <View style={styles.inlineSelectedIndicator}>
                                    <View style={styles.selectedDot} />
                                  </View>
                                )}
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>

                        <TouchableOpacity
                          style={styles.inlineAddCategoryButton}
                        >
                          {/* <Plus size={14} color="#3B82F6" /> */}
                          <Text style={styles.inlineAddCategoryText}>
                            {t('expenses.selectCategory')}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('expenses.amountMMK')}</Text>
                <TextInput
                  style={styles.input}
                  value={formAmount}
                  onChangeText={setFormAmount}
                  keyboardType="numeric"
                  placeholder={t('expenses.enterAmount')}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('common.description')}</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder={t('expenses.enterDescription')}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('common.date')}</Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text>
                    {formDate.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <Calendar size={16} color="#000000" />
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={formDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setFormDate(selectedDate);
                    }
                  }}
                />
              )}

              <View style={styles.formButtons}>
                <Button
                  title={t('common.cancel')}
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  variant="secondary"
                  style={styles.formButton}
                />
                <Button
                  title={editingExpense ? t('common.edit') : t('common.save')}
                  onPress={handleAddExpense}
                  style={styles.formButton}
                />
              </View>
            </Card>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('categories.manageCategories')}
            </Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Text style={styles.modalClose}>{t('common.done')}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScrollView}
            contentContainerStyle={styles.formContent}
          >
            <Card style={styles.categoryFormCard}>
              <Text style={styles.formTitle}>
                {editingCategory
                  ? t('categories.editCategory')
                  : t('categories.addNewCategory')}
              </Text>

              <TextInput
                style={styles.input}
                placeholder={t('categories.categoryName') + ' *'}
                value={categoryName}
                onChangeText={setCategoryName}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('common.description')}
                value={categoryDescription}
                onChangeText={setCategoryDescription}
                multiline
                numberOfLines={3}
              />

              <View style={styles.formButtons}>
                <Button
                  title={t('common.cancel')}
                  onPress={resetCategoryForm}
                  variant="secondary"
                  style={styles.formButton}
                />
                <Button
                  title={editingCategory ? t('common.edit') : t('common.add')}
                  onPress={handleAddCategory}
                  style={styles.formButton}
                />
              </View>
            </Card>

            <Text style={styles.sectionTitle}>
              {t('categories.existingCategories')}
            </Text>
            {categories.map((category) => (
              <Card key={category.id} style={styles.categoryCard}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    {category.description && (
                      <Text style={styles.categoryDescription}>
                        {category.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.categoryActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditCategory(category)}
                    >
                      <Edit size={18} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Date Picker for custom date selection */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Form Date Picker */}
      {showFormDatePicker && (
        <DateTimePicker
          value={formDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowFormDatePicker(false);
            if (selectedDate) {
              setFormDate(selectedDate);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#6B7280',
    padding: 24,
  },
  expenseCard: {
    marginBottom: 12,
    padding: 16,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  expenseCategory: {
    fontSize: 16,
    fontWeight: '600',
  },
  expenseDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  expenseDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
  },
  expenseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalClose: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  formScrollView: {
    flex: 1,
  },
  formContent: {
    padding: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  categoryFormCard: {
    marginBottom: 16,
    padding: 16,
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  formButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 16,
  },
  categoryCard: {
    marginBottom: 12,
    padding: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  select: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  filterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  filterText: {
    color: '#3B82F6',
    fontSize: 14,
  },
  categoriesList: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 16,
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },

  categoryAction: {
    padding: 8,
    marginLeft: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  filterButton: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  clearButtonText: {
    color: '#4B5563',
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Inline Category Selector Styles
  inlineCategorySelector: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 300,
  },
  emptyCategoryState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyCategoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyCategorySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  createCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginTop: 16,
  },
  createCategoryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  categoryList: {
    maxHeight: 200,
    paddingVertical: 8,
  },
  inlineCategoryOption: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inlineCategoryOptionSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  inlineCategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  inlineCategoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  inlineCategoryIconSelected: {
    backgroundColor: '#3B82F6',
  },
  inlineCategoryInfo: {
    flex: 1,
  },
  inlineCategoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  inlineCategoryNameSelected: {
    color: '#1D4ED8',
  },
  inlineCategoryDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  inlineCategoryDescriptionSelected: {
    color: '#3B82F6',
  },
  inlineSelectedIndicator: {
    marginLeft: 8,
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  inlineAddCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 6,
    padding: 12,
    margin: 8,
    marginTop: 4,
  },
  inlineAddCategoryText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Date Filter Styles (from sales.tsx)
  filtersContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  dateFilters: {
    flexDirection: 'row',
  },
  dateFilterChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  dateFilterChipActive: {
    backgroundColor: '#10B981',
  },
  dateFilterText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  dateFilterTextActive: {
    color: '#FFFFFF',
  },
  customDateContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  customDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  customDateText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginLeft: 8,
  },
  summaryContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    textAlign: 'center',
  },
  loadMoreContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadMoreText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 8,
  },
});
