import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Printer, Bluetooth, Check, X, RefreshCw } from 'lucide-react-native';
import {
  BluetoothPrinterService,
  BluetoothDevice,
} from '@/services/bluetoothPrinterService';
import { useTranslation } from '@/context/LocalizationContext';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Ionicons } from '@expo/vector-icons';
import { PrinterErrorBoundary } from '@/components/PrinterErrorBoundary';
import { SafeAreaView } from 'react-native-safe-area-context';

function PrinterSettingsContent() {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [availablePrinters, setAvailablePrinters] = useState<BluetoothDevice[]>(
    []
  );
  const [savedPrinter, setSavedPrinter] = useState<BluetoothDevice | null>(
    null
  );
  const [connectionStatus, setConnectionStatus] = useState<boolean>(false);

  useEffect(() => {
    loadSavedPrinter();
    checkConnectionStatus();
  }, []);

  const loadSavedPrinter = async () => {
    try {
      const saved = await BluetoothPrinterService.getSavedPrinter();
      setSavedPrinter(saved);
    } catch (error) {
      console.error('Error loading saved printer:', error);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const connected = await BluetoothPrinterService.isConnected();
      setConnectionStatus(connected);
    } catch (error) {
      console.error('Error checking connection status:', error);
      setConnectionStatus(false);
    }
  };

  const scanForPrinters = async () => {
    setIsScanning(true);
    try {
      const isAvailable = await BluetoothPrinterService.isBluetoothAvailable();
      if (!isAvailable) {
        Alert.alert(
          t('printerSettings.bluetoothRequired'),
          Platform.OS === 'ios'
            ? 'Please enable Bluetooth in Settings and pair your printer first.'
            : t('printerSettings.enableBluetooth'),
          [{ text: t('common.confirm') }]
        );
        return;
      }

      const printers = await BluetoothPrinterService.scanForPrinters();
      setAvailablePrinters(printers);

      if (printers.length === 0) {
        Alert.alert(
          t('printerSettings.noPrintersFound'),
          Platform.OS === 'ios'
            ? 'No paired printers found. Please pair your thermal printer in iOS Settings > Bluetooth first.'
            : t('printerSettings.noPrintersFoundMessage'),
          [{ text: t('common.confirm') }]
        );
      }
    } catch (error) {
      console.error('Error scanning for printers:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        t('printerSettings.scanFailed'),
        `${t('printerSettings.scanFailedMessage')}\n\nError: ${errorMessage}`,
        [{ text: t('common.confirm') }]
      );
    } finally {
      setIsScanning(false);
    }
  };

  const connectToPrinter = async (device: BluetoothDevice) => {
    setIsConnecting(true);
    try {
      const success = await BluetoothPrinterService.connectToPrinter(device);
      if (success) {
        setSavedPrinter(device);
        setConnectionStatus(true);
        Alert.alert(
          t('printerSettings.connected'),
          `${t('printerSettings.connectedMessage')} ${device.name}`,
          [{ text: t('common.confirm') }]
        );
      } else {
        Alert.alert(
          t('printerSettings.connectionFailed'),
          t('printerSettings.connectionFailedMessage'),
          [{ text: t('common.confirm') }]
        );
      }
    } catch (error) {
      console.error('Error connecting to printer:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        t('printerSettings.connectionError'),
        `${t(
          'printerSettings.connectionErrorMessage'
        )}\n\nError: ${errorMessage}`,
        [{ text: t('common.confirm') }]
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectPrinter = async () => {
    try {
      await BluetoothPrinterService.disconnect();
      setConnectionStatus(false);
      Alert.alert(
        t('printerSettings.disconnected'),
        t('printerSettings.disconnectedMessage'),
        [{ text: t('common.confirm') }]
      );
    } catch (error) {
      console.error('Error disconnecting printer:', error);
    }
  };

  const removeSavedPrinter = async () => {
    Alert.alert(
      t('printerSettings.removePrinter'),
      t('printerSettings.removePrinterMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('printerSettings.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await BluetoothPrinterService.removeSavedPrinter();
              await BluetoothPrinterService.disconnect();
              setSavedPrinter(null);
              setConnectionStatus(false);
            } catch (error) {
              console.error('Error removing saved printer:', error);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity
            style={{ padding: 8, marginRight: 8 }}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <View style={styles.headerLeft}>
            <Text style={styles.title} weight="bold">
              {t('printerSettings.title')}
            </Text>
          </View>
        </View>
        <Stack.Screen
          options={{
            title: t('printerSettings.title'),
            headerStyle: { backgroundColor: '#f8f9fa' },
            headerTintColor: '#333',
          }}
        />

        <ScrollView style={styles.container}>
          {/* Current Printer Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('printerSettings.currentPrinter')}
            </Text>

            {savedPrinter ? (
              <View style={styles.printerCard}>
                <View style={styles.printerInfo}>
                  <Printer size={24} color="#059669" />
                  <View style={styles.printerDetails}>
                    <Text style={styles.printerName}>{savedPrinter.name}</Text>
                    <Text style={styles.printerAddress}>
                      {savedPrinter.address}
                    </Text>
                  </View>
                  <View style={styles.statusIndicator}>
                    {connectionStatus ? (
                      <Check size={20} color="#059669" />
                    ) : (
                      <X size={20} color="#EF4444" />
                    )}
                  </View>
                </View>

                <View style={styles.printerActions}>
                  {connectionStatus ? (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.disconnectButton]}
                      onPress={disconnectPrinter}
                    >
                      <Text style={styles.disconnectButtonText}>
                        {t('printerSettings.disconnect')}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.connectButton]}
                      onPress={() => connectToPrinter(savedPrinter)}
                      disabled={isConnecting}
                    >
                      {isConnecting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.connectButtonText}>
                          {t('printerSettings.connect')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.actionButton, styles.removeButton]}
                    onPress={removeSavedPrinter}
                  >
                    <Text style={styles.removeButtonText}>
                      {t('printerSettings.remove')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.noPrinterCard}>
                <Bluetooth size={48} color="#9CA3AF" />
                <Text style={styles.noPrinterText}>
                  {t('printerSettings.noPrinterConfigured')}
                </Text>
                <Text style={styles.noPrinterSubtext}>
                  {t('printerSettings.scanForPrinters')}
                </Text>
              </View>
            )}
          </View>

          {/* Available Printers */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t('printerSettings.availablePrinters')}
              </Text>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={scanForPrinters}
                disabled={isScanning}
              >
                {isScanning ? (
                  <ActivityIndicator size="small" color="#059669" />
                ) : (
                  <RefreshCw size={20} color="#059669" />
                )}
                <Text style={styles.scanButtonText}>
                  {isScanning
                    ? t('printerSettings.scanning')
                    : t('printerSettings.scan')}
                </Text>
              </TouchableOpacity>
            </View>

            {availablePrinters.length > 0 ? (
              availablePrinters.map((printer) => (
                <TouchableOpacity
                  key={printer.id}
                  style={styles.availablePrinterCard}
                  onPress={() => connectToPrinter(printer)}
                  disabled={isConnecting}
                >
                  <Printer size={20} color="#6B7280" />
                  <View style={styles.availablePrinterInfo}>
                    <Text style={styles.availablePrinterName}>
                      {printer.name}
                    </Text>
                    <Text style={styles.availablePrinterAddress}>
                      {printer.address}
                    </Text>
                  </View>
                  {isConnecting ? (
                    <ActivityIndicator size="small" color="#059669" />
                  ) : (
                    <Text style={styles.connectText}>
                      {t('printerSettings.connect')}
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.noDevicesCard}>
                <Text style={styles.noDevicesText}>
                  {t('printerSettings.noPrintersInstructions')}
                </Text>
                <Text style={styles.instructionText}>
                  {t('printerSettings.poweredOn')}
                </Text>
                <Text style={styles.instructionText}>
                  {t('printerSettings.pairedInBluetooth')}
                </Text>
                <Text style={styles.instructionText}>
                  {t('printerSettings.withinRange')}
                </Text>
              </View>
            )}
          </View>

          {/* Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t('printerSettings.setupInstructions')}
            </Text>
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionStep}>
                {t('printerSettings.step1')}
              </Text>
              <Text style={styles.instructionStep}>
                {t('printerSettings.step2')}
              </Text>
              <Text style={styles.instructionStep}>
                {t('printerSettings.step3')}
              </Text>
              <Text style={styles.instructionStep}>
                {t('printerSettings.step4')}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    margin: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    color: '#111827',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  printerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  printerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  printerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  printerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  printerAddress: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  statusIndicator: {
    padding: 4,
  },
  printerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  connectButton: {
    backgroundColor: '#059669',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  disconnectButton: {
    backgroundColor: '#EF4444',
  },
  disconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  removeButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  removeButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  noPrinterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noPrinterText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginTop: 12,
  },
  noPrinterSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
  },
  scanButtonText: {
    color: '#059669',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 6,
  },
  availablePrinterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  availablePrinterInfo: {
    flex: 1,
    marginLeft: 12,
  },
  availablePrinterName: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  availablePrinterAddress: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  connectText: {
    color: '#059669',
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  noDevicesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noDevicesText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 8,
    marginBottom: 4,
  },
  instructionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  instructionStep: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
});

export default function PrinterSettingsScreen() {
  return (
    <PrinterErrorBoundary>
      <PrinterSettingsContent />
    </PrinterErrorBoundary>
  );
}
