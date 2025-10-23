import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useExpenseCategories, useExpenseMutations } from '@/hooks/useQueries';
import {
  useInfiniteExpenses,
  useInfiniteExpensesByDateRange,
} from '@/hooks/useInfiniteQueries';
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
import { useCurrencyFormatter } from '@/context/CurrencyContext';

export default function Expenses() {
  const { formatPrice } = useCurrencyFormatter();
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
  const [dateFilter, setDateFilter] = useState('today');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFormDatePicker, setShowFormDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);

  // Form state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formCategory, setFormCategory] = useState<string>('');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date());

  // Category selector state
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  // Add the date range calculation function (updated like sales.tsx)
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
      case 'month':
        // Current month from 1st to last day
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(now.getMonth() + 1, 0); // Last day of current month
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'selectedMonth':
        // Selected month and year
        startDate.setFullYear(selectedYear, selectedMonth, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setFullYear(selectedYear, selectedMonth + 1, 0); // Last day of selected month
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

  // Calculate date range for React Query (like sales.tsx)
  const [startDate, endDate] = calculateDateRange(dateFilter, selectedDate);

  // Use infinite query for optimized data fetching with pagination
  const {
    data,
    isLoading,
    isRefetching,
    refetch: refetchExpenses,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = dateFilter === 'all'
    ? useInfiniteExpenses(dateFilter, selectedDate)
    : useInfiniteExpensesByDateRange(startDate, endDate);

  console.log('expens', data);

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

  const handleDeleteExpense = async (id: string) => {
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
    setFormCategory('');
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

  const handleDeleteCategory = async (id: string) => {
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
              // Keep modal open after deletion
              showToast(t('categories.categoryDeleted'), 'success');
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

  // Removed formatMMK function - now using standardized currency formatting

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <Card key={item.id} style={styles.expenseCard}>
      <View style={styles.expenseHeader}>
        <View>
          <Text style={styles.expenseCategory} weight="medium">
            {
              //@ts-ignore
              item.category_name
            }
          </Text>
          <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
        </View>
        <Text style={styles.expenseAmount} weight="medium">
          {formatPrice(item.amount)}
        </Text>
      </View>

      {item.description ? (
        <Text style={styles.expenseDescription}>{item.description}</Text>
      ) : null}

      <View style={styles.expenseActions}>
        <TouchableOpacity
          style={styles.actionButton}
          //@ts-ignore
          onPress={() => handleEditExpense(item)}
        >
          <Edit size={16} color="#3B82F6" />
          <Text style={styles.actionText}>{t('common.edit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteExpense(item.id)}
        >
          <Trash2 size={16} color="#EF4444" />
          <Text style={[styles.actionText, { color: '#EF4444' }]}>
            {t('common.delete')}
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderListHeader = () => (
    <View style={styles.filtersContainer}>
      {/* Horizontal Date Filter Chips */}
      <FlatList
        data={[
          { key: 'all', label: t('common.all') },
          { key: 'today', label: t('common.today') },
          { key: 'month', label: t('common.thisMonth') },
          { key: 'selectedMonth', label: t('sales.selectMonth') },
          { key: 'custom', label: t('common.selectDate') },
        ]}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.dateFilterChip,
              dateFilter === item.key && styles.dateFilterChipActive,
            ]}
            onPress={() => {
              if (item.key === 'custom') {
                setShowDatePicker(true);
              } else if (item.key === 'selectedMonth') {
                setShowMonthYearPicker(true);
              } else {
                setDateFilter(item.key);
              }
            }}
          >
            <Text
              style={[
                styles.dateFilterText,
                dateFilter === item.key && styles.dateFilterTextActive,
              ]}
              weight="medium"
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        style={styles.dateFilters}
      />

      {/* Custom Date Picker */}
      {dateFilter === 'custom' && (
        <View style={styles.customDateContainer}>
          <TouchableOpacity
            style={styles.customDateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={16} color="#6B7280" />
            <Text style={styles.customDateText} weight="medium">
              {selectedDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Selected Month Display */}
      {dateFilter === 'selectedMonth' && (
        <View style={styles.customDateContainer}>
          <TouchableOpacity
            style={styles.customDateButton}
            onPress={() => setShowMonthYearPicker(true)}
          >
            <Calendar size={16} color="#6B7280" />
            <Text style={styles.customDateText} weight="medium">
              {new Date(selectedYear, selectedMonth).toLocaleDateString(
                'en-US',
                {
                  month: 'long',
                  year: 'numeric',
                }
              )}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText} weight="medium">
          {expenses.length} {t('expenses.title').toLowerCase()} •{' '}
          {t('common.total')}:{' '}
          {formatPrice(
            expenses.reduce((sum, expense) => sum + expense.amount, 0)
          )}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} weight="bold">
          {t('expenses.title')}
        </Text>
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
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpenseItem}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={
          isLoading ? (
            <LoadingSpinner />
          ) : (
            <Card>
              <Text style={styles.emptyText}>
                {t('expenses.noExpensesFound')}
              </Text>
            </Card>
          )
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.loadMoreContainer}>
              <LoadingSpinner />
              <Text style={styles.loadMoreText} weight="medium">
                {t('common.loadingMore')}
              </Text>
            </View>
          ) : (
            <View style={{ height: 300 }}></View>
          )
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
        onEndReachedThreshold={0.1}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        maxToRenderPerBatch={10}
        windowSize={5}
        style={styles.scrollView}
      />

      {/* Add/Edit Expense Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} weight="bold">
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
              <Text style={styles.modalClose} weight="medium">
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScrollView}
            contentContainerStyle={styles.formContent}
          >
            <Card style={styles.categoryFormCard}>
              <View style={styles.formGroup}>
                <Text style={styles.label} weight="medium">
                  {t('common.category')}
                </Text>
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
                        <Text style={styles.emptyCategoryText} weight="medium">
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
                          <Text
                            style={styles.createCategoryButtonText}
                            weight="medium"
                          >
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
                                    weight="medium"
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
                          <Text
                            style={styles.inlineAddCategoryText}
                            weight="medium"
                          >
                            {t('expenses.selectCategory')}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label} weight="medium">
                  {t('common.amount')}
                </Text>
                <TextInput
                  style={styles.input}
                  value={formAmount}
                  onChangeText={setFormAmount}
                  keyboardType="numeric"
                  placeholder={t('expenses.enterAmount')}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label} weight="medium">
                  {t('common.description')}
                </Text>
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
                <Text style={styles.label} weight="medium">
                  {t('common.date')}
                </Text>
                <TouchableOpacity
                  style={styles.dateInput}
                  onPress={() => setShowFormDatePicker(true)}
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
            <Text style={styles.modalTitle} weight="bold">
              {t('categories.manageCategories')}
            </Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Text style={styles.modalClose} weight="medium">
                {t('common.done')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sticky Category Form - Not in ScrollView */}
          <View style={styles.stickyFormContainer}>
            <Card style={styles.categoryFormCard}>
              <Text style={styles.formTitle} weight="bold">
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
          </View>

          {/* Scrollable Categories List */}
          <View style={styles.categoriesListContainer}>
            <Text style={styles.sectionTitle} weight="medium">
              {t('categories.existingCategories')}
            </Text>
            <ScrollView
              style={styles.categoriesScrollView}
              contentContainerStyle={styles.categoriesContent}
              showsVerticalScrollIndicator={true}
            >
              {categories.map((category) => (
                <Card key={category.id} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryInfo}>
                      <Text style={styles.categoryName} weight="medium">
                        {category.name}
                      </Text>
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
          </View>
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
          maximumDate={new Date()} // Don't allow future dates for expenses
          onChange={(event, selectedDate) => {
            setShowFormDatePicker(false);
            if (selectedDate) {
              setFormDate(selectedDate);
            }
          }}
        />
      )}

      {/* Month/Year Picker Overlay */}
      {showMonthYearPicker && (
        <View style={styles.monthPickerOverlay}>
          <View style={styles.monthPickerContainer}>
            <View style={styles.monthPickerHeader}>
              <Text style={styles.monthPickerTitle} weight="medium">
                {t('sales.selectMonthYear')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowMonthYearPicker(false)}
                style={styles.monthPickerCloseButton}
              >
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Year Selector */}
            {/* <View style={styles.yearSelectorContainer}>
              <Text style={styles.yearSelectorLabel}>{t('sales.year')}</Text>
              <View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={[
                    styles.yearSelector,
                    { height: 40, backgroundColor: '#000' },
                  ]}
                >
                  {Array.from(
                    { length: 5 },
                    (_, i) => new Date().getFullYear() - i
                  ).map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.yearOption,
                        selectedYear === year && styles.yearOptionActive,
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text
                        style={[
                          styles.yearOptionText,
                          selectedYear === year && styles.yearOptionTextActive,
                        ]}
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View> */}

            {/* Month Selector */}
            <View style={[styles.monthSelectorContainer, { maxHeight: 300 }]}>
              <Text style={styles.yearSelectorLabel} weight="medium">
                {t('sales.year')}
              </Text>
              <View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={[styles.yearSelector, { height: 40 }]}
                >
                  {Array.from(
                    { length: 5 },
                    (_, i) => new Date().getFullYear() - i
                  ).map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.yearOption,
                        selectedYear === year && styles.yearOptionActive,
                      ]}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text
                        style={[
                          styles.yearOptionText,
                          selectedYear === year && styles.yearOptionTextActive,
                        ]}
                        weight="medium"
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              <Text style={styles.monthSelectorLabel} weight="medium">
                {t('sales.month')}
              </Text>
              <View style={[styles.monthGrid]}>
                {Array.from({ length: 12 }, (_, i) => i).map((month) => (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.monthOption,
                      selectedMonth === month && styles.monthOptionActive,
                    ]}
                    onPress={() => setSelectedMonth(month)}
                  >
                    <Text
                      style={[
                        styles.monthOptionText,
                        selectedMonth === month && styles.monthOptionTextActive,
                      ]}
                      weight="medium"
                    >
                      {new Date(2024, month).toLocaleDateString('en-US', {
                        month: 'short',
                      })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.monthPickerActions}>
              <TouchableOpacity
                style={styles.monthPickerCancelButton}
                onPress={() => setShowMonthYearPicker(false)}
              >
                <Text style={styles.monthPickerCancelText} weight="medium">
                  {t('common.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.monthPickerConfirmButton}
                onPress={() => {
                  setDateFilter('selectedMonth');
                  setShowMonthYearPicker(false);
                }}
              >
                <Text style={styles.monthPickerConfirmText} weight="medium">
                  {t('common.confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
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
    color: '#111827',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    padding: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    marginLeft: 8,
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
  },
  expenseDate: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  expenseAmount: {
    fontSize: 16,
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
  },
  modalClose: {
    fontSize: 16,
    color: '#3B82F6',
  },
  stickyFormContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 16,
  },
  categoriesListContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  categoriesScrollView: {
    flex: 1,
  },
  categoriesContent: {
    padding: 16,
    paddingBottom: 100, // Extra padding for safe scrolling
  },
  formScrollView: {
    flex: 1,
  },
  formContent: {
    padding: 16,
  },
  formTitle: {
    fontSize: 18,
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
  },
  applyButton: {
    backgroundColor: '#3B82F6',
    marginLeft: 8,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
    color: '#374151',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyCategorySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 6,
    textAlign: 'center',
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
    color: '#6B7280',
    marginTop: 8,
  },
  // Month/Year Picker Styles
  monthPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  monthPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    minWidth: 320,
    maxWidth: 400,
  },
  monthPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  monthPickerTitle: {
    fontSize: 18,
    color: '#111827',
  },
  monthPickerCloseButton: {
    padding: 4,
  },
  yearSelectorContainer: {
    marginBottom: 20,
  },
  yearSelectorLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  yearSelector: {
    flexDirection: 'row',
  },
  yearOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  yearOptionActive: {
    backgroundColor: '#10B981',
  },
  yearOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  yearOptionTextActive: {
    color: '#FFFFFF',
  },
  monthSelectorContainer: {
    marginBottom: 20,
  },
  monthSelectorLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthOption: {
    width: '30%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    marginBottom: 8,
  },
  monthOptionActive: {
    backgroundColor: '#10B981',
  },
  monthOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  monthOptionTextActive: {
    color: '#FFFFFF',
  },
  monthPickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  monthPickerCancelButton: {
    flex: 1,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  monthPickerCancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  monthPickerConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  monthPickerConfirmText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});
