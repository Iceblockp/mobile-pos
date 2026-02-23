import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  PixelRatio,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Card } from '@/components/Card';
import { useSaleItems, useSaleMutations } from '@/hooks/useQueries';
import { useDatabase } from '@/context/DatabaseContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import {
  ArrowLeft,
  MoreVertical,
  FileText,
  Trash2,
  Printer,
  ImageIcon,
} from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/context/LocalizationContext';
import { EnhancedPrintManager } from '@/components/EnhancedPrintManager';
import {
  PaymentMethodService,
  type PaymentMethod,
} from '@/services/paymentMethodService';

/**
 * Sale Detail Page
 * Displays detailed information about a specific sale
 * with actions in a dropdown menu
 */
export default function SaleDetail() {
  const { showToast } = useToast();
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { db } = useDatabase();

  // Parse sale data from params
  const sale = params.sale ? JSON.parse(params.sale as string) : null;

  const [isCustomerVoucher, setIsCustomerVoucher] = useState(true);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showPrintManager, setShowPrintManager] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [capturing, setCapturing] = useState(false);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const saleDetailRef = useRef(null);
  const { formatPrice } = useCurrencyFormatter();
  const { deleteSale } = useSaleMutations();

  const { data: saleItems = [], isLoading: saleItemsLoading } = useSaleItems(
    sale?.id || 0,
  );

  // Load payment methods
  React.useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const methods = await PaymentMethodService.getPaymentMethods();
        setPaymentMethods(methods);
      } catch (error) {
        console.error('Error loading payment methods:', error);
      }
    };
    loadPaymentMethods();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const localOffset = new Date().getTimezoneOffset();
    const localDate = new Date(date.getTime() - localOffset * 60000);

    return localDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const prepareReceiptData = () => {
    if (!sale || !saleItems) return null;

    const formattedItems = saleItems.map((item) => ({
      product: {
        id: item.product_id,
        name: item.product_name || 'Unknown Product',
        price: item.price,
      },
      quantity: item.quantity,
      discount: item.discount || 0,
      subtotal: item.subtotal,
    }));

    return {
      voucherId: sale.voucher_id,
      items: formattedItems,
      total: sale.total,
      paymentMethod: sale.payment_method,
      note: sale.note || '',
      date: new Date(sale.created_at),
    };
  };

  const handlePrintReceipt = () => {
    const printData = prepareReceiptData();
    if (printData) {
      setReceiptData(printData);
      setShowPrintManager(true);
      setShowActionsMenu(false);
    }
  };

  const captureSaleDetail = async () => {
    if (!saleDetailRef.current || !sale) return;

    try {
      setCapturing(true);
      setShowActionsMenu(false);
      const pixelRatio = PixelRatio.get();

      const uri = await captureRef(saleDetailRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        height: 1920 / pixelRatio,
        width: 1080 / pixelRatio,
      });

      const isAvailable = await Sharing.isAvailableAsync();

      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: `Sale #${sale.voucher_id} Details`,
          UTI: 'public.png',
        });
        showToast('Sale detail exported as image', 'success');
      } else {
        Alert.alert(
          'Sharing not available',
          'Sharing is not available on this device',
        );
      }
    } catch (error) {
      console.error('Error capturing sale detail:', error);
      Alert.alert(t('common.error'), t('sales.failedToExportSaleDetail'));
    } finally {
      setCapturing(false);
    }
  };

  const handleDeleteSale = async () => {
    if (!sale) return;

    setShowActionsMenu(false);

    Alert.alert(
      t('sales.deleteSale'),
      t('sales.deleteSaleConfirm', { saleId: sale.voucher_id }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSale.mutateAsync(sale.id);
              showToast(t('sales.saleDeletedSuccessfully'), 'success');
              router.back();
            } catch (error) {
              console.error('Error deleting sale:', error);
              Alert.alert(t('common.error'), t('sales.failedToDeleteSale'));
            }
          },
        },
      ],
    );
  };

  const handleRecordDebtPayment = () => {
    setShowActionsMenu(false);
    setShowRecordPaymentModal(true);
  };

  const handlePaymentMethodSelection = async (paymentMethodName: string) => {
    if (!sale || !db) return;

    try {
      setRecordingPayment(true);
      await db.updateSalePaymentMethod(sale.id, paymentMethodName);
      showToast(t('debt.paymentRecorded'), 'success');
      setShowRecordPaymentModal(false);
      router.back();
    } catch (error) {
      console.error('Error recording debt payment:', error);
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setRecordingPayment(false);
    }
  };

  if (!sale) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Sale not found</Text>
      </SafeAreaView>
    );
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
          {t('sales.saleDetails')}
        </Text>
        <TouchableOpacity
          onPress={() => setShowActionsMenu(!showActionsMenu)}
          style={styles.moreButton}
        >
          <MoreVertical size={24} color="#111827" />
        </TouchableOpacity>

        {/* Actions Dropdown Menu */}
        {showActionsMenu && (
          <View style={styles.actionsMenu}>
            {/* Voucher Toggle */}
            <TouchableOpacity
              style={styles.actionsMenuItem}
              onPress={() => {
                setIsCustomerVoucher(!isCustomerVoucher);
                setShowActionsMenu(false);
              }}
            >
              <FileText size={18} color="#059669" />
              <Text style={styles.actionsMenuItemText}>
                {isCustomerVoucher
                  ? t('sales.internalView')
                  : t('sales.customerReceipt')}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionsMenuDivider} />

            {/* Print/Export */}
            <TouchableOpacity
              style={styles.actionsMenuItem}
              onPress={
                isCustomerVoucher ? handlePrintReceipt : captureSaleDetail
              }
              disabled={capturing}
            >
              {isCustomerVoucher ? (
                <Printer size={18} color="#0284C7" />
              ) : (
                <ImageIcon size={18} color="#0284C7" />
              )}
              <Text style={styles.actionsMenuItemText}>
                {capturing
                  ? t('sales.exporting')
                  : isCustomerVoucher
                    ? t('sales.printCustomerReceipt')
                    : t('sales.exportAsImage')}
              </Text>
            </TouchableOpacity>

            {/* Record Debt Payment */}
            {sale.payment_method === 'Debt' && (
              <>
                <View style={styles.actionsMenuDivider} />
                <TouchableOpacity
                  style={styles.actionsMenuItem}
                  onPress={handleRecordDebtPayment}
                >
                  <FileText size={18} color="#F59E0B" />
                  <Text style={styles.actionsMenuItemText}>
                    {t('debt.recordPayment')}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.actionsMenuDivider} />

            {/* Delete */}
            <TouchableOpacity
              style={styles.actionsMenuItem}
              onPress={handleDeleteSale}
            >
              <Trash2 size={18} color="#EF4444" />
              <Text style={[styles.actionsMenuItemText, styles.deleteText]}>
                {t('sales.deleteSale')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        <View
          ref={saleDetailRef}
          collapsable={false}
          style={styles.captureContainer}
        >
          <Card style={styles.saleDetailCard}>
            <Text style={styles.saleDetailTitle}>
              {t('sales.saleInformation')}
            </Text>
            <View style={styles.saleDetailRow}>
              <Text style={styles.saleDetailLabel}>{t('sales.saleId')}</Text>
              <Text style={styles.saleDetailValue}>#{sale.voucher_id}</Text>
            </View>
            <View style={styles.saleDetailRow}>
              <Text style={styles.saleDetailLabel}>{t('sales.date')}</Text>
              <Text style={styles.saleDetailValue}>
                {formatDate(sale.created_at)}
              </Text>
            </View>
            {sale.customer_name && (
              <View style={styles.saleDetailRow}>
                <Text style={styles.saleDetailLabel}>
                  {t('customers.customer')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (sale.customer_id) {
                      router.push({
                        pathname: '/customer-detail',
                        params: { id: sale.customer_id },
                      });
                    }
                  }}
                  disabled={!sale.customer_id}
                >
                  <Text
                    style={[
                      styles.saleDetailValue,
                      sale.customer_id && styles.saleDetailValueLink,
                    ]}
                  >
                    {sale.customer_name}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.saleDetailRow}>
              <Text style={styles.saleDetailLabel}>
                {t('sales.paymentMethod')}
              </Text>
              <Text style={styles.saleDetailValue}>
                {sale.payment_method.toUpperCase()}
              </Text>
            </View>
            {sale.note && (
              <View style={styles.saleDetailRow}>
                <Text style={styles.saleDetailLabel}>
                  {t('sales.saleNote')}
                </Text>
                <Text style={styles.saleDetailValue}>{sale.note}</Text>
              </View>
            )}
            <View style={styles.saleDetailRow}>
              <Text style={styles.saleDetailLabel}>
                {t('sales.totalAmount')}
              </Text>
              <Text style={[styles.saleDetailValue, styles.saleDetailTotal]}>
                {formatPrice(sale.total)}
              </Text>
            </View>

            {!isCustomerVoucher && (
              <>
                <View style={styles.saleDetailRow}>
                  <Text style={styles.saleDetailLabel}>
                    {t('sales.totalCost')}
                  </Text>
                  <Text style={styles.saleDetailValue}>
                    {formatPrice(
                      saleItems.reduce(
                        (sum, item) => sum + item.cost * item.quantity,
                        0,
                      ),
                    )}
                  </Text>
                </View>
                <View style={styles.saleDetailRow}>
                  <Text style={styles.saleDetailLabel}>
                    {t('sales.totalProfit')}
                  </Text>
                  <Text
                    style={[styles.saleDetailValue, styles.saleDetailProfit]}
                  >
                    {formatPrice(
                      sale.total -
                        saleItems.reduce(
                          (sum, item) => sum + item.cost * item.quantity,
                          0,
                        ),
                    )}
                  </Text>
                </View>
              </>
            )}
          </Card>

          <Card style={styles.saleDetailCard}>
            <Text style={styles.saleDetailTitle}>
              {t('sales.itemsPurchased')}
            </Text>
            {saleItems.map((item, index) => (
              <View key={index} style={styles.saleItemRow}>
                <View style={styles.saleItemInfo}>
                  <Text style={styles.saleItemName}>{item.product_name}</Text>
                  <Text style={styles.saleItemDetails}>
                    {item.quantity} × {formatPrice(item.price)}
                    {item.discount > 0 && (
                      <Text style={styles.saleItemDiscount}>
                        {' '}
                        - {formatPrice(item.discount)} {t('sales.discount')}
                      </Text>
                    )}
                  </Text>
                </View>
                <View style={styles.saleItemPricing}>
                  <Text style={styles.saleItemSubtotal}>
                    {formatPrice(item.subtotal)}
                  </Text>
                  {!isCustomerVoucher && (
                    <Text style={styles.saleItemProfit}>
                      {t('sales.profit')}{' '}
                      {formatPrice(item.subtotal - item.cost * item.quantity)}
                    </Text>
                  )}
                </View>
              </View>
            ))}

            <View style={styles.saleItemsTotal}>
              <Text style={styles.saleItemsTotalLabel}>
                {t('sales.totalItems')} {saleItems.length}
              </Text>
              <Text style={styles.saleItemsTotalValue}>
                {formatPrice(sale.total)}
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>

      {/* Print Manager */}
      {receiptData && (
        <EnhancedPrintManager
          visible={showPrintManager}
          onClose={() => {
            setShowPrintManager(false);
            setReceiptData(null);
          }}
          receiptData={receiptData}
        />
      )}

      {/* Record Debt Payment Modal */}
      <Modal
        visible={showRecordPaymentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRecordPaymentModal(false)}
      >
        <View style={styles.recordPaymentModalOverlay}>
          <View style={styles.recordPaymentModalContainer}>
            <View style={styles.recordPaymentModalHeader}>
              <Text style={styles.recordPaymentModalTitle} weight="bold">
                {t('debt.recordDebtPayment')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowRecordPaymentModal(false)}
                disabled={recordingPayment}
              >
                <Text style={styles.closeText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.recordPaymentModalDescription}>
              {t('sales.selectPaymentMethod')}
            </Text>

            <View style={styles.paymentMethodOptionsContainer}>
              {paymentMethods
                .filter((method) => method.id !== 'debt')
                .map((method) => (
                  <TouchableOpacity
                    key={method.id}
                    style={styles.paymentMethodOption}
                    onPress={() => handlePaymentMethodSelection(method.name)}
                    disabled={recordingPayment}
                  >
                    <View
                      style={[
                        styles.paymentMethodOptionIcon,
                        { backgroundColor: method.color + '20' },
                      ]}
                    >
                      <Text style={styles.paymentMethodOptionIconText}>
                        {method.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text
                      style={styles.paymentMethodOptionText}
                      weight="medium"
                    >
                      {method.name}
                    </Text>
                  </TouchableOpacity>
                ))}
            </View>

            {recordingPayment && (
              <View style={styles.recordingPaymentIndicator}>
                <ActivityIndicator size="small" color="#F59E0B" />
                <Text style={styles.recordingPaymentText}>
                  {t('sales.recordingPayment')}
                </Text>
              </View>
            )}
          </View>
        </View>
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
  moreButton: {
    padding: 4,
  },
  actionsMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  actionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionsMenuItemText: {
    fontSize: 15,
    color: '#111827',
  },
  deleteText: {
    color: '#EF4444',
  },
  actionsMenuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  captureContainer: {
    backgroundColor: '#FFFFFF',
  },
  saleDetailCard: {
    marginBottom: 16,
  },
  saleDetailTitle: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 16,
  },
  saleDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  saleDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  saleDetailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  saleDetailValueLink: {
    color: '#059669',
    textDecorationLine: 'underline',
  },
  saleDetailTotal: {
    fontSize: 18,
    color: '#059669',
    fontWeight: '700',
  },
  saleDetailProfit: {
    color: '#059669',
    fontWeight: '600',
  },
  saleItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  saleItemInfo: {
    flex: 1,
  },
  saleItemName: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '500',
    marginBottom: 4,
  },
  saleItemDetails: {
    fontSize: 13,
    color: '#6B7280',
  },
  saleItemDiscount: {
    color: '#EF4444',
  },
  saleItemPricing: {
    alignItems: 'flex-end',
  },
  saleItemSubtotal: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
    marginBottom: 4,
  },
  saleItemProfit: {
    fontSize: 12,
    color: '#059669',
  },
  saleItemsTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    marginTop: 8,
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
  },
  saleItemsTotalLabel: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  saleItemsTotalValue: {
    fontSize: 18,
    color: '#059669',
    fontWeight: '700',
  },
  recordPaymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  recordPaymentModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  recordPaymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordPaymentModalTitle: {
    fontSize: 20,
    color: '#111827',
  },
  closeText: {
    fontSize: 16,
    color: '#6B7280',
  },
  recordPaymentModalDescription: {
    fontSize: 16,
    color: '#4B5563',
    marginBottom: 20,
  },
  paymentMethodOptionsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  paymentMethodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  paymentMethodOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodOptionIconText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  paymentMethodOptionText: {
    fontSize: 16,
    color: '#111827',
  },
  recordingPaymentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recordingPaymentText: {
    fontSize: 14,
    color: '#F59E0B',
  },
});
