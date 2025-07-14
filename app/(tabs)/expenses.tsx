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
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function Expenses() {
  const { db, isReady, refreshTrigger, triggerRefresh } = useDatabase();
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

  // Form state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formCategory, setFormCategory] = useState<number>(0);
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date());

  const loadExpenses = async (page = 1) => {
    if (!db) return;

    try {
      setLoading(true);
      const newExpenses = await db.getExpensesPaginated(page, PAGE_SIZE);

      if (page === 1) {
        setExpenses(newExpenses as (Expense & { category_name: string })[]);
      } else {
        setExpenses(
          (prev) =>
            [...prev, ...newExpenses] as (Expense & { category_name: string })[]
        );
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
        <View style={styles.header}>
          <Text style={styles.title}>Expenses</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <Plus size={24} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Expense</Text>
          </TouchableOpacity>
        </View>

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
      <Modal visible={showAddModal} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
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
                <X size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={styles.select}
                onPress={() => {
                  // Show category picker
                  // For simplicity, we'll use an alert with options
                  Alert.alert(
                    'Select Category',
                    '',
                    [
                      ...categories.map((category) => ({
                        text: category.name,
                        onPress: () => setFormCategory(category.id),
                      })),
                      { text: 'Cancel', style: 'cancel' },
                    ],
                    { cancelable: true }
                  );
                }}
              >
                <Text>
                  {formCategory
                    ? categories.find((c) => c.id === formCategory)?.name ||
                      'Select Category'
                    : 'Select Category'}
                </Text>
                <ChevronDown size={16} color="#000000" />
              </TouchableOpacity>
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

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddExpense}
            >
              <Text style={styles.saveButtonText}>
                {editingExpense ? 'Update' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '90%',
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
    fontWeight: 'bold',
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
});
