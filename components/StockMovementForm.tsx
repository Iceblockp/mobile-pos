import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SimplePriceInput } from '@/components/PriceInput';
import {
  useBasicSuppliers,
  useStockMovementMutations,
} from '@/hooks/useQueries';
import { Product } from '@/services/database';
import { X, Package, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/hooks/useCurrency';
// import { useCurrencyFormatter } from '@/context/CurrencyContext';

interface StockMovementFormProps {
  visible: boolean;
  onClose: () => void;
  product?: Product;
  initialType?: 'stock_in' | 'stock_out';
}

export const StockMovementForm: React.FC<StockMovementFormProps> = ({
  visible,
  onClose,
  product,
  initialType = 'stock_in',
}) => {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const { parsePrice } = useCurrencyFormatter();
  const [type, setType] = useState<'stock_in' | 'stock_out'>(initialType);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [referenceNumber, setReferenceNumber] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [unitCostNumeric, setUnitCostNumeric] = useState(0);

  const { data: suppliers = [] } = useBasicSuppliers();
  const { updateProductQuantityWithMovement } = useStockMovementMutations();

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      setType(initialType);
      setQuantity('');
      setReason('');
      setSupplierId(undefined);
      setReferenceNumber('');
      setUnitCost('');
      setUnitCostNumeric(0);
    }
  }, [visible, initialType]);

  const handleSubmit = async () => {
    if (!product) return;

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      Alert.alert(t('common.error'), t('stockMovement.enterValidQuantity'));
      return;
    }

    if (type === 'stock_out' && quantityNum > product.quantity) {
      Alert.alert(
        t('common.error'),
        t('stockMovement.insufficientStock', {
          available: product.quantity,
          requested: quantityNum,
        })
      );
      return;
    }

    if (type === 'stock_out' && !reason.trim()) {
      Alert.alert(t('common.error'), t('stockMovement.reasonRequired'));
      return;
    }

    try {
      await updateProductQuantityWithMovement.mutateAsync({
        productId: product.id,
        movementType: type,
        quantity: quantityNum,
        reason: reason.trim() || undefined,
        supplierId: supplierId,
        referenceNumber: referenceNumber.trim() || undefined,
        unitCost: unitCostNumeric > 0 ? unitCostNumeric : undefined,
      });

      showToast(
        type === 'stock_in'
          ? t('stockMovement.stockAddedSuccessfully')
          : t('stockMovement.stockRemovedSuccessfully'),
        'success'
      );

      onClose();
    } catch (error) {
      console.error('Error processing stock movement:', error);
      Alert.alert(t('common.error'), t('stockMovement.failedToProcess'));
    }
  };

  // Removed formatMMK function - now using standardized currency formatting

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Package size={24} color="#059669" />
              <Text style={styles.title}>{t('stockMovement.title')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {product && (
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.currentStock}>
                {t('stockMovement.currentStock')}: {product.quantity}
              </Text>
            </View>
          )}

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Movement Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('stockMovement.type')}</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    type === 'stock_in' && styles.typeButtonActive,
                  ]}
                  onPress={() => setType('stock_in')}
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
                  >
                    {t('stockMovement.stockOut')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quantity Input */}
            <View style={styles.section}>
              <Text style={styles.label}>{t('stockMovement.quantity')}</Text>
              <TextInput
                style={styles.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder={t('stockMovement.enterQuantity')}
                keyboardType="numeric"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Reason Input (required for stock_out) */}
            <View style={styles.section}>
              <Text style={styles.label}>
                {t('stockMovement.reason')}
                {type === 'stock_out' && (
                  <Text style={styles.required}> *</Text>
                )}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={reason}
                onChangeText={setReason}
                placeholder={
                  type === 'stock_in'
                    ? t('stockMovement.reasonPlaceholderIn')
                    : t('stockMovement.reasonPlaceholderOut')
                }
                multiline
                numberOfLines={3}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Supplier Selection (for stock_in) */}
            {type === 'stock_in' && (
              <View style={styles.section}>
                <Text style={styles.label}>
                  {t('stockMovement.supplier')} ({t('common.optional')})
                </Text>
                <View style={styles.supplierSelector}>
                  <TouchableOpacity
                    style={[
                      styles.supplierOption,
                      !supplierId && styles.supplierOptionActive,
                    ]}
                    onPress={() => setSupplierId(undefined)}
                  >
                    <Text
                      style={[
                        styles.supplierOptionText,
                        !supplierId && styles.supplierOptionTextActive,
                      ]}
                    >
                      {t('stockMovement.noSupplier')}
                    </Text>
                  </TouchableOpacity>
                  {suppliers.map((supplier) => (
                    <TouchableOpacity
                      key={supplier.id}
                      style={[
                        styles.supplierOption,
                        supplierId === supplier.id &&
                          styles.supplierOptionActive,
                      ]}
                      onPress={() => setSupplierId(supplier.id)}
                    >
                      <Text
                        style={[
                          styles.supplierOptionText,
                          supplierId === supplier.id &&
                            styles.supplierOptionTextActive,
                        ]}
                      >
                        {supplier.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Reference Number (for stock_in) */}
            {type === 'stock_in' && (
              <View style={styles.section}>
                <Text style={styles.label}>
                  {t('stockMovement.referenceNumber')} ({t('common.optional')})
                </Text>
                <TextInput
                  style={styles.input}
                  value={referenceNumber}
                  onChangeText={setReferenceNumber}
                  placeholder={t('stockMovement.referenceNumberPlaceholder')}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            )}

            {/* Unit Cost (for stock_in) */}
            {type === 'stock_in' && (
              <View style={styles.section}>
                <Text style={styles.label}>
                  {t('stockMovement.unitCost')} ({t('common.optional')})
                </Text>
                <SimplePriceInput
                  value={unitCost}
                  onValueChange={(text, numericValue) => {
                    setUnitCost(text);
                    setUnitCostNumeric(numericValue);
                  }}
                  placeholder={t('stockMovement.unitCostPlaceholder')}
                  style={styles.input}
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={t('common.cancel')}
              onPress={onClose}
              variant="secondary"
              style={styles.footerButton}
            />
            <Button
              title={
                updateProductQuantityWithMovement.isPending
                  ? t('common.processing')
                  : type === 'stock_in'
                  ? t('stockMovement.addStock')
                  : t('stockMovement.removeStock')
              }
              onPress={handleSubmit}
              disabled={updateProductQuantityWithMovement.isPending}
              style={styles.footerButton}
            />
          </View>

          {updateProductQuantityWithMovement.isPending && (
            <View style={styles.loadingOverlay}>
              <LoadingSpinner />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  productInfo: {
    padding: 20,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  currentStock: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#059669',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#111827',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  typeButtonActive: {
    borderColor: '#059669',
    backgroundColor: '#059669',
  },
  typeButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginLeft: 8,
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  supplierSelector: {
    gap: 8,
  },
  supplierOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  supplierOptionActive: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  supplierOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  supplierOptionTextActive: {
    color: '#059669',
  },
  costPreview: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#059669',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
