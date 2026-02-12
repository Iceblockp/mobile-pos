import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { X, Printer, Share, ExternalLink } from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ShopSettingsService } from '@/services/shopSettingsService';
import {
  TemplateEngine,
  ReceiptData as TemplateReceiptData,
} from '@/services/templateEngine';
import { ShopSettings } from '@/services/shopSettingsStorage';
import { BluetoothPrinterService } from '@/services/bluetoothPrinterService';

interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
  };
  quantity: number;
  discount: number;
  subtotal: number;
}

interface ReceiptData {
  voucherId: string;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  note?: string;
  date: Date;
}

interface EnhancedPrintManagerProps {
  visible: boolean;
  onClose: () => void;
  receiptData: ReceiptData;
}

export const EnhancedPrintManager: React.FC<EnhancedPrintManagerProps> = ({
  visible,
  onClose,
  receiptData,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isBluetoothPrinting, setIsBluetoothPrinting] = useState(false);
  const [bluetoothAvailable, setBluetoothAvailable] = useState(false);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [templateEngine, setTemplateEngine] = useState<TemplateEngine | null>(
    null,
  );
  const [shopSettingsService, setShopSettingsService] =
    useState<ShopSettingsService | null>(null);

  // Load shop settings and check Bluetooth availability when component mounts
  useEffect(() => {
    const loadShopSettings = async () => {
      try {
        const service = new ShopSettingsService();
        await service.initialize();
        const settings = await service.getShopSettings();

        setShopSettingsService(service);
        setShopSettings(settings);
        setTemplateEngine(new TemplateEngine());
      } catch (error) {
        console.error('Failed to load shop settings:', error);
        // Continue with default template engine
        setTemplateEngine(new TemplateEngine());
      }
    };

    const checkBluetoothAvailability = async () => {
      try {
        // Add iOS-specific handling
        if (Platform.OS === 'ios') {
          // On iOS, we need to be more careful with Bluetooth checks
          const available =
            await BluetoothPrinterService.isBluetoothAvailable();
          setBluetoothAvailable(available);
        } else {
          const available =
            await BluetoothPrinterService.isBluetoothAvailable();
          setBluetoothAvailable(available);
        }
      } catch (error) {
        console.error('Error checking Bluetooth availability:', error);
        setBluetoothAvailable(false);
      }
    };

    if (visible) {
      loadShopSettings();
      // Only check Bluetooth if not on iOS or if we're sure it's safe
      if (Platform.OS !== 'ios') {
        checkBluetoothAvailability();
      } else {
        // On iOS, be more conservative
        setTimeout(() => {
          checkBluetoothAvailability();
        }, 100);
      }
    }
  }, [visible]);

  // Use currency-aware formatting instead of hardcoded MMK
  const formatCurrency = (amount: number) => {
    return formatPrice(amount);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generatePDFReceipt = async () => {
    if (!templateEngine) {
      throw new Error('Template engine not initialized');
    }

    try {
      // Convert receipt data to template format
      const templateReceiptData: TemplateReceiptData = {
        saleId: receiptData.voucherId,
        items: receiptData.items,
        total: receiptData.total,
        paymentMethod: receiptData.paymentMethod,
        note: receiptData.note,
        date: receiptData.date,
      };

      // Get selected template (default to classic if no shop settings)
      const templateId = shopSettings?.receiptTemplate || 'classic';

      // Build template context with translations
      const translations = {
        mobilePOS: t('printing.mobilePOS'),
        pointOfSaleSystem: t('printing.pointOfSaleSystem'),
        thankYou: t('printing.thankYou'),
        receiptNumber: t('printing.receiptNumber'),
        date: t('common.date'),
        paymentMethod: t('printing.paymentMethod'),
        itemsPurchased: t('printing.itemsPurchased'),
        discount: t('sales.discount'),
        total: t('common.total'),
        saleNote: t('sales.saleNote'),
        generatedBy: t('printing.generatedBy'),
      };

      const context = templateEngine.buildTemplateContext(
        shopSettings,
        templateReceiptData,
        translations,
      );

      // Render receipt using template engine
      const htmlContent = await templateEngine.renderReceipt(
        templateId,
        context,
      );
      return htmlContent;
    } catch (error) {
      console.error('Failed to generate receipt with template engine:', error);

      // Fallback to basic receipt if template engine fails
      return generateFallbackReceipt();
    }
  };

  // Responsive receipt generation - adapts to any paper size
  const generateFallbackReceipt = () => {
    const { voucherId, items, total, paymentMethod, note, date } = receiptData;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Receipt #${voucherId}</title>
          <style>
            @page {
              margin: 0.5in;
              size: A4;
            }
            * {
              box-sizing: border-box;
            }
            html {
              width: 100%;
              height: 100%;
            }
            body { 
              font-family: 'Courier New', monospace; 
              margin: 0; 
              padding: 20px; 
              font-size: 36px; 
              line-height: 1.5;
              background: white;
              color: #000;
              width: 100%;
              min-height: 100vh;
            }
            .receipt { 
              width: 100%;
              min-width: 100%;
              margin: 0;
              padding: 0;
              background: white;
              display: block;
            }
            
            /* Force content to expand using table layout */
            .full-width-table {
              width: 100%;
              table-layout: fixed;
              border-collapse: collapse;
              min-width: 100%;
            }
            .full-width-cell {
              width: 100%;
              padding: 0;
            }
            
            /* Force width with invisible spacer */
            .width-spacer {
              width: 100%;
              height: 1px;
              background: transparent;
              border: none;
              margin: 0;
              padding: 0;
              display: block;
            }
            
            /* Ensure all content uses full width */
            .header, .receipt-info, .items-section, .total-section, .footer {
              width: 100%;
              display: block;
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
              border-bottom: 2px solid #000; 
              padding-bottom: 15px; 
            }
            .store-name { 
              font-size: 48px; 
              font-weight: bold; 
              margin-bottom: 8px; 
              word-wrap: break-word;
            }
            .store-info {
              font-size: 36px;
              margin-bottom: 4px;
              word-wrap: break-word;
            }
            .receipt-info {
              font-size: 36px;
              margin-bottom: 15px;
            }
            .receipt-info div {
              margin-bottom: 4px;
            }
            .items-section {
              margin: 20px 0;
            }
            .item { 
              margin-bottom: 12px; 
              border-bottom: 1px dashed #ccc; 
              padding-bottom: 8px; 
            }
            .item-name { 
              font-weight: bold; 
              margin-bottom: 4px; 
              font-size: 40px;
              word-wrap: break-word;
            }
            .item-details { 
              display: flex; 
              justify-content: space-between; 
              font-size: 36px; 
              align-items: center;
            }
            .item-qty-price {
              flex: 1;
            }
            .item-total {
              text-align: right;
              font-weight: bold;
            }
            .discount-line {
              color: #dc3545;
              font-size: 32px;
              margin-top: 2px;
            }
            .total-section {
              border-top: 2px solid #000;
              padding-top: 15px;
              margin-top: 20px;
            }
            .total-line { 
              display: flex; 
              justify-content: space-between; 
              font-weight: bold; 
              font-size: 48px; 
              margin-bottom: 8px;
            }
            .note-section {
              margin: 15px 0;
              padding: 12px;
              background: #f5f5f5;
              border: 1px solid #ddd;
              border-radius: 4px;
              font-size: 36px;
            }
            .footer {
              text-align: center;
              margin-top: 25px;
              font-size: 32px;
              border-top: 1px dashed #000;
              padding-top: 15px;
            }
            .thank-you {
              font-weight: bold;
              margin-bottom: 8px;
              font-size: 40px;
            }
            
            /* Responsive design for different screen sizes */
            @media screen and (max-width: 480px) {
              body { padding: 15px; font-size: 13px; }
              .receipt { max-width: 100%; }
              .store-name { font-size: 20px; }
              .item-name { font-size: 14px; }
              .total-line { font-size: 18px; }
            }
            
            /* Thermal printer optimization (when printing to small paper) */
            @media print and (max-width: 3.5in) {
              @page { margin: 0.1in; }
              body { padding: 8px; font-size: 11px; }
              .receipt { max-width: 100%; }
              .store-name { font-size: 14px; }
              .store-info { font-size: 10px; }
              .receipt-info { font-size: 10px; }
              .item-name { font-size: 12px; }
              .item-details { font-size: 10px; }
              .total-line { font-size: 14px; }
              .footer { font-size: 9px; }
              .header { margin-bottom: 10px; padding-bottom: 8px; }
              .items-section { margin: 10px 0; }
              .item { margin-bottom: 6px; padding-bottom: 4px; }
              .total-section { padding-top: 8px; margin-top: 10px; }
              .note-section { margin: 8px 0; padding: 6px; font-size: 10px; }
              .footer { margin-top: 12px; padding-top: 8px; }
            }
            
            /* Standard printer optimization */
            @media print and (min-width: 3.5in) {
              body { padding: 15px; }
              .receipt { max-width: 350px; }
            }
          </style>
        </head>
        <body>
          <div class="width-spacer"></div>
          <table class="full-width-table">
            <tr>
              <td class="full-width-cell">
                <div class="receipt">
                  <div class="width-spacer"></div>
            <div class="header">
              <div class="store-name">${
                shopSettings?.shopName || t('printing.mobilePOS')
              }</div>
              ${
                shopSettings?.address
                  ? `<div class="store-info">${shopSettings.address}</div>`
                  : ''
              }
              ${
                shopSettings?.phone
                  ? `<div class="store-info">${shopSettings.phone}</div>`
                  : ''
              }
            </div>
            
            <div class="receipt-info">
              <div><strong>${t(
                'printing.receiptNumber',
              )}:</strong> ${voucherId}</div>
              <div><strong>${t('common.date')}:</strong> ${formatDate(
                date,
              )}</div>
              <div><strong>${t(
                'printing.paymentMethod',
              )}:</strong> ${paymentMethod.toUpperCase()}</div>
            </div>
            
            <div class="items-section">
              ${items
                .map(
                  (item) => `
                <div class="item">
                  <div class="item-name">${item.product.name}</div>
                  <div class="item-details">
                    <span class="item-qty-price">${
                      item.quantity
                    } x ${formatCurrency(item.product.price)}</span>
                    <span class="item-total">${formatCurrency(
                      item.subtotal,
                    )}</span>
                  </div>
                  ${
                    item.discount > 0
                      ? `
                    <div class="item-details discount-line">
                      <span>${t('sales.discount')}</span>
                      <span>-${formatCurrency(item.discount)}</span>
                    </div>
                  `
                      : ''
                  }
                </div>
              `,
                )
                .join('')}
            </div>
            
            <div class="total-section">
              <div class="total-line">
                <span>${t('common.total').toUpperCase()}</span>
                <span>${formatCurrency(total)}</span>
              </div>
            </div>
            
            ${
              note
                ? `<div class="note-section"><strong>${t(
                    'sales.saleNote',
                  )}:</strong> ${note}</div>`
                : ''
            }
            
            <div class="footer">
              <div class="thank-you">${
                shopSettings?.thankYouMessage || t('printing.thankYou')
              }</div>
              ${
                shopSettings?.receiptFooter
                  ? `<div>${shopSettings.receiptFooter}</div>`
                  : ''
              }
              <div style="margin-top: 6px; font-size: 9px;">${t(
                'printing.generatedBy',
              )}</div>
                </div>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  };

  const printReceipt = async () => {
    setIsPrinting(true);
    try {
      const htmlContent = await generatePDFReceipt();

      // Generate PDF with responsive layout
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        // width: 612, // 8.5 inches in points (8.5 * 72)
        // height: 792, // 11 inches in points (11 * 72) - standard letter size
        // margins: {
        //   left: 36, // 0.5 inch
        //   right: 36, // 0.5 inch
        //   top: 36, // 0.5 inch
        //   bottom: 36, // 0.5 inch
        // },
      });

      // Open print dialog
      await Print.printAsync({
        uri,
        printerUrl: undefined, // This will show printer selection dialog
      });

      onClose();
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert(t('printing.printError'), t('printing.printErrorMessage'));
    } finally {
      setIsPrinting(false);
    }
  };

  const shareReceipt = async () => {
    setIsSharing(true);
    try {
      const htmlContent = await generatePDFReceipt();

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
        // width: 612, // 8.5 inches in points (8.5 * 72)
        // height: 792, // 11 inches in points (11 * 72) - standard letter size
        // margins: {
        //   left: 36, // 0.5 inch
        //   right: 36, // 0.5 inch
        //   top: 36, // 0.5 inch
        //   bottom: 36, // 0.5 inch
        // },
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Receipt #${receiptData.voucherId}`,
        });
      } else {
        Alert.alert(
          'Sharing Not Available',
          'Sharing is not available on this device',
        );
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share Error', 'Failed to share receipt. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const openPrintingAppsInfo = () => {
    Alert.alert(
      t('printing.bluetoothPrintingApps'),
      t('printing.bluetoothAppsMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('printing.openAppStore'),
          onPress: () => {
            const url =
              Platform.OS === 'ios'
                ? 'https://apps.apple.com/search?term=bluetooth+printer'
                : 'https://play.google.com/store/search?q=bluetooth+printer&c=apps';
            Linking.openURL(url);
          },
        },
      ],
    );
  };

  const printDirectToBluetooth = async () => {
    setIsBluetoothPrinting(true);
    try {
      // Check if connected to a printer
      const isConnected = await BluetoothPrinterService.isConnected();
      if (!isConnected) {
        // Try to auto-connect to saved printer
        const autoConnected = await BluetoothPrinterService.autoConnect();
        if (!autoConnected) {
          Alert.alert(
            t('printing.printerNotConnected'),
            t('printing.connectThermalPrinter'),
            [
              { text: t('common.cancel'), style: 'cancel' },
              {
                text: t('printing.openSettings'),
                onPress: () => {
                  onClose();
                },
              },
            ],
          );
          return;
        }
      }

      // Convert receipt data for Bluetooth printing
      const bluetoothReceiptData = {
        saleId: receiptData.voucherId,
        items: receiptData.items,
        total: receiptData.total,
        paymentMethod: receiptData.paymentMethod,
        note: receiptData.note,
        date: receiptData.date,
      };

      // Print directly to Bluetooth printer
      await BluetoothPrinterService.printReceipt(
        bluetoothReceiptData,
        shopSettings,
      );

      Alert.alert(
        t('printing.printSuccessful'),
        t('printing.printSuccessfulMessage'),
        [{ text: t('common.confirm'), onPress: onClose }],
      );
    } catch (error) {
      console.error('Bluetooth print error:', error);

      // Fallback to PDF sharing
      Alert.alert(
        'Print Failed',
        'Direct printing failed. Would you like to share the receipt instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Share PDF',
            onPress: () => shareReceipt(),
          },
        ],
      );
    } finally {
      setIsBluetoothPrinting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title} weight="medium">
              {t('printing.title')}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Receipt Preview Section - Scrollable */}
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle} weight="medium">
              {t('printing.preview')}
            </Text>
            <View style={styles.previewContainer}>
              <View style={styles.receiptPreview}>
                {/* Receipt Header */}
                <View style={styles.receiptHeader}>
                  <Text style={styles.receiptShopName} weight="bold">
                    {shopSettings?.shopName || t('printing.mobilePOS')}
                  </Text>
                  {shopSettings?.address && (
                    <Text style={styles.receiptInfo}>
                      {shopSettings.address}
                    </Text>
                  )}
                  {shopSettings?.phone && (
                    <Text style={styles.receiptInfo}>{shopSettings.phone}</Text>
                  )}
                </View>

                {/* Receipt Details */}
                <View style={styles.receiptDetails}>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>
                      {t('printing.receiptNumber')}:
                    </Text>
                    <Text style={styles.receiptValue}>
                      {receiptData.voucherId}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>{t('common.date')}:</Text>
                    <Text style={styles.receiptValue}>
                      {formatDate(receiptData.date)}
                    </Text>
                  </View>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>
                      {t('printing.paymentMethod')}:
                    </Text>
                    <Text style={styles.receiptValue}>
                      {receiptData.paymentMethod.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Items List */}
                <View style={styles.receiptItems}>
                  {receiptData.items.map((item, index) => (
                    <View key={index} style={styles.receiptItem}>
                      <Text style={styles.itemName}>{item.product.name}</Text>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemQtyPrice}>
                          {item.quantity} x {formatCurrency(item.product.price)}
                        </Text>
                        <Text style={styles.itemTotal}>
                          {formatCurrency(item.subtotal)}
                        </Text>
                      </View>
                      {item.discount > 0 && (
                        <View style={styles.itemDetails}>
                          <Text style={styles.itemDiscount}>
                            {t('sales.discount')}
                          </Text>
                          <Text style={styles.itemDiscount}>
                            -{formatCurrency(item.discount)}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>

                {/* Total */}
                <View style={styles.receiptTotal}>
                  <Text style={styles.totalLabel} weight="bold">
                    {t('common.total').toUpperCase()}
                  </Text>
                  <Text style={styles.totalValue} weight="bold">
                    {formatCurrency(receiptData.total)}
                  </Text>
                </View>

                {/* Note */}
                {receiptData.note && (
                  <View style={styles.receiptNote}>
                    <Text style={styles.noteLabel} weight="medium">
                      {t('sales.saleNote')}:
                    </Text>
                    <Text style={styles.noteText}>{receiptData.note}</Text>
                  </View>
                )}

                {/* Footer */}
                <View style={styles.receiptFooter}>
                  <Text style={styles.thankYou}>
                    {shopSettings?.thankYouMessage || t('printing.thankYou')}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Compact Action Buttons at Bottom */}
          <View style={styles.actionsSection}>
            <View style={styles.actionButtons}>
              {/* Print Receipt Button */}
              <TouchableOpacity
                style={styles.compactButton}
                onPress={printReceipt}
                disabled={isPrinting || isSharing || isBluetoothPrinting}
              >
                <Printer size={18} color="#FFFFFF" />
                <Text style={styles.compactButtonText} weight="medium">
                  {t('printing.printReceipt')}
                </Text>
              </TouchableOpacity>

              {/* Share PDF Button */}
              <TouchableOpacity
                style={[styles.compactButton, styles.shareButton]}
                onPress={shareReceipt}
                disabled={isPrinting || isSharing || isBluetoothPrinting}
              >
                <Share size={18} color="#FFFFFF" />
                <Text style={styles.compactButtonText} weight="medium">
                  {t('printing.sharePDF')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Info Link */}
            <TouchableOpacity
              style={styles.infoLink}
              onPress={openPrintingAppsInfo}
            >
              <ExternalLink size={14} color="#6B7280" />
              <Text style={styles.infoLinkText}>
                {t('printing.getBluetoothApps')}
              </Text>
            </TouchableOpacity>

            {/* Loading Indicator */}
            {(isPrinting || isSharing || isBluetoothPrinting) && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.loadingText}>
                  {isPrinting
                    ? t('printing.preparingToPrint')
                    : isBluetoothPrinting
                      ? t('printing.printingToThermalPrinter')
                      : t('printing.preparingToShare')}
                </Text>
              </View>
            )}
          </View>
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
    padding: 16,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    minHeight: '80%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Preview Section - Scrollable
  previewSection: {
    flex: 1,
    padding: 16,
  },
  previewTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  receiptScrollView: {
    flex: 1,
  },
  receiptPreview: {
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  // Receipt Preview Styles
  receiptHeader: {
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 12,
  },
  receiptShopName: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  receiptInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  receiptDetails: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  receiptLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  receiptValue: {
    fontSize: 12,
    color: '#111827',
  },
  receiptItems: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  receiptItem: {
    marginBottom: 8,
  },
  itemName: {
    fontSize: 13,
    color: '#111827',
    marginBottom: 4,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemQtyPrice: {
    fontSize: 11,
    color: '#6B7280',
  },
  itemTotal: {
    fontSize: 11,
    color: '#111827',
  },
  itemDiscount: {
    fontSize: 11,
    color: '#EF4444',
  },
  receiptTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 2,
    borderTopColor: '#111827',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    color: '#111827',
  },
  totalValue: {
    fontSize: 14,
    color: '#111827',
  },
  receiptNote: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
  },
  noteLabel: {
    fontSize: 11,
    color: '#92400E',
    marginBottom: 4,
  },
  noteText: {
    fontSize: 11,
    color: '#78350F',
  },
  receiptFooter: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  thankYou: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Actions Section - Compact at Bottom
  actionsSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  compactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    minHeight: 44,
  },
  shareButton: {
    backgroundColor: '#2563EB',
  },
  compactButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
  },
  infoLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 6,
  },
  infoLinkText: {
    fontSize: 12,
    color: '#6B7280',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
