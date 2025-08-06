import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { X, Printer, FileText, Share } from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface CartItem {
  product: {
    id: number;
    name: string;
    price: number;
  };
  quantity: number;
  discount: number;
  subtotal: number;
}

interface ReceiptData {
  saleId: number;
  items: CartItem[];
  total: number;
  paymentMethod: string;
  note?: string;
  date: Date;
}

interface SimplePrintManagerProps {
  visible: boolean;
  onClose: () => void;
  receiptData: ReceiptData;
}

export const SimplePrintManager: React.FC<SimplePrintManagerProps> = ({
  visible,
  onClose,
  receiptData,
}) => {
  const { t } = useTranslation();
  const [isPrinting, setIsPrinting] = useState(false);

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
    const { saleId, items, total, paymentMethod, note, date } = receiptData;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Receipt #${saleId}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 20px;
              font-size: 14px;
              line-height: 1.4;
            }
            .receipt {
              max-width: 300px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .store-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .store-info {
              font-size: 12px;
              margin-bottom: 2px;
            }
            .receipt-info {
              margin-bottom: 15px;
            }
            .receipt-info div {
              margin-bottom: 3px;
            }
            .items {
              margin-bottom: 15px;
            }
            .item {
              margin-bottom: 8px;
              border-bottom: 1px dashed #ccc;
              padding-bottom: 5px;
            }
            .item-name {
              font-weight: bold;
              margin-bottom: 2px;
            }
            .item-details {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
            }
            .totals {
              border-top: 2px solid #000;
              padding-top: 10px;
              margin-bottom: 15px;
            }
            .total-line {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .total-line.final {
              font-weight: bold;
              font-size: 16px;
              border-top: 1px solid #000;
              padding-top: 5px;
            }
            .footer {
              text-align: center;
              font-size: 12px;
              margin-top: 20px;
              border-top: 1px solid #ccc;
              padding-top: 10px;
            }
            .note {
              margin: 10px 0;
              padding: 5px;
              background-color: #f5f5f5;
              border-left: 3px solid #007bff;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="store-name">Mobile POS</div>
              <div class="store-info">Point of Sale System</div>
              <div class="store-info">Thank you for your business!</div>
            </div>

            <div class="receipt-info">
              <div><strong>Receipt #:</strong> ${saleId}</div>
              <div><strong>Date:</strong> ${formatDate(date)}</div>
              <div><strong>Payment:</strong> ${paymentMethod.toUpperCase()}</div>
            </div>

            <div class="items">
              <div style="font-weight: bold; margin-bottom: 10px;">ITEMS PURCHASED</div>
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

            <div class="totals">
              <div class="total-line final">
                <span>TOTAL</span>
                <span>${formatMMK(total)}</span>
              </div>
            </div>

            ${
              note
                ? `
              <div class="note">
                <strong>Note:</strong> ${note}
              </div>
            `
                : ''
            }

            <div class="footer">
              <div>Generated by Mobile POS</div>
              <div>${formatDate(new Date())}</div>
            </div>
          </div>
        </body>
      </html>
    `;

    return htmlContent;
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
      Alert.alert('Print Error', 'Failed to print receipt. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  const shareReceipt = async () => {
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
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Print Receipt</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <Text style={styles.description}>
              Choose how you'd like to print or share your receipt:
            </Text>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={printReceipt}
                disabled={isPrinting}
              >
                <Printer size={24} color="#059669" />
                <Text style={styles.actionButtonText}>Print Receipt</Text>
                <Text style={styles.actionButtonSubtext}>
                  Print to any available printer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={shareReceipt}
                disabled={isPrinting}
              >
                <Share size={24} color="#2563EB" />
                <Text style={styles.actionButtonText}>Share PDF</Text>
                <Text style={styles.actionButtonSubtext}>
                  Share via email, messaging, etc.
                </Text>
              </TouchableOpacity>
            </View>

            {isPrinting && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#059669" />
                <Text style={styles.loadingText}>Processing...</Text>
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
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginTop: 8,
  },
  actionButtonSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
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
