import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { MyanmarTextInput as TextInput } from '@/components/MyanmarTextInput';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PriceInput } from '@/components/PriceInput';
import { BulkPricingTiers } from '@/components/BulkPricingTiers';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import {
  useCategories,
  useBasicSuppliers,
  useProductMutations,
  useBulkPricing,
} from '@/hooks/useQueries';
import { useToast } from '@/context/ToastContext';
import { useDatabase } from '@/context/DatabaseContext';
import { Product } from '@/services/database';
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Scan,
  Package,
  X,
  ChevronDown,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { documentDirectory } from 'expo-file-system/legacy';
import { BarcodeScanner } from '@/components/BarcodeScanner';

/**
 * Product Form Page
 * Handles both creating new products and editing existing ones
 */
export default function ProductForm() {
  const { mode, id } = useLocalSearchParams<{
    mode: 'create' | 'edit';
    id?: string;
  }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();
  const { showToast } = useToast();
  const { db, isReady } = useDatabase();

  const isEditMode = mode === 'edit';

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSupplierPicker, setShowSupplierPicker] = useState(false);

  const { data: categories = [] } = useCategories();
  const { data: suppliers = [] } = useBasicSuppliers();
  const { data: editingProductBulkPricing = [] } = useBulkPricing(id || '');
  const { addProduct, updateProduct, updateProductWithBulkPricing } =
    useProductMutations();

  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    category_id: '',
    price: '',
    cost: '',
    quantity: '0',
    min_stock: '10',
    supplier_id: '',
    imageUrl: '',
  });

  const [numericValues, setNumericValues] = useState({
    price: 0,
    cost: 0,
  });

  const [bulkPricingTiers, setBulkPricingTiers] = useState<
    Array<{ min_quantity: number; bulk_price: number }>
  >([]);

  // Load product data if editing
  useEffect(() => {
    if (!isEditMode || !isReady || !db || !id) return;

    const loadProduct = async () => {
      try {
        setIsLoading(true);
        const products = await db.getProducts();
        const foundProduct = products.find((p) => p.id === id);

        if (foundProduct) {
          setProduct(foundProduct);
          setFormData({
            name: foundProduct.name,
            barcode: foundProduct.barcode || '',
            category_id: foundProduct.category_id,
            price: formatPrice(foundProduct.price),
            cost: formatPrice(foundProduct.cost),
            quantity: foundProduct.quantity.toString(),
            min_stock: foundProduct.min_stock?.toString() || '10',
            supplier_id: foundProduct.supplier_id || '',
            imageUrl: foundProduct.imageUrl || '',
          });
          setNumericValues({
            price: foundProduct.price,
            cost: foundProduct.cost,
          });
        }
      } catch (error) {
        console.error('Error loading product:', error);
        showToast(t('common.error'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [id, isEditMode, isReady, db]);

  // Load bulk pricing tiers when editing
  useEffect(() => {
    if (isEditMode && editingProductBulkPricing.length > 0) {
      setBulkPricingTiers(
        editingProductBulkPricing.map((bp) => ({
          min_quantity: bp.min_quantity,
          bulk_price: bp.bulk_price,
        })),
      );
    }
  }, [isEditMode, editingProductBulkPricing]);

  const handleBarcodeScanned = (barcode: string) => {
    setFormData({ ...formData, barcode });
    setShowBarcodeScanner(false);
    showToast(t('messages.barcodeAdded', { barcode }), 'success');
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAsset = result.assets[0];
      const fileName = selectedAsset.uri.split('/').pop();
      //@ts-ignore
      const newPath = documentDirectory + fileName;

      try {
        //@ts-ignore
        const sourceFile = new FileSystem.File(selectedAsset.uri);
        const destFile = new FileSystem.File(newPath);
        await sourceFile.copy(destFile);

        setFormData({ ...formData, imageUrl: newPath });
        showToast(t('products.imageSelected'), 'success');
      } catch (error) {
        console.error('Error saving image:', error);
        Alert.alert(t('common.error'), t('products.failedToSaveImage'));
      }
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        t('products.permissionRequired'),
        t('products.cameraPermissionNeeded'),
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedAsset = result.assets[0];
      const fileName = selectedAsset.uri.split('/').pop();
      //@ts-ignore
      const newPath = documentDirectory + fileName;

      try {
        //@ts-ignore
        const sourceFile = new FileSystem.File(selectedAsset.uri);
        const destFile = new FileSystem.File(newPath);
        await sourceFile.copy(destFile);

        setFormData({ ...formData, imageUrl: newPath });
        showToast(t('products.photoTaken'), 'success');
      } catch (error) {
        console.error('Error saving image:', error);
        Alert.alert(t('common.error'), t('products.failedToSaveImage'));
      }
    }
  };

  const handleBulkPricingTiersChange = useCallback(
    (newTiers: Array<{ min_quantity: number; bulk_price: number }>) => {
      setBulkPricingTiers(newTiers);
    },
    [],
  );

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert(t('common.error'), t('products.nameRequired'));
      return;
    }

    if (!formData.category_id) {
      Alert.alert(t('common.error'), t('products.categoryRequired'));
      return;
    }

    if (!formData.price || numericValues.price <= 0) {
      Alert.alert(t('common.error'), t('products.priceRequired'));
      return;
    }

    if (!formData.cost || numericValues.cost <= 0) {
      Alert.alert(t('common.error'), t('products.costRequired'));
      return;
    }

    try {
      const productData = {
        name: formData.name,
        barcode: formData.barcode ? formData.barcode : undefined,
        category_id: formData.category_id,
        price: numericValues.price,
        cost: numericValues.cost,
        quantity: parseInt(formData.quantity) || 0,
        min_stock: parseInt(formData.min_stock) || 10,
        supplier_id: formData.supplier_id || undefined,
        imageUrl: formData.imageUrl || undefined,
      };

      if (isEditMode && id) {
        if (bulkPricingTiers.length > 0) {
          await updateProductWithBulkPricing.mutateAsync({
            id,
            productData,
            bulkPricingTiers,
          });
        } else {
          await updateProduct.mutateAsync({
            id,
            data: productData,
          });
        }
      } else {
        const newProductId = await addProduct.mutateAsync(productData);

        if (bulkPricingTiers.length > 0 && newProductId) {
          await updateProductWithBulkPricing.mutateAsync({
            id: newProductId,
            productData: {},
            bulkPricingTiers,
          });
        }
      }

      showToast(
        isEditMode ? t('products.productUpdated') : t('products.productAdded'),
        'success',
      );
      router.back();
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert(t('common.error'), t('products.failedToSave'));
    }
  };

  const getCategoryName = () => {
    if (!formData.category_id) return t('products.selectCategory');
    const category = categories.find((c) => c.id === formData.category_id);
    return category ? category.name : t('products.selectCategory');
  };

  const getSupplierName = () => {
    if (!formData.supplier_id) return t('products.noSupplier');
    const supplier = suppliers.find((s) => s.id === formData.supplier_id);
    return supplier ? supplier.name : t('products.noSupplier');
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title} weight="bold">
          {isEditMode ? t('products.editProduct') : t('products.addNewProduct')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Section */}
        <View style={styles.card}>
          <View style={styles.imageSection}>
            {formData.imageUrl ? (
              <Image
                source={{ uri: formData.imageUrl }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Package size={48} color="#D1D5DB" />
                <Text style={styles.imagePlaceholderText}>
                  {t('products.noImage')}
                </Text>
              </View>
            )}
            <View style={styles.imageButtons}>
              <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                <Camera size={20} color="#FFFFFF" />
                <Text style={styles.imageButtonText}>
                  {t('products.camera')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                <ImageIcon size={20} color="#FFFFFF" />
                <Text style={styles.imageButtonText}>
                  {t('products.gallery')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle} weight="bold">
            {t('products.basicInfo')}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('products.productName')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('products.productName')}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {t('products.barcode')} ({t('products.optional')})
            </Text>
            <View style={styles.barcodeInput}>
              <TextInput
                style={[styles.input, styles.barcodeField]}
                placeholder={t('products.barcode')}
                value={formData.barcode}
                onChangeText={(text) =>
                  setFormData({ ...formData, barcode: text })
                }
              />
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => setShowBarcodeScanner(true)}
              >
                <Scan size={20} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('products.category')} *</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={styles.pickerText}>{getCategoryName()}</Text>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Pricing Information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle} weight="bold">
            {t('products.pricingInfo')}
          </Text>

          <View style={styles.inputContainer}>
            <PriceInput
              label={`${t('products.price')} *`}
              value={formData.price}
              onValueChange={(text: string, numericValue: number) => {
                setFormData({ ...formData, price: text });
                setNumericValues({ ...numericValues, price: numericValue });
              }}
              placeholder={t('products.price')}
            />
          </View>

          <View style={styles.inputContainer}>
            <PriceInput
              label={`${t('products.cost')} *`}
              value={formData.cost}
              onValueChange={(text: string, numericValue: number) => {
                setFormData({ ...formData, cost: text });
                setNumericValues({ ...numericValues, cost: numericValue });
              }}
              placeholder={t('products.cost')}
            />
          </View>

          {numericValues.price > 0 && numericValues.cost > 0 && (
            <View style={styles.profitPreview}>
              <Text style={styles.profitLabel}>
                {t('products.profitPreview')}:
              </Text>
              <Text style={styles.profitValue} weight="bold">
                {formatPrice(numericValues.price - numericValues.cost)} (
                {(
                  ((numericValues.price - numericValues.cost) /
                    numericValues.price) *
                  100
                ).toFixed(1)}
                %)
              </Text>
            </View>
          )}
        </View>

        {/* Stock Information */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle} weight="bold">
            {t('products.stockInfo')}
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('products.quantity')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('products.quantity')}
              value={formData.quantity}
              onChangeText={(text) =>
                setFormData({ ...formData, quantity: text })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('products.minStockLevel')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('products.minStockLevel')}
              value={formData.min_stock}
              onChangeText={(text) =>
                setFormData({ ...formData, min_stock: text })
              }
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>
              {t('products.supplier')} ({t('products.optional')})
            </Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowSupplierPicker(true)}
            >
              <Text style={styles.pickerText}>{getSupplierName()}</Text>
              <ChevronDown size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bulk Pricing */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle} weight="bold">
            {t('products.bulkPricing')} ({t('products.optional')})
          </Text>
          <BulkPricingTiers
            productPrice={numericValues.price}
            initialTiers={bulkPricingTiers}
            onTiersChange={handleBulkPricingTiersChange}
          />
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <Button
          title={t('common.cancel')}
          onPress={() => router.back()}
          variant="secondary"
          style={styles.footerButton}
        />
        <Button
          title={isEditMode ? t('common.update') : t('common.add')}
          onPress={handleSubmit}
          style={styles.footerButton}
        />
      </View>

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onBarcodeScanned={handleBarcodeScanned}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} weight="bold">
              {t('products.selectCategory')}
            </Text>
            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.modalItem,
                  formData.category_id === category.id &&
                    styles.modalItemSelected,
                ]}
                onPress={() => {
                  setFormData({ ...formData, category_id: category.id });
                  setShowCategoryPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    formData.category_id === category.id &&
                      styles.modalItemTextSelected,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Supplier Picker Modal */}
      <Modal
        visible={showSupplierPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSupplierPicker(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} weight="bold">
              {t('products.selectSupplier')}
            </Text>
            <TouchableOpacity onPress={() => setShowSupplierPicker(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <TouchableOpacity
              style={[
                styles.modalItem,
                !formData.supplier_id && styles.modalItemSelected,
              ]}
              onPress={() => {
                setFormData({ ...formData, supplier_id: '' });
                setShowSupplierPicker(false);
              }}
            >
              <Text
                style={[
                  styles.modalItemText,
                  !formData.supplier_id && styles.modalItemTextSelected,
                ]}
              >
                {t('products.noSupplier')}
              </Text>
            </TouchableOpacity>
            {suppliers.map((supplier) => (
              <TouchableOpacity
                key={supplier.id}
                style={[
                  styles.modalItem,
                  formData.supplier_id === supplier.id &&
                    styles.modalItemSelected,
                ]}
                onPress={() => {
                  setFormData({ ...formData, supplier_id: supplier.id });
                  setShowSupplierPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.modalItemText,
                    formData.supplier_id === supplier.id &&
                      styles.modalItemTextSelected,
                  ]}
                >
                  {supplier.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  card: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
  },
  imageSection: {
    alignItems: 'center',
  },
  productImage: {
    width: 150,
    height: 150,
    borderRadius: 12,
    marginBottom: 16,
  },
  imagePlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  imagePlaceholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  imageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  barcodeInput: {
    flexDirection: 'row',
    gap: 8,
  },
  barcodeField: {
    flex: 1,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  pickerText: {
    fontSize: 16,
    color: '#111827',
  },
  profitPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    marginTop: 8,
  },
  profitLabel: {
    fontSize: 14,
    color: '#059669',
  },
  profitValue: {
    fontSize: 16,
    color: '#059669',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerButton: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    color: '#111827',
  },
  modalContent: {
    flex: 1,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  modalItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  modalItemText: {
    fontSize: 16,
    color: '#111827',
  },
  modalItemTextSelected: {
    color: '#059669',
    fontWeight: '500',
  },
});
