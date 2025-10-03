import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import {
  X,
  Printer,
  Share,
  ExternalLink,
  Smartphone,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ShopSettingsService } from '@/services/shopSettingsService';
import {
  TemplateEngine,
  ReceiptData as TemplateReceiptData,
} from '@/services/templateEngine';
import { ShopSettings } from '@/services/shopSettingsStorage';

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
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
  const [templateEngine, setTemplateEngine] = useState<TemplateEngine | null>(
    null
  );
  const [shopSettingsService, setShopSettingsService] =
    useState<ShopSettingsService | null>(null);

  // Load shop settings when component mounts
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

    if (visible) {
      loadShopSettings();
    }
  }, [visible]);

  const formatMMK = (amount: number) => {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) + ' MMK'
    );
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

  // Fallback receipt generation (original method)
  const generateFallbackReceipt = () => {
    const { saleId, items, total, paymentMethod, note, date } = receiptData;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt #${saleId}</title>
          <style>
            body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; font-size: 14px; }
            .receipt { max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .store-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
            .item { margin-bottom: 8px; border-bottom: 1px dashed #ccc; padding-bottom: 5px; }
            .item-name { font-weight: bold; margin-bottom: 2px; }
            .item-details { display: flex; justify-content: space-between; font-size: 12px; }
            .total-line { display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="store-name">${
                shopSettings?.shopName || t('printing.mobilePOS')
              }</div>
              ${
                shopSettings?.address
                  ? `<div>${shopSettings.address}</div>`
                  : ''
              }
              ${shopSettings?.phone ? `<div>${shopSettings.phone}</div>` : ''}
            </div>
            <div><strong>Receipt #:</strong> ${saleId}</div>
            <div><strong>Date:</strong> ${formatDate(date)}</div>
            <div><strong>Payment:</strong> ${paymentMethod.toUpperCase()}</div>
            <div style="margin: 15px 0;">
              ${items
                .map(
                  (item) => `
                <div class="item">
                  <div class="item-name">${item.product.name}</div>
                  <div class="item-details">
                    <span>${item.quantity} x ${formatMMK(
                    item.product.price
                  )}</span>
                    <span>${formatMMK(item.subtotal)}</span>
                  </div>
                  ${
                    item.discount > 0
                      ? `
                    <div class="item-details" style="color: #dc3545;">
                      <span>Discount</span>
                      <span>-${formatMMK(item.discount)}</span>
                    </div>
                  `
                      : ''
                  }
                </div>
              `
                )
                .join('')}
            </div>
            <div class="total-line">
              <span>TOTAL</span>
              <span>${formatMMK(total)}</span>
            </div>
            ${
              note
                ? `<div style="margin: 10px 0; padding: 8px; background: #f5f5f5;"><strong>Note:</strong> ${note}</div>`
                : ''
            }
            <div style="text-align: center; margin-top: 20px; font-size: 12px;">
              ${shopSettings?.thankYouMessage || t('printing.thankYou')}
              <br>
              ${shopSettings?.receiptFooter || ''}
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const printReceipt = async () => {
    setIsPrinting(true);
    try {
      const htmlContent = await generatePDFReceipt();

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
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

  const shareForBluetoothPrinting = async () => {
    setIsSharing(true);
    try {
      const htmlContent = await generatePDFReceipt();

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Receipt #${receiptData.saleId} - For Bluetooth Printing`,
        });

        // Show helpful message
        Alert.alert(
          t('printing.bluetoothPrintingTip'),
          t('printing.bluetoothPrintingTipMessage'),
          [{ text: t('printing.gotIt'), style: 'default' }]
        );
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

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('printing.title')}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.description}>{t('printing.chooseMethod')}</Text>

            <View style={styles.actions}>
              {/* Direct Print Option */}
              <TouchableOpacity
                style={styles.actionButton}
                onPress={printReceipt}
                disabled={isPrinting || isSharing}
              >
                <Printer size={24} color="#059669" />
                <Text style={styles.actionButtonText}>
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
                disabled={isPrinting || isSharing}
              >
                <Share size={24} color="#2563EB" />
                <Text style={styles.actionButtonText}>
                  {t('printing.sharePDF')}
                </Text>
                <Text style={styles.actionButtonSubtext}>
                  {t('printing.sharePDFDesc')}
                </Text>
              </TouchableOpacity>

              {/* Share for Bluetooth Printing */}
              <TouchableOpacity
                style={[styles.actionButton, styles.bluetoothActionButton]}
                onPress={shareForBluetoothPrinting}
                disabled={isPrinting || isSharing}
              >
                <Smartphone size={24} color="#7C3AED" />
                <Text
                  style={[styles.actionButtonText, styles.bluetoothActionText]}
                >
                  {t('printing.shareForBluetooth')}
                </Text>
                <Text style={styles.actionButtonSubtext}>
                  {t('printing.shareForBluetoothDesc')}
                </Text>
              </TouchableOpacity>

              {/* Info about Bluetooth Apps */}
              <TouchableOpacity
                style={styles.infoButton}
                onPress={openPrintingAppsInfo}
              >
                <ExternalLink size={16} color="#6B7280" />
                <Text style={styles.infoButtonText}>
                  {t('printing.getBluetoothApps')}
                </Text>
              </TouchableOpacity>
            </View>

            {(isPrinting || isSharing) && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.loadingText}>
                  {isPrinting
                    ? t('printing.preparingToPrint')
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
    fontFamily: 'Inter-SemiBold',
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
    lineHeight: 24,
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
  bluetoothActionButton: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3F4F6',
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginTop: 8,
    textAlign: 'center',
  },
  bluetoothActionText: {
    color: '#7C3AED',
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
    fontFamily: 'Inter-Medium',
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
