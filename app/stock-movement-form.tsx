import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { SearchablePickerModal } from '@/components/SearchablePickerModal';
import { SimplePriceInput } from '@/components/PriceInput';
import {
  ArrowLeft,
  Package,
  TrendingUp,
  TrendingDown,
  User,
  FileText,
  Hash,
  DollarSign,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import {
  useStockMovementMutations,
  useProducts,
  useBasicSuppliers,
} from '@/hooks/useQueries';
import { useToast } from '@/context/ToastContext';
import { useCurrencyFormatter } from '@/hooks/useCurrency';
import { Product, Supplier } from '@/services/database';

export default function StockMovementForm() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { parsePrice } = useCurrencyFormatter();
  const params = useLocalSearchParams();

  const { updateProductQuantityWithMovement } = useStockMovementMutations();
  const { data: products = [] } = useProducts();
  const { data: suppliers = [] } = useBasicSuppliers();

  const [type, setType] = useState<'stock_in' | 'stock_out'>(
    (params.type as 'stock_in' | 'stock_out') || 'stock_in',
  );
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [unitCostNumeric, setUnitCostNumeric] = useState(0);
  const [loading, setLoading] = useState(false);

  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);

  // Set first product as default when products load
  React.useEffect(() => {
    if (products.length > 0 && !selectedProduct) {
      setSelectedProduct(products[0]);
    }
  }, [products, selectedProduct]);

  const handleSubmit = async () => {
    if (!selectedProduct) {
      Alert.alert(t('common.error'), t('stockMovement.selectProduct'));
      return;
    }

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      Alert.alert(t('common.error'), t('stockMovement.enterValidQuantity'));
      return;
    }

    if (type === 'stock_out' && quantityNum > selectedProduct.quantity) {
      Alert.alert(
        t('common.error'),
        t('stockMovement.insufficientStock', {
          available: selectedProduct.quantity,
          requested: quantityNum,
        }),
      );
      return;
    }

    if (type === 'stock_out' && !reason.trim()) {
      Alert.alert(t('common.error'), t('stockMovement.reasonRequired'));
      return;
    }

    setLoading(true);
    try {
      await updateProductQuantityWithMovement.mutateAsync({
        productId: selectedProduct.id,
        movementType: type,
        quantity: quantityNum,
        reason: reason.trim() || undefined,
        supplierId: selectedSupplier?.id,
        referenceNumber: referenceNumber.trim() || undefined,
        unitCost: unitCostNumeric > 0 ? unitCostNumeric : undefined,
      });

      showToast(
        type === 'stock_in'
          ? t('stockMovement.stockAddedSuccessfully')
          : t('stockMovement.stockRemovedSuccessfully'),
        'success',
      );

      router.back();
    } catch (error) {
      console.error('Error processing stock movement:', error);
      Alert.alert(t('common.error'), t('stockMovement.failedToProcess'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          disabled={loading}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title} weight="bold">
          {t('stockMovement.title')}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Movement Type Selection */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel} weight="medium">
              {t('stockMovement.type')} *
            </Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'stock_in' && styles.typeButtonActive,
                ]}
                onPress={() => setType('stock_in')}
                disabled={loading}
              >
                <TrendingUp
                  size={20}
                  color={type === 'stock_in' ? '#FFFFFF' : '#059669'}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'stock_in' && styles.typeButtonTextActive,
                  ]}
                  weight="medium"
                >
                  {t('stockMovement.stockIn')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  type === 'stock_out' && styles.typeButtonActive,
                ]}
                onPress={() => setType('stock_out')}
                disabled={loading}
              >
                <TrendingDown
                  size={20}
                  color={type === 'stock_out' ? '#FFFFFF' : '#EF4444'}
                />
                <Text
                  style={[
                    styles.typeButtonText,
                    type === 'stock_out' && styles.typeButtonTextActive,
                  ]}
                  weight="medium"
                >
                  {t('stockMovement.stockOut')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Product Selector */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel} weight="medium">
              {t('common.product')} *
            </Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowProductPicker(true)}
              disabled={loading}
            >
              <Package size={20} color="#6B7280" style={styles.inputIcon} />
              <Text
                style={[
                  styles.pickerButtonText,
                  !selectedProduct && styles.pickerButtonPlaceholder,
                ]}
              >
                {selectedProduct?.name || t('stockMovement.selectProduct')}
              </Text>
            </TouchableOpacity>
            {selectedProduct && (
              <Text style={styles.helperText}>
                {t('stockMovement.currentStock')}: {selectedProduct.quantity}
              </Text>
            )}
          </View>

          {/* Quantity Input */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel} weight="medium">
              {t('stockMovement.quantity')} *
            </Text>
            <View style={styles.inputContainer}>
              <Hash size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="0"
                keyboardType="number-pad"
                editable={!loading}
              />
            </View>
          </View>

          {/* Supplier Selector (for stock in) */}
          {type === 'stock_in' && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel} weight="medium">
                {t('stockMovement.supplier')}
              </Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowSupplierPicker(true)}
                disabled={loading}
              >
                <User size={20} color="#6B7280" style={styles.inputIcon} />
                <Text
                  style={[
                    styles.pickerButtonText,
                    !selectedSupplier && styles.pickerButtonPlaceholder,
                  ]}
                >
                  {selectedSupplier?.name || t('stockMovement.selectSupplier')}
                </Text>
              </TouchableOpacity>
              {selectedSupplier && (
                <TouchableOpacity
                  onPress={() => setSelectedSupplier(null)}
                  style={styles.clearButton}
                >
                  <Text style={styles.clearButtonText}>
                    {t('common.clear')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Unit Cost (for stock in) */}
          {type === 'stock_in' && (
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel} weight="medium">
                {t('stockMovement.unitCost')}
              </Text>
              <SimplePriceInput
                value={unitCost}
                onValueChange={(value, numeric) => {
                  setUnitCost(value);
                  setUnitCostNumeric(numeric);
                }}
                placeholder="0"
                disabled={loading}
              />
            </View>
          )}

          {/* Reference Number */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel} weight="medium">
              {t('stockMovement.reference')}
            </Text>
            <View style={styles.inputContainer}>
              <FileText size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={referenceNumber}
                onChangeText={setReferenceNumber}
                placeholder={t('stockMovement.referencePlaceholder')}
                editable={!loading}
              />
            </View>
          </View>

          {/* Reason */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel} weight="medium">
              {t('stockMovement.reason')}
              {type === 'stock_out' && ' *'}
            </Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <FileText size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={reason}
                onChangeText={setReason}
                placeholder={t('stockMovement.reasonPlaceholder')}
                multiline
                numberOfLines={3}
                editable={!loading}
              />
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText} weight="medium">
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.saveButton,
              type === 'stock_out' && styles.saveButtonStockOut,
              loading && styles.saveButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText} weight="medium">
                {type === 'stock_in'
                  ? t('stockMovement.addStock')
                  : t('stockMovement.removeStock')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Product Picker Modal */}
      <SearchablePickerModal
        visible={showProductPicker}
        onClose={() => setShowProductPicker(false)}
        title={t('stockMovement.selectProduct')}
        items={products.map((p) => ({
          id: p.id,
          name: p.name,
        }))}
        selectedId={selectedProduct?.id}
        onSelect={(id) => {
          if (id) {
            const product = products.find((p) => p.id === id);
            if (product) {
              setSelectedProduct(product);
            }
          }
          setShowProductPicker(false);
        }}
        placeholder={t('common.searchProducts')}
        showAllOption={false}
      />

      {/* Supplier Picker Modal */}
      <SearchablePickerModal
        visible={showSupplierPicker}
        onClose={() => setShowSupplierPicker(false)}
        title={t('stockMovement.selectSupplier')}
        items={suppliers.map((s) => ({
          id: s.id,
          name: s.name,
        }))}
        selectedId={selectedSupplier?.id}
        onSelect={(id) => {
          if (id) {
            const supplier = suppliers.find((s) => s.id === id);
            if (supplier) {
              setSelectedSupplier(supplier);
            }
          }
          setShowSupplierPicker(false);
        }}
        placeholder={t('common.searchSuppliers')}
        showAllOption={false}
      />
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
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    color: '#111827',
    flex: 1,
    marginLeft: 12,
  },
  placeholder: {
    width: 32,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  typeButtonActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  typeButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  pickerButtonPlaceholder: {
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  clearButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#059669',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  saveButtonStockOut: {
    backgroundColor: '#EF4444',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
});
