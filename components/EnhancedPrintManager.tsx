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
  saleId: string;
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
    null
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
        saleId: receiptData.saleId,
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
        translations
      );

      // Render receipt using template engine
      const htmlContent = await templateEngine.renderReceipt(
        templateId,
        context
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
    const { saleId, items, total, paymentMethod, note, date } = receiptData;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Receipt #${saleId}</title>
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
                'printing.receiptNumber'
              )}:</strong> ${saleId}</div>
              <div><strong>${t('common.date')}:</strong> ${formatDate(
      date
    )}</div>
              <div><strong>${t(
                'printing.paymentMethod'
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
                      item.subtotal
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
              `
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
                    'sales.saleNote'
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
                'printing.generatedBy'
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
          dialogTitle: `Receipt #${receiptData.saleId}`,
        });
      } else {
        Alert.alert(
          'Sharing Not Available',
          'Sharing is not available on this device'
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
      ]
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
            ]
          );
          return;
        }
      }

      // Convert receipt data for Bluetooth printing
      const bluetoothReceiptData = {
        saleId: receiptData.saleId,
        items: receiptData.items,
        total: receiptData.total,
        paymentMethod: receiptData.paymentMethod,
        note: receiptData.note,
        date: receiptData.date,
      };

      // Print directly to Bluetooth printer
      await BluetoothPrinterService.printReceipt(
        bluetoothReceiptData,
        shopSettings
      );

      Alert.alert(
        t('printing.printSuccessful'),
        t('printing.printSuccessfulMessage'),
        [{ text: t('common.confirm'), onPress: onClose }]
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
        ]
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

          <View style={styles.content}>
            <Text style={styles.description}>{t('printing.chooseMethod')}</Text>

            <View style={styles.actions}>
              {/* Direct Bluetooth Print Option */}
              {bluetoothAvailable && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.directBluetoothButton]}
                  onPress={printDirectToBluetooth}
                  disabled={isPrinting || isSharing || isBluetoothPrinting}
                >
                  <Printer size={24} color="#059669" />
                  <Text
                    style={[
                      styles.actionButtonText,
                      styles.directBluetoothText,
                    ]}
                    weight="medium"
                  >
                    Print Direct
                  </Text>
                  <Text style={styles.actionButtonSubtext}>
                    {t('printing.printDirectlyToThermal')}
                  </Text>
                  {isBluetoothPrinting && (
                    <ActivityIndicator
                      size="small"
                      color="#059669"
                      style={{ marginTop: 4 }}
                    />
                  )}
                </TouchableOpacity>
              )}

              {/* System Print Option */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={printReceipt}
                disabled={isPrinting || isSharing || isBluetoothPrinting}
              >
                <Printer size={24} color="#059669" />
                <Text style={styles.actionButtonText} weight="medium">
                  {t('printing.printReceipt')}
                </Text>
                <Text style={styles.actionButtonSubtext}>
                  {t('printing.printReceiptDesc')}
                </Text>
              </TouchableOpacity>

              {/* Share for General Use */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={shareReceipt}
                disabled={isPrinting || isSharing || isBluetoothPrinting}
              >
                <Share size={24} color="#2563EB" />
                <Text style={styles.actionButtonText} weight="medium">
                  {t('printing.sharePDF')}
                </Text>
                <Text style={styles.actionButtonSubtext}>
                  {t('printing.sharePDFDesc')}
                </Text>
              </TouchableOpacity>

              {/* Info about Bluetooth Apps */}
              <TouchableOpacity
                style={styles.infoButton}
                onPress={openPrintingAppsInfo}
              >
                <ExternalLink size={16} color="#6B7280" />
                <Text style={styles.infoButtonText} weight="medium">
                  {t('printing.getBluetoothApps')}
                </Text>
              </TouchableOpacity>
            </View>

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
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
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
  content: {
    alignItems: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },

  directBluetoothButton: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#111827',
    marginTop: 8,
    textAlign: 'center',
  },

  directBluetoothText: {
    color: '#059669',
  },
  actionButtonSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginTop: 8,
  },
  infoButtonText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
