import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { X, Printer, Bluetooth, FileText, Wifi } from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Note: This component is kept for reference but SimplePrintManager is currently used
// Bluetooth printer library removed to avoid build issues
let BluetoothManager: any = null;
let BluetoothEscposPrinter: any = null;
let isBluetoothLibraryAvailable = false;

// Bluetooth library disabled to prevent build issues
// try {
//   if (Platform.OS !== 'web') {
//     const BluetoothPrinter = require('react-native-bluetooth-escpos-printer');
//     BluetoothManager = BluetoothPrinter.BluetoothManager;
//     BluetoothEscposPrinter = BluetoothPrinter.BluetoothEscposPrinter;
//
//     if (BluetoothManager && BluetoothEscposPrinter) {
//       isBluetoothLibraryAvailable = true;
//       console.log('Bluetooth printer library loaded successfully');
//     }
//   }
// } catch (error) {
//   console.log('Bluetooth printer library not available:', error);
//   isBluetoothLibraryAvailable = false;
// }

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

interface PrintManagerProps {
  visible: boolean;
  onClose: () => void;
  receiptData: ReceiptData;
}

interface BluetoothDevice {
  address: string;
  name: string;
}

type PrintMethod = 'pdf' | 'bluetooth' | 'network';

export const PrintManager: React.FC<PrintManagerProps> = ({
  visible,
  onClose,
  receiptData,
}) => {
  const { t } = useTranslation();
  const [selectedMethod, setSelectedMethod] = useState<PrintMethod>('pdf');
  const [bluetoothDevices, setBluetoothDevices] = useState<BluetoothDevice[]>(
    []
  );
  const [selectedDevice, setSelectedDevice] = useState<BluetoothDevice | null>(
    null
  );
  const [isScanning, setIsScanning] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);

  useEffect(() => {
    if (visible && isBluetoothLibraryAvailable && BluetoothManager) {
      checkBluetoothStatus();
    }
  }, [visible]);

  const checkBluetoothStatus = async () => {
    if (!isBluetoothLibraryAvailable || !BluetoothManager) {
      console.log('Bluetooth library not available, skipping Bluetooth check');
      return;
    }

    try {
      const enabled = await BluetoothManager.isBluetoothEnabled();
      setBluetoothEnabled(enabled);

      if (enabled) {
        // Get paired devices
        const pairedDevices = await BluetoothManager.pairedDevices();
        const printerDevices = pairedDevices.filter(
          (device: any) =>
            device.name &&
            (device.name.toLowerCase().includes('printer') ||
              device.name.toLowerCase().includes('pos') ||
              device.name.toLowerCase().includes('receipt'))
        );
        setBluetoothDevices(printerDevices);
      }
    } catch (error) {
      console.error('Bluetooth check error:', error);
      setBluetoothEnabled(false);
    }
  };

  const scanForDevices = async () => {
    if (
      !isBluetoothLibraryAvailable ||
      !BluetoothManager ||
      !bluetoothEnabled
    ) {
      Alert.alert(
        'Bluetooth Not Available',
        isBluetoothLibraryAvailable
          ? 'Please enable Bluetooth to scan for printers'
          : 'Bluetooth printer library is not properly configured. Please use PDF printing instead.'
      );
      return;
    }

    setIsScanning(true);
    try {
      await BluetoothManager.scanDevices();
      // Listen for discovered devices
      const subscription = BluetoothManager.addListener(
        'BluetoothDeviceFound',
        (device: BluetoothDevice) => {
          if (device.name && device.name.toLowerCase().includes('printer')) {
            setBluetoothDevices((prev) => {
              const exists = prev.find((d) => d.address === device.address);
              return exists ? prev : [...prev, device];
            });
          }
        }
      );

      // Stop scanning after 10 seconds
      setTimeout(() => {
        BluetoothManager.stopScan();
        subscription?.remove();
        setIsScanning(false);
      }, 10000);
    } catch (error) {
      console.error('Scan error:', error);
      setIsScanning(false);
      Alert.alert('Scan Error', 'Failed to scan for devices');
    }
  };

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
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Receipt #${saleId}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            padding: 20px;
            max-width: 300px;
            margin: 0 auto;
          }
          .receipt-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 15px;
          }
          .store-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .store-info {
            font-size: 10px;
            color: #666;
            margin-bottom: 2px;
          }
          .receipt-info {
            margin-bottom: 15px;
            font-size: 11px;
          }
          .receipt-info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
          }
          .items-header {
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 8px 0;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .item-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 11px;
          }
          .item-name { flex: 1; margin-right: 10px; }
          .item-qty-price { text-align: right; min-width: 80px; }
          .item-subtotal { text-align: right; min-width: 60px; font-weight: bold; }
          .item-discount { color: #e74c3c; font-size: 10px; margin-left: 10px; }
          .totals-section {
            border-top: 1px dashed #000;
            padding-top: 10px;
            margin-top: 15px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
          }
          .final-total {
            border-top: 1px solid #000;
            padding-top: 8px;
            margin-top: 8px;
            font-weight: bold;
            font-size: 14px;
          }
          .payment-info {
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px dashed #000;
            text-align: center;
          }
          .note-section {
            margin-top: 15px;
            padding: 10px;
            background: #f8f9fa;
            border-radius: 4px;
            font-size: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            padding-top: 15px;
            border-top: 2px solid #000;
            font-size: 10px;
            color: #666;
          }
          .thank-you { font-weight: bold; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          <div class="store-name">Mobile POS</div>
          <div class="store-info">Point of Sale System</div>
          <div class="store-info">Thank you for your business!</div>
        </div>
        
        <div class="receipt-info">
          <div class="receipt-info-row">
            <span>Receipt #:</span>
            <span>${saleId}</span>
          </div>
          <div class="receipt-info-row">
            <span>Date:</span>
            <span>${formatDate(date)}</span>
          </div>
          <div class="receipt-info-row">
            <span>Payment:</span>
            <span>${paymentMethod.toUpperCase()}</span>
          </div>
        </div>
        
        <div class="items-header">ITEMS PURCHASED</div>
        
        ${items
          .map(
            (item) => `
          <div class="item-row">
            <div class="item-name">${item.product.name}</div>
            <div class="item-qty-price">${item.quantity} x ${formatMMK(
              item.product.price
            )}</div>
            <div class="item-subtotal">${formatMMK(item.subtotal)}</div>
          </div>
          ${
            item.discount > 0
              ? `<div class="item-discount">Discount: -${formatMMK(
                  item.discount
                )}</div>`
              : ''
          }
        `
          )
          .join('')}
        
        <div class="totals-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${formatMMK(
              items.reduce(
                (sum, item) => sum + item.quantity * item.product.price,
                0
              )
            )}</span>
          </div>
          ${
            items.some((item) => item.discount > 0)
              ? `
            <div class="total-row">
              <span>Total Discount:</span>
              <span>-${formatMMK(
                items.reduce((sum, item) => sum + item.discount, 0)
              )}</span>
            </div>
          `
              : ''
          }
          <div class="total-row final-total">
            <span>TOTAL:</span>
            <span>${formatMMK(total)}</span>
          </div>
        </div>
        
        <div class="payment-info">
          <strong>PAID BY ${paymentMethod.toUpperCase()}</strong>
        </div>
        
        ${
          note
            ? `
          <div class="note-section">
            <strong>Note:</strong><br>
            ${note}
          </div>
        `
            : ''
        }
        
        <div class="footer">
          <div class="thank-you">Thank you for your purchase!</div>
          <div>Generated by Mobile POS</div>
          <div>${formatDate(new Date())}</div>
        </div>
      </body>
      </html>
    `;

    return htmlContent;
  };

  const printWithPDF = async () => {
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
      console.error('PDF print error:', error);
      Alert.alert(
        'Print Error',
        'Failed to generate PDF receipt. Please try again.'
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const printWithBluetooth = async () => {
    if (!isBluetoothLibraryAvailable || !BluetoothEscposPrinter) {
      Alert.alert(
        'Bluetooth Not Available',
        'Bluetooth printer library is not properly configured. Please use PDF printing instead.'
      );
      return;
    }

    if (!selectedDevice) {
      Alert.alert(
        'No Printer Selected',
        'Please select a Bluetooth printer first'
      );
      return;
    }

    setIsPrinting(true);
    try {
      // Connect to the selected device
      await BluetoothManager.connect(selectedDevice.address);

      // Generate ESC/POS commands for thermal printer
      const { saleId, items, total, paymentMethod, note, date } = receiptData;

      // Initialize printer
      await BluetoothEscposPrinter.printerInit();

      // Print header
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.CENTER
      );
      await BluetoothEscposPrinter.printText('Mobile POS\n', {
        encoding: 'GBK',
        codepage: 0,
        widthtimes: 1,
        heigthtimes: 1,
        fonttype: 1,
      });
      await BluetoothEscposPrinter.printText('Point of Sale System\n', {});
      await BluetoothEscposPrinter.printText(
        'Thank you for your business!\n',
        {}
      );
      await BluetoothEscposPrinter.printText(
        '--------------------------------\n',
        {}
      );

      // Print receipt info
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.LEFT
      );
      await BluetoothEscposPrinter.printText(`Receipt #: ${saleId}\n`, {});
      await BluetoothEscposPrinter.printText(`Date: ${formatDate(date)}\n`, {});
      await BluetoothEscposPrinter.printText(
        `Payment: ${paymentMethod.toUpperCase()}\n`,
        {}
      );
      await BluetoothEscposPrinter.printText(
        '--------------------------------\n',
        {}
      );

      // Print items
      await BluetoothEscposPrinter.printText('ITEMS PURCHASED\n', {});
      await BluetoothEscposPrinter.printText(
        '--------------------------------\n',
        {}
      );

      for (const item of items) {
        await BluetoothEscposPrinter.printText(`${item.product.name}\n`, {});
        await BluetoothEscposPrinter.printText(
          `${item.quantity} x ${formatMMK(item.product.price)} = ${formatMMK(
            item.subtotal
          )}\n`,
          {}
        );
        if (item.discount > 0) {
          await BluetoothEscposPrinter.printText(
            `Discount: -${formatMMK(item.discount)}\n`,
            {}
          );
        }
        await BluetoothEscposPrinter.printText('\n', {});
      }

      // Print totals
      await BluetoothEscposPrinter.printText(
        '--------------------------------\n',
        {}
      );
      const subtotal = items.reduce(
        (sum, item) => sum + item.quantity * item.product.price,
        0
      );
      await BluetoothEscposPrinter.printText(
        `Subtotal: ${formatMMK(subtotal)}\n`,
        {}
      );

      const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
      if (totalDiscount > 0) {
        await BluetoothEscposPrinter.printText(
          `Total Discount: -${formatMMK(totalDiscount)}\n`,
          {}
        );
      }

      await BluetoothEscposPrinter.printText(
        '--------------------------------\n',
        {}
      );
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.CENTER
      );
      await BluetoothEscposPrinter.printText(`TOTAL: ${formatMMK(total)}\n`, {
        widthtimes: 1,
        heigthtimes: 1,
        fonttype: 1,
      });

      // Print payment info
      await BluetoothEscposPrinter.printText(
        '--------------------------------\n',
        {}
      );
      await BluetoothEscposPrinter.printText(
        `PAID BY ${paymentMethod.toUpperCase()}\n`,
        {}
      );

      // Print note if exists
      if (note) {
        await BluetoothEscposPrinter.printText(
          '--------------------------------\n',
          {}
        );
        await BluetoothEscposPrinter.printerAlign(
          BluetoothEscposPrinter.ALIGN.LEFT
        );
        await BluetoothEscposPrinter.printText(`Note: ${note}\n`, {});
      }

      // Print footer
      await BluetoothEscposPrinter.printText(
        '--------------------------------\n',
        {}
      );
      await BluetoothEscposPrinter.printerAlign(
        BluetoothEscposPrinter.ALIGN.CENTER
      );
      await BluetoothEscposPrinter.printText(
        'Thank you for your purchase!\n',
        {}
      );
      await BluetoothEscposPrinter.printText('Generated by Mobile POS\n', {});
      await BluetoothEscposPrinter.printText(`${formatDate(new Date())}\n`, {});

      // Cut paper (if supported)
      await BluetoothEscposPrinter.printText('\n\n\n', {});

      Alert.alert('Success', 'Receipt printed successfully!');
      onClose();
    } catch (error) {
      console.error('Bluetooth print error:', error);
      Alert.alert(
        'Print Error',
        'Failed to print via Bluetooth. Please check your printer connection.'
      );
    } finally {
      setIsPrinting(false);
    }
  };

  const shareReceipt = async () => {
    setIsPrinting(true);
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
          'Sharing not available',
          'Sharing is not available on this device'
        );
      }

      onClose();
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Share Error', 'Failed to share receipt. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrint = () => {
    switch (selectedMethod) {
      case 'pdf':
        printWithPDF();
        break;
      case 'bluetooth':
        printWithBluetooth();
        break;
      default:
        printWithPDF();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Print Receipt</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Print Method Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Print Method</Text>

            <TouchableOpacity
              style={[
                styles.methodOption,
                selectedMethod === 'pdf' && styles.methodOptionSelected,
              ]}
              onPress={() => setSelectedMethod('pdf')}
            >
              <FileText
                size={20}
                color={selectedMethod === 'pdf' ? '#059669' : '#6B7280'}
              />
              <View style={styles.methodContent}>
                <Text
                  style={[
                    styles.methodTitle,
                    selectedMethod === 'pdf' && styles.methodTitleSelected,
                  ]}
                >
                  PDF Print
                </Text>
                <Text style={styles.methodDescription}>
                  Generate PDF and use system print dialog
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodOption,
                selectedMethod === 'bluetooth' && styles.methodOptionSelected,
                !isBluetoothLibraryAvailable && styles.methodOptionDisabled,
              ]}
              onPress={() => {
                if (isBluetoothLibraryAvailable) {
                  setSelectedMethod('bluetooth');
                } else {
                  Alert.alert(
                    'Bluetooth Not Available',
                    'Bluetooth printer library is not properly configured. Please use PDF printing instead.'
                  );
                }
              }}
              disabled={!isBluetoothLibraryAvailable}
            >
              <Bluetooth
                size={20}
                color={
                  selectedMethod === 'bluetooth'
                    ? '#059669'
                    : !isBluetoothLibraryAvailable
                    ? '#D1D5DB'
                    : '#6B7280'
                }
              />
              <View style={styles.methodContent}>
                <Text
                  style={[
                    styles.methodTitle,
                    selectedMethod === 'bluetooth' &&
                      styles.methodTitleSelected,
                    !isBluetoothLibraryAvailable && styles.methodTitleDisabled,
                  ]}
                >
                  Bluetooth Printer
                  {!isBluetoothLibraryAvailable && ' (Not Available)'}
                </Text>
                <Text
                  style={[
                    styles.methodDescription,
                    !isBluetoothLibraryAvailable &&
                      styles.methodDescriptionDisabled,
                  ]}
                >
                  {isBluetoothLibraryAvailable
                    ? 'Direct print to Bluetooth thermal printer'
                    : 'Library not properly configured'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Bluetooth Device Selection */}
          {selectedMethod === 'bluetooth' &&
            isBluetoothLibraryAvailable &&
            BluetoothManager && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Select Printer</Text>
                  <TouchableOpacity
                    style={styles.scanButton}
                    onPress={scanForDevices}
                    disabled={isScanning}
                  >
                    {isScanning ? (
                      <ActivityIndicator size="small" color="#059669" />
                    ) : (
                      <Text style={styles.scanButtonText}>Scan</Text>
                    )}
                  </TouchableOpacity>
                </View>

                {!bluetoothEnabled && (
                  <Text style={styles.warningText}>
                    Bluetooth is not enabled. Please enable Bluetooth to scan
                    for printers.
                  </Text>
                )}

                <FlatList
                  data={bluetoothDevices}
                  keyExtractor={(item) => item.address}
                  style={styles.deviceList}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.deviceItem,
                        selectedDevice?.address === item.address &&
                          styles.deviceItemSelected,
                      ]}
                      onPress={() => setSelectedDevice(item)}
                    >
                      <Printer size={16} color="#6B7280" />
                      <View style={styles.deviceInfo}>
                        <Text style={styles.deviceName}>
                          {item.name || 'Unknown Device'}
                        </Text>
                        <Text style={styles.deviceAddress}>{item.address}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>
                      {isScanning
                        ? 'Scanning for printers...'
                        : 'No printers found. Tap "Scan" to search.'}
                    </Text>
                  }
                />
              </View>
            )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={shareReceipt}
              disabled={isPrinting}
            >
              <Text style={styles.shareButtonText}>Share PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.printButton,
                isPrinting && styles.printButtonDisabled,
                selectedMethod === 'bluetooth' &&
                  (!selectedDevice || !isBluetoothLibraryAvailable) &&
                  styles.printButtonDisabled,
              ]}
              onPress={handlePrint}
              disabled={
                isPrinting ||
                (selectedMethod === 'bluetooth' &&
                  (!selectedDevice || !isBluetoothLibraryAvailable))
              }
            >
              {isPrinting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.printButtonText}>Printing...</Text>
                </View>
              ) : (
                <Text style={styles.printButtonText}>Print Receipt</Text>
              )}
            </TouchableOpacity>
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
    maxWidth: 500,
    maxHeight: '90%',
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
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  methodOptionSelected: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  methodContent: {
    flex: 1,
    marginLeft: 12,
  },
  methodTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 2,
  },
  methodTitleSelected: {
    color: '#059669',
  },
  methodDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  scanButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#059669',
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  scanButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  deviceList: {
    maxHeight: 200,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  deviceItemSelected: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  deviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  deviceName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  deviceAddress: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    padding: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  shareButton: {
    flex: 0.45,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  shareButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  printButton: {
    flex: 0.45,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  printButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  printButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#F3F4F6',
  },
  methodTitleDisabled: {
    color: '#9CA3AF',
  },
  methodDescriptionDisabled: {
    color: '#D1D5DB',
  },
});
