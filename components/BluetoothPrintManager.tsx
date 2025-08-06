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
import {
  X,
  Printer,
  Bluetooth,
  FileText,
  Wifi,
  Search,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Import the more reliable Bluetooth thermal printer library
let ThermalPrinterModule: any = null;
let isThermalPrinterAvailable = false;

try {
  if (Platform.OS !== 'web') {
    ThermalPrinterModule = require('react-native-thermal-receipt-printer-image-qr');
    // Test if the module loaded properly
    if (
      ThermalPrinterModule &&
      typeof ThermalPrinterModule.getBoundedDevices === 'function'
    ) {
      isThermalPrinterAvailable = true;
      console.log('Thermal printer library loaded successfully');
    }
  }
} catch (error) {
  console.log('Thermal printer library not available:', error);
  isThermalPrinterAvailable = false;
}

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

interface BluetoothDevice {
  address: string;
  name: string;
}

interface BluetoothPrintManagerProps {
  visible: boolean;
  onClose: () => void;
  receiptData: ReceiptData;
}

type PrintMethod = 'pdf' | 'bluetooth';

export const BluetoothPrintManager: React.FC<BluetoothPrintManagerProps> = ({
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
  const [isConnected, setIsConnected] = useState(false);

  const isBluetoothAvailable = isThermalPrinterAvailable;

  useEffect(() => {
    if (visible && isBluetoothAvailable) {
      loadPairedDevices();
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

  const loadPairedDevices = async () => {
    if (!ThermalPrinterModule) return;

    try {
      const devices = await ThermalPrinterModule.getBoundedDevices();
      const printerDevices = devices.filter(
        (device: any) =>
          device.name &&
          (device.name.toLowerCase().includes('printer') ||
            device.name.toLowerCase().includes('pos') ||
            device.name.toLowerCase().includes('receipt') ||
            device.name.toLowerCase().includes('thermal'))
      );
      setBluetoothDevices(printerDevices);
    } catch (error) {
      console.error('Error loading paired devices:', error);
    }
  };

  const scanForDevices = async () => {
    if (!ThermalPrinterModule) {
      Alert.alert(
        'Bluetooth Not Available',
        'Bluetooth thermal printer library is not available'
      );
      return;
    }

    setIsScanning(true);
    try {
      // First get paired devices
      await loadPairedDevices();

      // Note: This library primarily works with already paired devices
      // Scanning for new devices requires additional permissions and setup
      Alert.alert(
        'Device Scan',
        'Please pair your thermal printer in device Bluetooth settings first, then refresh this list.'
      );
    } catch (error) {
      console.error('Scan error:', error);
      Alert.alert(
        'Scan Error',
        'Failed to scan for devices. Please check Bluetooth is enabled.'
      );
    } finally {
      setIsScanning(false);
    }
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    if (!ThermalPrinterModule) return;

    try {
      setSelectedDevice(device);
      await ThermalPrinterModule.connectPrinter(device.address);
      setIsConnected(true);
      Alert.alert('Connected', `Connected to ${device.name}`);
    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert('Connection Failed', `Failed to connect to ${device.name}`);
      setIsConnected(false);
    }
  };

  const printWithBluetooth = async () => {
    if (!ThermalPrinterModule || !selectedDevice) {
      Alert.alert(
        'No Printer Selected',
        'Please select and connect to a Bluetooth printer first'
      );
      return;
    }

    setIsPrinting(true);
    try {
      const { saleId, items, total, paymentMethod, note, date } = receiptData;

      // Build receipt content
      const receiptLines = [
        // Header
        { text: 'Mobile POS', alignment: 'center', fontsize: 24, fonttype: 1 },
        { text: 'Point of Sale System', alignment: 'center', fontsize: 18 },
        {
          text: 'Thank you for your business!',
          alignment: 'center',
          fontsize: 18,
        },
        { text: '--------------------------------', alignment: 'center' },
        { text: '' }, // Empty line

        // Receipt info
        { text: `Receipt #: ${saleId}`, alignment: 'left' },
        { text: `Date: ${formatDate(date)}`, alignment: 'left' },
        { text: `Payment: ${paymentMethod.toUpperCase()}`, alignment: 'left' },
        { text: '' }, // Empty line

        // Items header
        { text: 'ITEMS PURCHASED', alignment: 'center', fonttype: 1 },
        { text: '--------------------------------', alignment: 'center' },
      ];

      // Add items
      items.forEach((item) => {
        receiptLines.push(
          { text: item.product.name, alignment: 'left', fonttype: 1 },
          {
            text: `${item.quantity} x ${formatMMK(
              item.product.price
            )} = ${formatMMK(item.subtotal)}`,
            alignment: 'left',
          }
        );

        if (item.discount > 0) {
          receiptLines.push({
            text: `Discount: -${formatMMK(item.discount)}`,
            alignment: 'left',
          });
        }

        receiptLines.push({ text: '' }); // Empty line after each item
      });

      // Total section
      receiptLines.push(
        { text: '--------------------------------', alignment: 'center' },
        {
          text: `TOTAL: ${formatMMK(total)}`,
          alignment: 'center',
          fontsize: 24,
          fonttype: 1,
        },
        { text: '--------------------------------', alignment: 'center' },
        { text: '' } // Empty line
      );

      // Note if exists
      if (note) {
        receiptLines.push(
          { text: `Note: ${note}`, alignment: 'left' },
          { text: '' } // Empty line
        );
      }

      // Footer
      receiptLines.push(
        { text: '--------------------------------', alignment: 'center' },
        { text: 'Generated by Mobile POS', alignment: 'center' },
        { text: formatDate(new Date()), alignment: 'center' },
        { text: '' }, // Empty line
        { text: '' }, // Empty line
        { text: '' } // Empty line for paper cut
      );

      // Print each line
      for (const line of receiptLines) {
        await ThermalPrinterModule.printText({
          text: line.text || '',
          align: line.alignment || 'left',
          fontsize: line.fontsize || 18,
          fonttype: line.fonttype || 0,
        });
      }

      // Cut paper if supported
      try {
        await ThermalPrinterModule.printBill();
      } catch (cutError) {
        console.log('Paper cut not supported:', cutError);
      }

      Alert.alert('Success', 'Receipt printed successfully!');
      onClose();
    } catch (error) {
      console.error('Print error:', error);
      Alert.alert(
        'Print Error',
        'Failed to print receipt. Please check printer connection.'
      );
    } finally {
      setIsPrinting(false);
    }
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

  const printWithPDF = async () => {
    setIsPrinting(true);
    try {
      const htmlContent = await generatePDFReceipt();

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      await Print.printAsync({
        uri,
        printerUrl: undefined,
      });

      onClose();
    } catch (error) {
      console.error('PDF print error:', error);
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

  const handlePrint = () => {
    switch (selectedMethod) {
      case 'pdf':
        printWithPDF();
        break;
      case 'bluetooth':
        printWithBluetooth();
        break;
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
                    Print to any available printer
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.methodOption,
                  selectedMethod === 'bluetooth' && styles.methodOptionSelected,
                  !isBluetoothAvailable && styles.methodOptionDisabled,
                ]}
                onPress={() => {
                  if (isBluetoothAvailable) {
                    setSelectedMethod('bluetooth');
                  } else {
                    Alert.alert(
                      'Bluetooth Not Available',
                      'Bluetooth thermal printer library is not available'
                    );
                  }
                }}
                disabled={!isBluetoothAvailable}
              >
                <Bluetooth
                  size={20}
                  color={
                    selectedMethod === 'bluetooth'
                      ? '#059669'
                      : !isBluetoothAvailable
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
                      !isBluetoothAvailable && styles.methodTitleDisabled,
                    ]}
                  >
                    Bluetooth Thermal Printer
                    {!isBluetoothAvailable && ' (Not Available)'}
                  </Text>
                  <Text
                    style={[
                      styles.methodDescription,
                      !isBluetoothAvailable && styles.methodDescriptionDisabled,
                    ]}
                  >
                    {isBluetoothAvailable
                      ? 'Direct print to thermal receipt printer'
                      : 'Library not available'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Bluetooth Device Selection */}
            {selectedMethod === 'bluetooth' && isBluetoothAvailable && (
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
                      <Search size={16} color="#059669" />
                    )}
                    <Text style={styles.scanButtonText}>
                      {isScanning ? 'Scanning...' : 'Refresh'}
                    </Text>
                  </TouchableOpacity>
                </View>

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
                      onPress={() => connectToDevice(item)}
                    >
                      <Bluetooth size={16} color="#6B7280" />
                      <View style={styles.deviceInfo}>
                        <Text style={styles.deviceName}>{item.name}</Text>
                        <Text style={styles.deviceAddress}>{item.address}</Text>
                      </View>
                      {selectedDevice?.address === item.address &&
                        isConnected && (
                          <View style={styles.connectedIndicator}>
                            <Text style={styles.connectedText}>Connected</Text>
                          </View>
                        )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.emptyDeviceList}>
                      <Bluetooth size={32} color="#D1D5DB" />
                      <Text style={styles.emptyDeviceText}>
                        No paired printers found
                      </Text>
                      <Text style={styles.emptyDeviceSubtext}>
                        Pair your thermal printer in Bluetooth settings first
                      </Text>
                    </View>
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
                    (!selectedDevice || !isConnected) &&
                    styles.printButtonDisabled,
                ]}
                onPress={handlePrint}
                disabled={
                  isPrinting ||
                  (selectedMethod === 'bluetooth' &&
                    (!selectedDevice || !isConnected))
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
  content: {
    flex: 1,
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
  methodOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#F3F4F6',
  },
  methodContent: {
    marginLeft: 12,
    flex: 1,
  },
  methodTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  methodTitleSelected: {
    color: '#059669',
  },
  methodTitleDisabled: {
    color: '#9CA3AF',
  },
  methodDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  methodDescriptionDisabled: {
    color: '#D1D5DB',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  scanButtonText: {
    fontSize: 14,
    color: '#059669',
    marginLeft: 4,
    fontFamily: 'Inter-Medium',
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
    marginLeft: 12,
    flex: 1,
  },
  deviceName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#111827',
  },
  deviceAddress: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  connectedIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#059669',
  },
  connectedText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'Inter-Medium',
  },
  emptyDeviceList: {
    alignItems: 'center',
    padding: 32,
  },
  emptyDeviceText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyDeviceSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  shareButton: {
    flex: 1,
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
    color: '#374151',
    fontFamily: 'Inter-Medium',
  },
  printButton: {
    flex: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  printButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  printButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Inter-SemiBold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
