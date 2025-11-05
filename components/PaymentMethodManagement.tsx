import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import {
  X,
  Plus,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  Check,
  ChevronDown,
} from 'lucide-react-native';
import {
  PaymentMethodService,
  type PaymentMethod,
} from '@/services/paymentMethodService';

interface PaymentMethodManagementProps {
  visible: boolean;
  onClose: () => void;
  onMethodsUpdated: () => void;
}

interface AddMethodForm {
  name: string;
  icon: string;
  color: string;
}

const AVAILABLE_ICONS = [
  { name: 'Banknote', component: Banknote, label: 'Cash' },
  { name: 'CreditCard', component: CreditCard, label: 'Card' },
  { name: 'Smartphone', component: Smartphone, label: 'Mobile' },
];

const AVAILABLE_COLORS = [
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#EC4899', // Pink
  '#6B7280', // Gray
  '#059669', // Emerald
];

export const PaymentMethodManagement: React.FC<
  PaymentMethodManagementProps
> = ({ visible, onClose, onMethodsUpdated }) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [addForm, setAddForm] = useState<AddMethodForm>({
    name: '',
    icon: 'CreditCard',
    color: '#3B82F6',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPaymentMethods();
    }
  }, [visible]);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const methods = await PaymentMethodService.getPaymentMethods();
      setPaymentMethods(methods);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      Alert.alert('Error', 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMethod = async () => {
    if (!addForm.name.trim()) {
      Alert.alert('Error', 'Please enter a payment method name');
      return;
    }

    try {
      setSubmitting(true);
      await PaymentMethodService.addPaymentMethod({
        name: addForm.name.trim(),
        icon: addForm.icon,
        color: addForm.color,
        isDefault: false,
      });

      // Reset form
      setAddForm({
        name: '',
        icon: 'CreditCard',
        color: '#3B82F6',
      });
      setShowAddForm(false);

      // Reload methods
      await loadPaymentMethods();
      onMethodsUpdated();

      Alert.alert('Success', 'Payment method added successfully');
    } catch (error: any) {
      console.error('Error adding payment method:', error);
      Alert.alert('Error', error.message || 'Failed to add payment method');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMethod = (method: PaymentMethod) => {
    if (method.isDefault) {
      Alert.alert('Cannot Remove', 'Default payment methods cannot be removed');
      return;
    }

    Alert.alert(
      'Remove Payment Method',
      `Are you sure you want to remove "${method.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await PaymentMethodService.removePaymentMethod(method.id);
              await loadPaymentMethods();
              onMethodsUpdated();
              Alert.alert('Success', 'Payment method removed successfully');
            } catch (error: any) {
              console.error('Error removing payment method:', error);
              Alert.alert(
                'Error',
                error.message || 'Failed to remove payment method'
              );
            }
          },
        },
      ]
    );
  };

  const getIconComponent = (iconName: string) => {
    const icon = AVAILABLE_ICONS.find((i) => i.name === iconName);
    return icon ? icon.component : CreditCard;
  };

  const getSelectedIcon = () => {
    return (
      AVAILABLE_ICONS.find((i) => i.name === addForm.icon) || AVAILABLE_ICONS[1]
    );
  };

  const handleClose = () => {
    setShowAddForm(false);
    setShowIconPicker(false);
    setShowColorPicker(false);
    setAddForm({
      name: '',
      icon: 'CreditCard',
      color: '#3B82F6',
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} weight="medium">
              Manage Payment Methods
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>
                  Loading payment methods...
                </Text>
              </View>
            ) : (
              <>
                {/* Existing Payment Methods */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle} weight="medium">
                    Current Payment Methods
                  </Text>
                  {paymentMethods.map((method) => {
                    const IconComponent = getIconComponent(method.icon);
                    return (
                      <View key={method.id} style={styles.methodItem}>
                        <View style={styles.methodInfo}>
                          <View
                            style={[
                              styles.methodIcon,
                              { backgroundColor: `${method.color}15` },
                            ]}
                          >
                            <IconComponent size={20} color={method.color} />
                          </View>
                          <View style={styles.methodDetails}>
                            <Text style={styles.methodName} weight="medium">
                              {method.name}
                            </Text>
                            {method.isDefault && (
                              <Text style={styles.defaultLabel}>Default</Text>
                            )}
                          </View>
                        </View>
                        {!method.isDefault && (
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => handleRemoveMethod(method)}
                          >
                            <Trash2 size={16} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>

                {/* Add New Method Section */}
                {!showAddForm ? (
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddForm(true)}
                  >
                    <Plus size={20} color="#059669" />
                    <Text style={styles.addButtonText} weight="medium">
                      Add New Payment Method
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.addForm}>
                    <Text style={styles.sectionTitle} weight="medium">
                      Add New Payment Method
                    </Text>

                    {/* Name Input */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel} weight="medium">
                        Name
                      </Text>
                      <TextInput
                        style={styles.textInput}
                        value={addForm.name}
                        onChangeText={(text) =>
                          setAddForm({ ...addForm, name: text })
                        }
                        placeholder="Enter payment method name"
                        maxLength={50}
                        editable={!submitting}
                      />
                    </View>

                    {/* Icon Selection */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel} weight="medium">
                        Icon
                      </Text>
                      <TouchableOpacity
                        style={styles.iconSelector}
                        onPress={() => setShowIconPicker(true)}
                        disabled={submitting}
                      >
                        <View style={styles.iconSelectorContent}>
                          <View
                            style={[
                              styles.selectedIconContainer,
                              { backgroundColor: `${addForm.color}15` },
                            ]}
                          >
                            {React.createElement(
                              getIconComponent(addForm.icon),
                              {
                                size: 20,
                                color: addForm.color,
                              }
                            )}
                          </View>
                          <Text style={styles.iconSelectorText}>
                            {getSelectedIcon().label}
                          </Text>
                        </View>
                        <ChevronDown size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>

                    {/* Color Selection */}
                    <View style={styles.formGroup}>
                      <Text style={styles.formLabel} weight="medium">
                        Color
                      </Text>
                      <TouchableOpacity
                        style={styles.colorSelector}
                        onPress={() => setShowColorPicker(true)}
                        disabled={submitting}
                      >
                        <View
                          style={[
                            styles.colorPreview,
                            { backgroundColor: addForm.color },
                          ]}
                        />
                        <Text style={styles.colorSelectorText}>
                          {addForm.color}
                        </Text>
                        <ChevronDown size={16} color="#6B7280" />
                      </TouchableOpacity>
                    </View>

                    {/* Form Actions */}
                    <View style={styles.formActions}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => setShowAddForm(false)}
                        disabled={submitting}
                      >
                        <Text style={styles.cancelButtonText} weight="medium">
                          Cancel
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.saveButton,
                          submitting && styles.saveButtonDisabled,
                        ]}
                        onPress={handleAddMethod}
                        disabled={submitting || !addForm.name.trim()}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.saveButtonText} weight="medium">
                            Add Method
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Icon Picker Modal */}
          <Modal
            visible={showIconPicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowIconPicker(false)}
          >
            <TouchableOpacity
              style={styles.pickerOverlay}
              activeOpacity={1}
              onPress={() => setShowIconPicker(false)}
            >
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle} weight="medium">
                    Select Icon
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowIconPicker(false)}
                    style={styles.pickerCloseButton}
                  >
                    <X size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.iconGrid}>
                  {AVAILABLE_ICONS.map((icon) => {
                    const isSelected = addForm.icon === icon.name;
                    return (
                      <TouchableOpacity
                        key={icon.name}
                        style={[
                          styles.iconOption,
                          isSelected && styles.iconOptionSelected,
                        ]}
                        onPress={() => {
                          setAddForm({ ...addForm, icon: icon.name });
                          setShowIconPicker(false);
                        }}
                      >
                        <View
                          style={[
                            styles.iconOptionContainer,
                            { backgroundColor: `${addForm.color}15` },
                          ]}
                        >
                          <icon.component size={24} color={addForm.color} />
                        </View>
                        <Text style={styles.iconOptionLabel}>{icon.label}</Text>
                        {isSelected && (
                          <View style={styles.selectedIndicator}>
                            <Check size={12} color="#059669" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableOpacity>
          </Modal>

          {/* Color Picker Modal */}
          <Modal
            visible={showColorPicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowColorPicker(false)}
          >
            <TouchableOpacity
              style={styles.pickerOverlay}
              activeOpacity={1}
              onPress={() => setShowColorPicker(false)}
            >
              <View style={styles.pickerContainer}>
                <View style={styles.pickerHeader}>
                  <Text style={styles.pickerTitle} weight="medium">
                    Select Color
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowColorPicker(false)}
                    style={styles.pickerCloseButton}
                  >
                    <X size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <View style={styles.colorGrid}>
                  {AVAILABLE_COLORS.map((color) => {
                    const isSelected = addForm.color === color;
                    return (
                      <TouchableOpacity
                        key={color}
                        style={[
                          styles.colorOption,
                          isSelected && styles.colorOptionSelected,
                        ]}
                        onPress={() => {
                          setAddForm({ ...addForm, color });
                          setShowColorPicker(false);
                        }}
                      >
                        <View
                          style={[
                            styles.colorOptionCircle,
                            { backgroundColor: color },
                          ]}
                        />
                        {isSelected && (
                          <View style={styles.selectedIndicator}>
                            <Check size={12} color="#059669" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 20,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    // flex: 1,
    padding: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 12,
  },
  methodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodDetails: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    color: '#111827',
  },
  defaultLabel: {
    fontSize: 12,
    color: '#059669',
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#059669',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#059669',
  },
  addForm: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  iconSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  iconSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconSelectorText: {
    fontSize: 16,
    color: '#374151',
  },
  colorSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 12,
  },
  colorSelectorText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  cancelButton: {
    flex: 0.45,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    flex: 0.45,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  // Picker Modal Styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerTitle: {
    fontSize: 18,
    color: '#111827',
  },
  pickerCloseButton: {
    padding: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    justifyContent: 'space-around',
  },
  iconOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    minWidth: 80,
  },
  iconOptionSelected: {
    backgroundColor: '#F0FDF4',
  },
  iconOptionContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconOptionLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    justifyContent: 'space-around',
  },
  colorOption: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  colorOptionSelected: {
    backgroundColor: '#F0FDF4',
  },
  colorOptionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#059669',
  },
});
