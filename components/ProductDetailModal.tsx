// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   FlatList,
//   Modal,
//   SafeAreaView,
//   TouchableOpacity,
//   Image,
//   Alert,
// } from 'react-native';
// import { Card } from '@/components/Card';
// import { Product } from '@/services/database';
// import { X, Package, Calendar, Barcode, User } from 'lucide-react-native';
// import { useTranslation } from '@/context/LocalizationContext';
// import { useCurrencyFormatter } from '@/context/CurrencyContext';
// import { BulkPricingTiers } from '@/components/BulkPricingTiers';

// interface ProductDetailModalProps {
//   visible: boolean;
//   product: Product | null;
//   onClose: () => void;
//   onEdit: (product: Product) => void;
//   onDelete: (product: Product) => void;
//   getSupplierName: (supplierId: string | undefined) => string;
// }

// export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
//   visible,
//   product,
//   onClose,
//   onEdit,
//   onDelete,
//   getSupplierName,
// }) => {
//   const { t } = useTranslation();
//   const { formatPrice } = useCurrencyFormatter();
//   console.log('product is', product);

//   if (!product) return null;

//   const handleDelete = () => {
//     Alert.alert(
//       t('products.deleteProduct'),
//       `${t('products.areYouSure')} "${product.name}"?`,
//       [
//         { text: t('products.cancel'), style: 'cancel' },
//         {
//           text: t('common.delete'),
//           style: 'destructive',
//           onPress: () => {
//             onDelete(product);
//             onClose();
//           },
//         },
//       ]
//     );
//   };

//   const profit = product.price - product.cost;
//   const profitMargin = ((profit / product.price) * 100).toFixed(1);

//   // Create sections for FlatList
//   const sections = [
//     { id: 'image', type: 'image' },
//     { id: 'basic', type: 'basic' },
//     { id: 'pricing', type: 'pricing' },
//     { id: 'stock', type: 'stock' },
//     ...(product.bulk_pricing && product.bulk_pricing.length > 0
//       ? [{ id: 'bulk', type: 'bulk' }]
//       : []),
//     { id: 'movements', type: 'movements' },
//     { id: 'actions', type: 'quickActions' },
//   ];

//   const renderSection = ({ item }: { item: any }) => {
//     switch (item.type) {
//       case 'image':
//         return product.imageUrl ? (
//           <View style={styles.imageContainer}>
//             <Image
//               source={{ uri: product.imageUrl }}
//               style={styles.productImage}
//               resizeMode="cover"
//             />
//           </View>
//         ) : null;

//       case 'basic':
//         return (
//           <Card style={styles.section}>
//             <Text style={styles.sectionTitle}>{t('products.basicInfo')}</Text>

//             <View style={styles.infoRow}>
//               <Package size={20} color="#6B7280" />
//               <View style={styles.infoContent}>
//                 <Text style={styles.infoLabel}>
//                   {t('products.productName')}
//                 </Text>
//                 <Text style={styles.infoValue}>{product.name}</Text>
//               </View>
//             </View>

//             {product.barcode && (
//               <View style={styles.infoRow}>
//                 <Barcode size={20} color="#6B7280" />
//                 <View style={styles.infoContent}>
//                   <Text style={styles.infoLabel}>{t('products.barcode')}</Text>
//                   <Text style={styles.infoValue}>{product.barcode}</Text>
//                 </View>
//               </View>
//             )}

//             <View style={styles.infoRow}>
//               <User size={20} color="#6B7280" />
//               <View style={styles.infoContent}>
//                 <Text style={styles.infoLabel}>{t('products.supplier')}</Text>
//                 <Text style={styles.infoValue}>
//                   {getSupplierName(product.supplier_id)}
//                 </Text>
//               </View>
//             </View>

//             <View style={styles.infoRow}>
//               <Calendar size={20} color="#6B7280" />
//               <View style={styles.infoContent}>
//                 <Text style={styles.infoLabel}>
//                   {t('products.lastUpdated')}
//                 </Text>
//                 <Text style={styles.infoValue}>
//                   {new Date(product.updated_at).toLocaleDateString()}
//                 </Text>
//               </View>
//             </View>
//           </Card>
//         );

//       case 'pricing':
//         return (
//           <Card style={styles.section}>
//             <Text style={styles.sectionTitle}>{t('products.pricingInfo')}</Text>

//             <View style={styles.pricingGrid}>
//               <View style={styles.pricingItem}>
//                 <Text style={styles.pricingLabel}>{t('products.price')}</Text>
//                 <Text style={styles.pricingValue}>
//                   {formatPrice(product.price)}
//                 </Text>
//               </View>

//               <View style={styles.pricingItem}>
//                 <Text style={styles.pricingLabel}>{t('products.cost')}</Text>
//                 <Text style={styles.pricingValue}>
//                   {formatPrice(product.cost)}
//                 </Text>
//               </View>

//               <View style={styles.pricingItem}>
//                 <Text style={styles.pricingLabel}>{t('products.profit')}</Text>
//                 <Text style={[styles.pricingValue, styles.profitText]}>
//                   {formatPrice(profit)}
//                 </Text>
//               </View>

//               <View style={styles.pricingItem}>
//                 <Text style={styles.pricingLabel}>{t('products.margin')}</Text>
//                 <Text style={[styles.pricingValue, styles.profitText]}>
//                   {profitMargin}%
//                 </Text>
//               </View>
//             </View>
//           </Card>
//         );

//       case 'stock':
//         return (
//           <Card style={styles.section}>
//             <Text style={styles.sectionTitle}>{t('products.stockInfo')}</Text>

//             <View style={styles.stockGrid}>
//               <View style={styles.stockItem}>
//                 <Text style={styles.stockLabel}>
//                   {t('products.currentStock')}
//                 </Text>
//                 <Text
//                   style={[
//                     styles.stockValue,
//                     product.quantity <= product.min_stock &&
//                       styles.lowStockText,
//                   ]}
//                 >
//                   {product.quantity}
//                 </Text>
//               </View>

//               <View style={styles.stockItem}>
//                 <Text style={styles.stockLabel}>{t('products.minStock')}</Text>
//                 <Text style={styles.stockValue}>{product.min_stock}</Text>
//               </View>
//             </View>

//             {product.quantity <= product.min_stock && (
//               <View style={styles.lowStockWarning}>
//                 <Text style={styles.lowStockWarningText}>
//                   ⚠️ {t('products.lowStockWarning')}
//                 </Text>
//               </View>
//             )}
//           </Card>
//         );

//       case 'bulk':
//         return (
//           <Card style={styles.section}>
//             <Text style={styles.sectionTitle}>{t('products.bulkPricing')}</Text>
//             <BulkPricingTiers
//               productPrice={product.price}
//               initialTiers={product.bulk_pricing}
//               onTiersChange={() => {}} // Read-only in detail view
//               compact={false}
//             />
//           </Card>
//         );

//       case 'movements':
//         return (
//           <Card style={styles.section}>
//             <Text style={styles.sectionTitle}>
//               {t('products.stockMovements')}
//             </Text>
//             <View style={styles.movementSummary}>
//               <Text style={styles.movementSummaryText}>
//                 {t('products.viewFullHistoryNote')}
//               </Text>
//               <TouchableOpacity
//                 style={styles.viewHistoryButton}
//                 onPress={() => {
//                   // Close this modal and let user access full history from main view
//                   onClose();
//                 }}
//               >
//                 <Text style={styles.viewHistoryButtonText}>
//                   {t('products.closeToViewHistory')}
//                 </Text>
//               </TouchableOpacity>
//             </View>
//           </Card>
//         );

//       case 'quickActions':
//         return (
//           <Card style={styles.section}>
//             <Text style={styles.sectionTitle}>
//               {t('products.quickActions')}
//             </Text>
//             <View style={styles.quickActionsSummary}>
//               <Text style={styles.quickActionsSummaryText}>
//                 {t('products.quickActionsNote')}
//               </Text>
//             </View>
//           </Card>
//         );

//       default:
//         return null;
//     }
//   };

//   return (
//     <Modal
//       visible={visible}
//       animationType="slide"
//       presentationStyle="pageSheet"
//       onRequestClose={onClose}
//     >
//       <SafeAreaView style={styles.container}>
//         {/* Header */}
//         <View style={styles.header}>
//           <View style={styles.headerLeft}>
//             <Text style={styles.title}>{product.name}</Text>
//             <Text style={styles.category}>{product.category}</Text>
//           </View>
//           <TouchableOpacity onPress={onClose} style={styles.closeButton}>
//             <X size={24} color="#6B7280" />
//           </TouchableOpacity>
//         </View>

//         <FlatList
//           data={sections}
//           renderItem={renderSection}
//           keyExtractor={(item) => item.id}
//           style={styles.content}
//           contentContainerStyle={styles.contentContainer}
//           showsVerticalScrollIndicator={false}
//         />

//         {/* Action Buttons */}
//         <View style={styles.actionButtons}>
//           <TouchableOpacity
//             style={[styles.actionButtonStyle, styles.editButton]}
//             onPress={() => {
//               onEdit(product);
//               onClose();
//             }}
//           >
//             <Text style={styles.editButtonText}>{t('common.edit')}</Text>
//           </TouchableOpacity>
//           <TouchableOpacity
//             style={[styles.actionButtonStyle, styles.deleteButton]}
//             onPress={handleDelete}
//           >
//             <Text style={styles.deleteButtonText}>{t('common.delete')}</Text>
//           </TouchableOpacity>
//         </View>
//       </SafeAreaView>
//     </Modal>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F9FAFB',
//   },
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'flex-start',
//     paddingHorizontal: 16,
//     paddingVertical: 16,
//     backgroundColor: '#FFFFFF',
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E7EB',
//   },
//   headerLeft: {
//     flex: 1,
//   },
//   title: {
//     fontSize: 24,
//     fontFamily: 'Inter-Bold',
//     color: '#111827',
//   },
//   category: {
//     fontSize: 16,
//     fontFamily: 'Inter-Regular',
//     color: '#6B7280',
//     marginTop: 4,
//   },
//   closeButton: {
//     padding: 8,
//     marginLeft: 16,
//   },
//   content: {
//     flex: 1,
//   },
//   contentContainer: {
//     paddingHorizontal: 16,
//     paddingBottom: 20,
//   },
//   imageContainer: {
//     alignItems: 'center',
//     marginVertical: 16,
//   },
//   productImage: {
//     width: 200,
//     height: 200,
//     borderRadius: 12,
//   },
//   section: {
//     marginBottom: 16,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontFamily: 'Inter-SemiBold',
//     color: '#111827',
//     marginBottom: 16,
//   },
//   infoRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   infoContent: {
//     marginLeft: 12,
//     flex: 1,
//   },
//   infoLabel: {
//     fontSize: 14,
//     fontFamily: 'Inter-Medium',
//     color: '#6B7280',
//   },
//   infoValue: {
//     fontSize: 16,
//     fontFamily: 'Inter-Regular',
//     color: '#111827',
//     marginTop: 2,
//   },
//   pricingGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     justifyContent: 'space-between',
//   },
//   pricingItem: {
//     width: '48%',
//     backgroundColor: '#F9FAFB',
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 8,
//   },
//   pricingLabel: {
//     fontSize: 12,
//     fontFamily: 'Inter-Medium',
//     color: '#6B7280',
//   },
//   pricingValue: {
//     fontSize: 18,
//     fontFamily: 'Inter-SemiBold',
//     color: '#111827',
//     marginTop: 4,
//   },
//   profitText: {
//     color: '#10B981',
//   },
//   stockGrid: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   stockItem: {
//     flex: 1,
//     backgroundColor: '#F9FAFB',
//     padding: 12,
//     borderRadius: 8,
//     marginRight: 8,
//     alignItems: 'center',
//   },
//   stockLabel: {
//     fontSize: 12,
//     fontFamily: 'Inter-Medium',
//     color: '#6B7280',
//   },
//   stockValue: {
//     fontSize: 24,
//     fontFamily: 'Inter-Bold',
//     color: '#111827',
//     marginTop: 4,
//   },
//   lowStockText: {
//     color: '#EF4444',
//   },
//   lowStockWarning: {
//     backgroundColor: '#FEF2F2',
//     borderWidth: 1,
//     borderColor: '#FECACA',
//     borderRadius: 8,
//     padding: 12,
//     marginTop: 12,
//   },
//   lowStockWarningText: {
//     fontSize: 14,
//     fontFamily: 'Inter-Medium',
//     color: '#DC2626',
//     textAlign: 'center',
//   },
//   actionButtons: {
//     flexDirection: 'row',
//     paddingHorizontal: 16,
//     paddingVertical: 16,
//     backgroundColor: '#FFFFFF',
//     borderTopWidth: 1,
//     borderTopColor: '#E5E7EB',
//     gap: 12,
//   },
//   actionButtonStyle: {
//     flex: 1,
//     paddingVertical: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   editButton: {
//     backgroundColor: '#F3F4F6',
//     marginRight: 6,
//   },
//   deleteButton: {
//     backgroundColor: '#EF4444',
//     marginLeft: 6,
//   },
//   editButtonText: {
//     fontSize: 16,
//     fontFamily: 'Inter-Medium',
//     color: '#374151',
//   },
//   deleteButtonText: {
//     fontSize: 16,
//     fontFamily: 'Inter-Medium',
//     color: '#FFFFFF',
//   },
//   movementSummary: {
//     alignItems: 'center',
//     paddingVertical: 20,
//   },
//   movementSummaryText: {
//     fontSize: 14,
//     fontFamily: 'Inter-Regular',
//     color: '#6B7280',
//     textAlign: 'center',
//     marginBottom: 12,
//   },
//   viewHistoryButton: {
//     backgroundColor: '#3B82F6',
//     paddingHorizontal: 16,
//     paddingVertical: 8,
//     borderRadius: 6,
//   },
//   viewHistoryButtonText: {
//     fontSize: 14,
//     fontFamily: 'Inter-Medium',
//     color: '#FFFFFF',
//   },
//   quickActionsSummary: {
//     alignItems: 'center',
//     paddingVertical: 20,
//   },
//   quickActionsSummaryText: {
//     fontSize: 14,
//     fontFamily: 'Inter-Regular',
//     color: '#6B7280',
//     textAlign: 'center',
//   },
// });

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Product } from '@/services/database';
import {
  X,
  Edit,
  Trash2,
  Package,
  Calendar,
  Barcode,
  TrendingUp,
  User,
  DollarSign,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { BulkPricingTiers } from '@/components/BulkPricingTiers';
import { ProductMovementHistory } from '@/components/ProductMovementHistory';
import { QuickStockActions } from '@/components/QuickStockActions';
import { useBulkPricing } from '@/hooks/useQueries';

interface ProductDetailModalProps {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  getSupplierName: (supplierId: string | undefined) => string;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  visible,
  product,
  onClose,
  onEdit,
  onDelete,
  getSupplierName,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();

  // Load bulk pricing data for the product
  const { data: bulkPricingData = [] } = useBulkPricing(product?.id || '');

  if (!product) return null;

  const handleDelete = () => {
    Alert.alert(
      t('products.deleteProduct'),
      `${t('products.areYouSure')} "${product.name}"?`,
      [
        { text: t('products.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            onDelete(product);
            onClose();
          },
        },
      ]
    );
  };

  const profit = product.price - product.cost;
  const profitMargin = ((profit / product.price) * 100).toFixed(1);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title} weight="bold">
              {product.name}
            </Text>
            <Text style={styles.category}>{product.category}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Product Image */}
          {product.imageUrl && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: product.imageUrl }}
                style={styles.productImage}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Basic Information */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle} weight="medium">
              {t('products.basicInfo')}
            </Text>

            <View style={styles.infoRow}>
              <Package size={20} color="#6B7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel} weight="medium">
                  {t('products.productName')}
                </Text>
                <Text style={styles.infoValue}>{product.name}</Text>
              </View>
            </View>

            {product.barcode && (
              <View style={styles.infoRow}>
                <Barcode size={20} color="#6B7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>{t('products.barcode')}</Text>
                  <Text style={styles.infoValue}>{product.barcode}</Text>
                </View>
              </View>
            )}

            <View style={styles.infoRow}>
              <User size={20} color="#6B7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{t('products.supplier')}</Text>
                <Text style={styles.infoValue}>
                  {getSupplierName(product.supplier_id)}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Calendar size={20} color="#6B7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>
                  {t('products.lastUpdated')}
                </Text>
                <Text style={styles.infoValue}>
                  {new Date(product.updated_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
          </Card>

          {/* Pricing Information */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t('products.pricingInfo')}</Text>

            <View style={styles.pricingGrid}>
              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>{t('products.price')}</Text>
                <Text style={styles.pricingValue}>
                  {formatPrice(product.price)}
                </Text>
              </View>

              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>{t('products.cost')}</Text>
                <Text style={styles.pricingValue}>
                  {formatPrice(product.cost)}
                </Text>
              </View>

              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>{t('products.profit')}</Text>
                <Text style={[styles.pricingValue, styles.profitText]}>
                  {formatPrice(profit)}
                </Text>
              </View>

              <View style={styles.pricingItem}>
                <Text style={styles.pricingLabel}>{t('products.margin')}</Text>
                <Text style={[styles.pricingValue, styles.profitText]}>
                  {profitMargin}%
                </Text>
              </View>
            </View>
          </Card>

          {/* Bulk Pricing */}
          {bulkPricingData && bulkPricingData.length > 0 && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('products.bulkPricing')}
              </Text>
              <BulkPricingTiers
                productPrice={product.price}
                initialTiers={bulkPricingData}
                onTiersChange={() => {}} // Read-only in detail view
                compact={false}
                readonly
              />
            </Card>
          )}

          {/* Stock Information */}
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>{t('products.stockInfo')}</Text>
            <ProductMovementHistory product={product} compact={true} />

            <View style={styles.stockGrid}>
              <View style={styles.stockItem}>
                <Text style={styles.stockLabel}>
                  {t('products.currentStock')}
                </Text>
                <Text
                  style={[
                    styles.stockValue,
                    product.quantity <= product.min_stock &&
                      styles.lowStockText,
                  ]}
                >
                  {product.quantity}
                </Text>
              </View>

              <View style={styles.stockItem}>
                <Text style={styles.stockLabel}>{t('products.minStock')}</Text>
                <Text style={styles.stockValue}>{product.min_stock}</Text>
              </View>
            </View>

            {product.quantity <= product.min_stock && (
              <View style={styles.lowStockWarning}>
                <Text style={styles.lowStockWarningText}>
                  ⚠️ {t('products.lowStockWarning')}
                </Text>
              </View>
            )}
          </Card>

          {/* Quick Stock Actions */}
          {/* <Card style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('products.quickActions')}
            </Text>
            <QuickStockActions product={product} />
          </Card> */}

          {/* Stock Movement History */}
          {/* <Card style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('products.stockMovements')}
            </Text>
            <ProductMovementHistory product={product} compact={true} />
          </Card> */}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            title={t('common.edit')}
            onPress={() => {
              onEdit(product);
              onClose();
            }}
            variant="secondary"
            style={styles.actionButton}
          />
          <Button
            title={t('common.delete')}
            onPress={handleDelete}
            variant="danger"
            style={styles.actionButton}
          />
        </View>
      </SafeAreaView>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    color: '#111827',
  },
  category: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
    marginLeft: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  imageContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  productImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 16,
    color: '#111827',
    marginTop: 2,
  },
  pricingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  pricingItem: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  pricingLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  pricingValue: {
    fontSize: 18,
    color: '#111827',
    marginTop: 4,
  },
  profitText: {
    color: '#10B981',
  },
  stockGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stockItem: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  stockValue: {
    fontSize: 24,
    color: '#111827',
    marginTop: 4,
  },
  lowStockText: {
    color: '#EF4444',
  },
  lowStockWarning: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  lowStockWarningText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
});
