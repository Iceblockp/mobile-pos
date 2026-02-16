import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { X, User, Phone, Mail, MapPin } from 'lucide-react-native';
import { Customer } from '@/services/database';
import { useTranslation } from '@/context/LocalizationContext';
import { useCustomerMutations } from '@/hooks/useQueries';
import { useToast } from '@/context/ToastContext';

interface CustomerFormProps {
  visible: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSuccess?: () => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  visible,
  onClose,
  customer,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { addCustomer, updateCustomer } = useCustomerMutations();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
      });
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
      });
    }
  }, [customer, visible]);

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert(t('common.error'), t('customers.nameRequired'));
      return false;
    }

    // Basic phone validation if provided
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      Alert.alert(t('common.error'), t('customers.invalidPhone'));
      return false;
    }

    // Basic email validation if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Alert.alert(t('common.error'), t('customers.invalidEmail'));
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const customerData = {
        name: formData.name.trim(),
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: formData.address.trim() || undefined,
      };

      if (customer) {
        await updateCustomer.mutateAsync({
          id: customer.id,
          data: customerData,
        });
        showToast(t('customers.customerUpdated'), 'success');
      } else {
        await addCustomer.mutateAsync(customerData);
        showToast(t('customers.customerAdded'), 'success');
      }

      handleClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving customer:', error);
      Alert.alert(t('common.error'), t('customers.failedToSave'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
      });
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.overlay}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.title} weight="medium">
                    {customer
                      ? t('customers.editCustomer')
                      : t('customers.addCustomer')}
                  </Text>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={styles.closeButton}
                    disabled={loading}
                  >
                    <X size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Form Fields */}
                <View style={styles.form}>
                  {/* Name Field */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel} weight="medium">
                      {t('customers.name')} *
                    </Text>
                    <View style={styles.inputContainer}>
                      <User
                        size={16}
                        color="#6B7280"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        value={formData.name}
                        onChangeText={(text) =>
                          setFormData({ ...formData, name: text })
                        }
                        placeholder={t('customers.namePlaceholder')}
                        editable={!loading}
                        maxLength={100}
                      />
                    </View>
                  </View>

                  {/* Phone Field */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel} weight="medium">
                      {t('customers.phone')}
                    </Text>
                    <View style={styles.inputContainer}>
                      <Phone
                        size={16}
                        color="#6B7280"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        value={formData.phone}
                        onChangeText={(text) =>
                          setFormData({ ...formData, phone: text })
                        }
                        placeholder={t('customers.phonePlaceholder')}
                        keyboardType="phone-pad"
                        editable={!loading}
                        maxLength={20}
                      />
                    </View>
                  </View>

                  {/* Email Field */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel} weight="medium">
                      {t('customers.email')}
                    </Text>
                    <View style={styles.inputContainer}>
                      <Mail
                        size={16}
                        color="#6B7280"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.textInput}
                        value={formData.email}
                        onChangeText={(text) =>
                          setFormData({ ...formData, email: text })
                        }
                        placeholder={t('customers.emailPlaceholder')}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!loading}
                        maxLength={100}
                      />
                    </View>
                  </View>

                  {/* Address Field */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel} weight="medium">
                      {t('customers.address')}
                    </Text>
                    <View style={styles.inputContainer}>
                      <MapPin
                        size={16}
                        color="#6B7280"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.textInput, styles.addressInput]}
                        value={formData.address}
                        onChangeText={(text) =>
                          setFormData({ ...formData, address: text })
                        }
                        placeholder={t('customers.addressPlaceholder')}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        editable={!loading}
                        maxLength={200}
                      />
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleClose}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText} weight="medium">
                      {t('common.cancel')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      loading && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={loading || !formData.name.trim()}
                  >
                    {loading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.saveButtonText} weight="medium">
                          {t('common.saving')}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.saveButtonText} weight="medium">
                        {customer ? t('common.update') : t('common.save')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
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
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  form: {
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  addressInput: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
