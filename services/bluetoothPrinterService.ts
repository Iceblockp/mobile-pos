import AsyncStorage from '@react-native-async-storage/async-storage';
import { ESCPOSConverter, ReceiptData } from '@/utils/escposConverter';
import { ShopSettings } from '@/services/shopSettingsStorage';

// Import Bluetooth Classic (will be available after development build)
let BluetoothClassic: any;
try {
  BluetoothClassic = require('react-native-bluetooth-classic').default;
} catch (error) {
  console.warn('Bluetooth Classic not available in Expo Go');
}

export interface BluetoothDevice {
  id: string;
  name: string;
  address: string;
  isConnected: boolean;
}

export class BluetoothPrinterService {
  private static readonly STORAGE_KEY = 'saved_thermal_printer';
  private static connectedDevice: any = null;

  /**
   * Check if Bluetooth is available and enabled
   */
  static async isBluetoothAvailable(): Promise<boolean> {
    if (!BluetoothClassic) {
      return false;
    }

    try {
      const isEnabled = await BluetoothClassic.isBluetoothEnabled();
      return isEnabled;
    } catch (error) {
      console.error('Error checking Bluetooth availability:', error);
      return false;
    }
  }

  /**
   * Request Bluetooth permissions
   */
  static async requestPermissions(): Promise<boolean> {
    if (!BluetoothClassic) {
      return false;
    }

    try {
      const granted = await BluetoothClassic.requestBluetoothEnabled();
      return granted;
    } catch (error) {
      console.error('Error requesting Bluetooth permissions:', error);
      return false;
    }
  }

  /**
   * Scan for available Bluetooth devices
   */
  static async scanForPrinters(): Promise<BluetoothDevice[]> {
    if (!BluetoothClassic) {
      throw new Error('Bluetooth not available');
    }

    try {
      // Check if Bluetooth is enabled
      const isEnabled = await this.isBluetoothAvailable();
      if (!isEnabled) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Bluetooth permission denied');
        }
      }

      // Get paired devices first
      const pairedDevices = await BluetoothClassic.getBondedDevices();

      // Filter for potential printers (devices with "printer" or "P300" in name)
      const printers = pairedDevices
        .filter(
          (device: any) =>
            device.name &&
            (device.name.toLowerCase().includes('printer') ||
              device.name.toLowerCase().includes('p300') ||
              device.name.toLowerCase().includes('xprinter'))
        )
        .map((device: any) => ({
          id: device.id,
          name: device.name,
          address: device.address,
          isConnected: false,
        }));

      return printers;
    } catch (error) {
      console.error('Error scanning for printers:', error);
      throw new Error('Failed to scan for printers');
    }
  }

  /**
   * Connect to a Bluetooth printer
   */
  static async connectToPrinter(device: BluetoothDevice): Promise<boolean> {
    if (!BluetoothClassic) {
      throw new Error('Bluetooth not available');
    }

    try {
      // Disconnect from any existing connection
      if (this.connectedDevice) {
        await this.disconnect();
      }

      // Connect to the device
      const connection = await BluetoothClassic.connectToDevice(device.address);

      if (connection) {
        this.connectedDevice = connection;

        // Save the device for future use
        await this.savePrinter(device);

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error connecting to printer:', error);
      throw new Error('Failed to connect to printer');
    }
  }

  /**
   * Disconnect from current printer
   */
  static async disconnect(): Promise<void> {
    if (this.connectedDevice) {
      try {
        await this.connectedDevice.disconnect();
        this.connectedDevice = null;
      } catch (error) {
        console.error('Error disconnecting from printer:', error);
      }
    }
  }

  /**
   * Check if currently connected to a printer
   */
  static async isConnected(): Promise<boolean> {
    if (!this.connectedDevice) {
      return false;
    }

    try {
      return await this.connectedDevice.isConnected();
    } catch (error) {
      console.error('Error checking connection status:', error);
      return false;
    }
  }

  /**
   * Print receipt to connected thermal printer
   */
  static async printReceipt(
    receiptData: ReceiptData,
    shopSettings: ShopSettings | null
  ): Promise<boolean> {
    if (!this.connectedDevice) {
      throw new Error('No printer connected');
    }

    try {
      // Check connection
      const connected = await this.isConnected();
      if (!connected) {
        throw new Error('Printer not connected');
      }

      // Convert receipt data to ESC/POS commands
      const escposCommands = ESCPOSConverter.convertReceipt(
        receiptData,
        shopSettings
      );

      // Send commands to printer
      await this.connectedDevice.write(escposCommands);

      return true;
    } catch (error) {
      console.error('Error printing receipt:', error);
      throw new Error('Failed to print receipt');
    }
  }

  /**
   * Get saved printer from storage
   */
  static async getSavedPrinter(): Promise<BluetoothDevice | null> {
    try {
      const saved = await AsyncStorage.getItem(this.STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Error getting saved printer:', error);
      return null;
    }
  }

  /**
   * Save printer to storage
   */
  static async savePrinter(device: BluetoothDevice): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(device));
    } catch (error) {
      console.error('Error saving printer:', error);
    }
  }

  /**
   * Remove saved printer from storage
   */
  static async removeSavedPrinter(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error removing saved printer:', error);
    }
  }

  /**
   * Auto-connect to saved printer if available
   */
  static async autoConnect(): Promise<boolean> {
    try {
      const savedPrinter = await this.getSavedPrinter();
      if (!savedPrinter) {
        return false;
      }

      return await this.connectToPrinter(savedPrinter);
    } catch (error) {
      console.error('Error auto-connecting to printer:', error);
      return false;
    }
  }
}
