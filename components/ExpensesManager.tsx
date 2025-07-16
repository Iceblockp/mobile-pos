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
import { useDatabase } from '@/context/DatabaseContext';
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

export default function Expenses() {
  const { db, isReady, refreshTrigger, triggerRefresh } = useDatabase();
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<
    (Expense & { category_name: string })[]
  >([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreData, setHasMoreData] = useState(true);
  const PAGE_SIZE = 20;

  // New state variables for category management
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');
  const [editingCategory, setEditingCategory] =
    useState<ExpenseCategory | null>(null);

  // New state variables for date range filtering
  const [filterStartDate, setFilterStartDate] = useState<Date>(new Date());
  const [filterEndDate, setFilterEndDate] = useState<Date>(new Date());
  const [showFilterStartDatePicker, setShowFilterStartDatePicker] =
    useState(false);
  const [showFilterEndDatePicker, setShowFilterEndDatePicker] = useState(false);
  const [isDateFiltered, setIsDateFiltered] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Form state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formCategory, setFormCategory] = useState<number>(0);
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date());

  // Category selector state
  const [showCategorySelector, setShowCategorySelector] = useState(false);

  const loadExpenses = async (page = 1) => {
    if (!db) return;

    try {
      setLoading(true);
      let newExpenses;

      if (isDateFiltered) {
        newExpenses = await db.getExpensesByDateRangePaginated(
          filterStartDate,
          filterEndDate,
          page,
          PAGE_SIZE
        );
      } else {
        newExpenses = await db.getExpensesPaginated(page, PAGE_SIZE);
      }

      if (page === 1) {
        setExpenses(newExpenses as (Expense & { category_name: string })[]);
      } else {
        setExpenses((prev) => [
          ...prev,
          ...(newExpenses as (Expense & { category_name: string })[]),
        ]);
      }

      setHasMoreData(newExpenses.length === PAGE_SIZE);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCategories = async () => {
    if (!db) return;

    try {
      const data = await db.getExpenseCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  useEffect(() => {
    if (isReady) {
      loadExpenses(1);
      loadCategories();
    }
  }, [isReady, db, refreshTrigger]);

  const onRefresh = () => {
    setRefreshing(true);
    loadExpenses(1);
    loadCategories();
  };

  const loadMore = () => {
    if (hasMoreData && !loading) {
      loadExpenses(currentPage + 1);
    }
  };

  const handleAddExpense = async () => {
    if (!db) return;

    if (!formCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (!formAmount || isNaN(Number(formAmount)) || Number(formAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      if (editingExpense) {
        await db.updateExpense(
          editingExpense.id,
          formCategory,
          Number(formAmount),
          formDescription,
          formDate.toISOString()
        );
      } else {
        await db.addExpense(
          formCategory,
          Number(formAmount),
          formDescription,
          formDate.toISOString()
        );
      }

      setShowAddModal(false);
      resetForm();
      triggerRefresh();

      // Show success toast
      showToast(
        editingExpense
          ? 'Expense updated successfully!'
          : 'Expense added successfully!',
        'success'
      );
    } catch (error) {
      console.error('Error saving expense:', error);
      Alert.alert('Error', 'Failed to save expense');
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!db) return;

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.deleteExpense(id);
              triggerRefresh();
              showToast('Expense deleted successfully!', 'success');
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
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
    if (!db) return;

    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      if (editingCategory) {
        await db.updateExpenseCategory(
          editingCategory.id,
          categoryName,
          categoryDescription
        );
      } else {
        await db.addExpenseCategory(categoryName, categoryDescription);
      }

      resetCategoryForm();
      loadCategories();
      triggerRefresh();

      // Show success toast
      showToast(
        editingCategory
          ? 'Category updated successfully!'
          : 'Category added successfully!',
        'success'
      );
    } catch (error) {
      console.error('Error saving category:', error);
      Alert.alert('Error', 'Failed to save category');
    }
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryDescription(category.description || '');
  };

  const handleDeleteCategory = async (id: number) => {
    if (!db) return;

    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this category? This cannot be undone if the category has expenses.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.deleteExpenseCategory(id);
              loadCategories();
              triggerRefresh();
              showToast('Category deleted successfully!', 'success');
            } catch (error) {
              console.error('Error deleting category:', error);
              Alert.alert(
                'Error',
                'Failed to delete category. It may have associated expenses.'
              );
            }
          },
        },
      ]
    );
  };

  const applyDateFilter = () => {
    setIsDateFiltered(true);
    setShowFilterModal(false);
    setCurrentPage(1);
    loadExpenses(1);
  };

  const clearDateFilter = () => {
    setIsDateFiltered(false);
    setShowFilterModal(false);
    setCurrentPage(1);
    loadExpenses(1);
  };

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
        <Text style={styles.title}>Expenses</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Filter size={20} color="#3B82F6" />
          </TouchableOpacity>

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
            {/* <Text style={styles.addButtonText}>Add Expense</Text> */}
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const paddingToBottom = 20;
          if (
            layoutMeasurement.height + contentOffset.y >=
            contentSize.height - paddingToBottom
          ) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {isDateFiltered && (
          <View style={styles.filterInfo}>
            <Text style={styles.filterText}>
              Filtered: {filterStartDate.toLocaleDateString()} -{' '}
              {filterEndDate.toLocaleDateString()}
            </Text>
            <TouchableOpacity onPress={clearDateFilter}>
              <X size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        )}

        {loading && expenses.length === 0 ? (
          <LoadingSpinner />
        ) : expenses.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              No expenses found. Add your first expense!
            </Text>
          </Card>
        ) : (
          <>
            {expenses.map((expense) => (
              <Card key={expense.id} style={styles.expenseCard}>
                <View style={styles.expenseHeader}>
                  <View>
                    <Text style={styles.expenseCategory}>
                      {expense.category_name}
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
                    onPress={() => handleEditExpense(expense)}
                  >
                    <Edit size={16} color="#3B82F6" />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteExpense(expense.id)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={[styles.actionText, { color: '#EF4444' }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}

            {loading && <LoadingSpinner />}
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
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowAddModal(false);
                resetForm();
              }}
            >
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScrollView}
            contentContainerStyle={styles.formContent}
          >
            <Card style={styles.categoryFormCard}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Category</Text>
                <TouchableOpacity
                  style={styles.select}
                  onPress={() => setShowCategorySelector(!showCategorySelector)}
                >
                  <Text>
                    {formCategory
                      ? categories.find((c) => c.id === formCategory)?.name ||
                        'Select Category'
                      : 'Select Category'}
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
                          No categories found
                        </Text>
                        <Text style={styles.emptyCategorySubtext}>
                          Create categories first to organize your expenses
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
                            Create Category
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
                                  `Selected: ${category.name}`,
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
                            Select a Category
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Amount (MMK)</Text>
                <TextInput
                  style={styles.input}
                  value={formAmount}
                  onChangeText={setFormAmount}
                  keyboardType="numeric"
                  placeholder="Enter amount"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formDescription}
                  onChangeText={setFormDescription}
                  placeholder="Enter description"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Date</Text>
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
                  title="Cancel"
                  onPress={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  variant="secondary"
                  style={styles.formButton}
                />
                <Button
                  title={editingExpense ? 'Update' : 'Save'}
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
            <Text style={styles.modalTitle}>Manage Categories</Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScrollView}
            contentContainerStyle={styles.formContent}
          >
            <Card style={styles.categoryFormCard}>
              <Text style={styles.formTitle}>
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Category Name *"
                value={categoryName}
                onChangeText={setCategoryName}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description"
                value={categoryDescription}
                onChangeText={setCategoryDescription}
                multiline
                numberOfLines={3}
              />

              <View style={styles.formButtons}>
                <Button
                  title="Cancel"
                  onPress={resetCategoryForm}
                  variant="secondary"
                  style={styles.formButton}
                />
                <Button
                  title={editingCategory ? 'Update' : 'Add'}
                  onPress={handleAddCategory}
                  style={styles.formButton}
                />
              </View>
            </Card>

            <Text style={styles.sectionTitle}>Existing Categories</Text>
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

      {/* Date Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter by Date Range</Text>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowFilterStartDatePicker(true)}
              >
                <Text>
                  {filterStartDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Calendar size={16} color="#000000" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowFilterEndDatePicker(true)}
              >
                <Text>
                  {filterEndDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Calendar size={16} color="#000000" />
              </TouchableOpacity>
            </View>

            {showFilterStartDatePicker && (
              <DateTimePicker
                value={filterStartDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowFilterStartDatePicker(false);
                  if (selectedDate) {
                    setFilterStartDate(selectedDate);
                  }
                }}
              />
            )}

            {showFilterEndDatePicker && (
              <DateTimePicker
                value={filterEndDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowFilterEndDatePicker(false);
                  if (selectedDate) {
                    setFilterEndDate(selectedDate);
                  }
                }}
              />
            )}

            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[styles.filterButton, styles.clearButton]}
                onPress={clearDateFilter}
              >
                <Text style={styles.clearButtonText}>Clear Filter</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterButton, styles.applyButton]}
                onPress={applyDateFilter}
              >
                <Text style={styles.applyButtonText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
});
