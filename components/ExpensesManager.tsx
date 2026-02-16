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
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Button } from '@/components/Button';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { DateRangePicker } from '@/components/DateRangePicker';

interface ExpensesProps {
  triggerAdd?: number;
}

export default function Expenses({ triggerAdd }: ExpensesProps) {
  const { formatPrice } = useCurrencyFormatter();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Date filtering state
  const today = new Date();
  const [customStartDate, setCustomStartDate] = useState(today);
  const [customEndDate, setCustomEndDate] = useState(today);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);

  // Form state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formCategory, setFormCategory] = useState<string>('');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date());
  const [showFormDatePicker, setShowFormDatePicker] = useState(false);

  // Category picker modal state
  const [showCategoryPickerModal, setShowCategoryPickerModal] = useState(false);

  // Calculate normalized date range
  const calculateDateRange = (
    customStart: Date,
    customEnd: Date,
  ): [Date, Date] => {
    const startDate = new Date(customStart);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(customEnd);
    endDate.setHours(23, 59, 59, 999);

    return [startDate, endDate];
  };

  const [startDate, endDate] = calculateDateRange(
    customStartDate,
    customEndDate,
  );

  // Trigger add modal from parent component
  useEffect(() => {
    if (triggerAdd && triggerAdd > 0) {
      resetForm();
      setShowAddModal(true);
    }
  }, [triggerAdd]);

  // Use infinite query for optimized data fetching with pagination
  const {
    data,
    isLoading,
    isRefetching,
    refetch: refetchExpenses,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteExpensesByDateRange(startDate, endDate);

  // Flatten the paginated data
  const expenses = data?.pages.flatMap((page) => page.data) || [];

  const { data: categories = [], isLoading: categoriesLoading } =
    useExpenseCategories();

  const { addExpense, updateExpense, deleteExpense } = useExpenseMutations();

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
        'success',
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

  const handleDateRangeApply = (start: Date, end: Date) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
  };

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
      {/* Date Range Picker Button */}
      <TouchableOpacity
        style={styles.dateRangeButton}
        onPress={() => setShowDateRangePicker(true)}
      >
        <Calendar size={20} color="#059669" />
        <View style={styles.dateRangeTextContainer}>
          <Text style={styles.dateRangeLabel}>{t('common.dateRange')}</Text>
          <Text style={styles.dateRangeValue} weight="medium">
            {customStartDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}{' '}
            -{' '}
            {customEndDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryText} weight="medium">
          {expenses.length} {t('expenses.title').toLowerCase()} •{' '}
          {t('common.total')}:{' '}
          {formatPrice(
            expenses.reduce((sum, expense) => sum + expense.amount, 0),
          )}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
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
                  onPress={() => setShowCategoryPickerModal(true)}
                >
                  <Text>
                    {formCategory
                      ? categories.find((c) => c.id === formCategory)?.name ||
                        t('expenses.selectCategory')
                      : t('expenses.selectCategory')}
                  </Text>
                  <ChevronDown size={16} color="#000000" />
                </TouchableOpacity>
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

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPickerModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCategoryPickerModal(false)}
      >
        <View style={styles.categoryPickerOverlay}>
          <View style={styles.categoryPickerDialog}>
            <View style={styles.categoryPickerHeader}>
              <Text style={styles.categoryPickerTitle} weight="bold">
                {t('expenses.selectCategory')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowCategoryPickerModal(false)}
                style={styles.categoryPickerCloseButton}
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {categories.length === 0 ? (
              <View style={styles.emptyCategoryStateDialog}>
                <Tag size={48} color="#9CA3AF" />
                <Text style={styles.emptyCategoryText} weight="medium">
                  {t('expenses.noCategoriesFound')}
                </Text>
                <Text style={styles.emptyCategorySubtext}>
                  {t('expenses.createCategoriesFirst')}
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.categoryPickerList}
                contentContainerStyle={styles.categoryPickerContent}
              >
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryPickerOption,
                      formCategory === category.id &&
                        styles.categoryPickerOptionSelected,
                    ]}
                    onPress={() => {
                      setFormCategory(category.id);
                      setShowCategoryPickerModal(false);
                      showToast(
                        `${t('expenses.selected')}: ${category.name}`,
                        'success',
                      );
                    }}
                  >
                    <View style={styles.categoryPickerOptionContent}>
                      <View
                        style={[
                          styles.categoryPickerIcon,
                          formCategory === category.id &&
                            styles.categoryPickerIconSelected,
                        ]}
                      >
                        <Tag
                          size={20}
                          color={
                            formCategory === category.id ? '#FFFFFF' : '#6B7280'
                          }
                        />
                      </View>
                      <View style={styles.categoryPickerInfo}>
                        <Text
                          style={[
                            styles.categoryPickerName,
                            formCategory === category.id &&
                              styles.categoryPickerNameSelected,
                          ]}
                          weight="medium"
                        >
                          {category.name}
                        </Text>
                        {category.description && (
                          <Text
                            style={[
                              styles.categoryPickerDescription,
                              formCategory === category.id &&
                                styles.categoryPickerDescriptionSelected,
                            ]}
                          >
                            {category.description}
                          </Text>
                        )}
                      </View>
                      {formCategory === category.id && (
                        <View style={styles.categoryPickerSelectedIndicator}>
                          <View style={styles.selectedCheckmark} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Date Range Picker */}
      <DateRangePicker
        visible={showDateRangePicker}
        onClose={() => setShowDateRangePicker(false)}
        onApply={handleDateRangeApply}
        initialStartDate={customStartDate}
        initialEndDate={customEndDate}
      />
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

  // Category Picker Modal Styles
  categoryPickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  categoryPickerDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  categoryPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryPickerTitle: {
    fontSize: 20,
    color: '#111827',
  },
  categoryPickerCloseButton: {
    padding: 4,
  },
  categoryPickerList: {
    maxHeight: 400,
  },
  categoryPickerContent: {
    padding: 16,
  },
  emptyCategoryStateDialog: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyCategoryText: {
    fontSize: 18,
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyCategorySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  categoryPickerOption: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  categoryPickerOptionSelected: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  categoryPickerOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  categoryPickerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  categoryPickerIconSelected: {
    backgroundColor: '#059669',
  },
  categoryPickerInfo: {
    flex: 1,
  },
  categoryPickerName: {
    fontSize: 16,
    color: '#111827',
  },
  categoryPickerNameSelected: {
    color: '#047857',
  },
  categoryPickerDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  categoryPickerDescriptionSelected: {
    color: '#059669',
  },
  categoryPickerSelectedIndicator: {
    marginLeft: 12,
  },
  selectedCheckmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Date Filter Styles (from sales.tsx)
  filtersContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  dateRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  dateRangeTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  dateRangeLabel: {
    fontSize: 12,
    color: '#059669',
    marginBottom: 2,
  },
  dateRangeValue: {
    fontSize: 14,
    color: '#047857',
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
});
