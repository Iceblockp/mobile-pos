import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSupplierMutations } from '@/hooks/useQueries';
import { SupplierWithStats } from '@/services/database';

interface SupplierFormModalProps {
  visible: boolean;
  supplier?: SupplierWithStats | null;
  onClose: () => void;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  visible,
  supplier,
  onClose,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { addSupplier, updateSupplier } = useSupplierMutations();
  const isEditing = !!supplier;
  const isLoading = addSupplier.isPending || updateSupplier.isPending;

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        contact_name: supplier.contact_name,
        phone: supplier.phone,
        email: supplier.email || '',
        address: supplier.address,
      });
    } else {
      setFormData({
        name: '',
        contact_name: '',
        phone: '',
        email: '',
        address: '',
      });
    }
    setErrors({});
  }, [supplier, visible]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }

    if (!formData.contact_name.trim()) {
      newErrors.contact_name = 'Contact name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\+]?[0-9\-\s\(\)]{7,20}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (
      formData.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
    ) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const supplierData = {
        name: formData.name.trim(),
        contact_name: formData.contact_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        address: formData.address.trim(),
      };

      if (isEditing && supplier) {
        await updateSupplier.mutateAsync({
          id: supplier.id,
          data: supplierData,
        });
        Alert.alert('Success', 'Supplier updated successfully');
      } else {
        await addSupplier.mutateAsync(supplierData);
        Alert.alert('Success', 'Supplier added successfully');
      }

      onClose();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to save supplier'
      );
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const renderInput = (
    field: keyof typeof formData,
    label: string,
    placeholder: string,
    options?: {
      multiline?: boolean;
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      required?: boolean;
    }
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel} weight="medium">
        {label}
        {options?.required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          options?.multiline && styles.multilineInput,
          errors[field] && styles.inputError,
        ]}
        value={formData[field]}
        onChangeText={(value) => handleInputChange(field, value)}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        keyboardType={options?.keyboardType || 'default'}
        multiline={options?.multiline}
        numberOfLines={options?.multiline ? 3 : 1}
        textAlignVertical={options?.multiline ? 'top' : 'center'}
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.title} weight="medium">
            {isEditing ? 'Edit Supplier' : 'Add Supplier'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Form */}
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          {renderInput('name', 'Supplier Name', 'Enter supplier name', {
            required: true,
          })}

          {renderInput(
            'contact_name',
            'Contact Person',
            'Enter contact person name',
            { required: true }
          )}

          {renderInput('phone', 'Phone Number', 'Enter phone number', {
            keyboardType: 'phone-pad',
            required: true,
          })}

          {renderInput(
            'email',
            'Email Address',
            'Enter email address (optional)',
            {
              keyboardType: 'email-address',
            }
          )}

          {renderInput('address', 'Address', 'Enter supplier address', {
            multiline: true,
            required: true,
          })}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Button
            title="Cancel"
            onPress={onClose}
            variant="secondary"
            style={styles.cancelButton}
            disabled={isLoading}
          />
          <Button
            title={isEditing ? 'Update' : 'Add'}
            onPress={handleSubmit}
            style={styles.submitButton}
            disabled={isLoading}
          />
        </View>

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <LoadingSpinner />
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
