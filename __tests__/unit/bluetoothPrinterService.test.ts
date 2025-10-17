import {
  BluetoothPrinterService,
  BluetoothDevice,
} from '@/services/bluetoothPrinterService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock react-native-bluetooth-classic
const mockBluetoothClassic = {
  isBluetoothEnabled: jest.fn(),
  requestBluetoothEnabled: jest.fn(),
  getBondedDevices: jest.fn(),
  connectToDevice: jest.fn(),
};

jest.mock('react-native-bluetooth-classic', () => ({
  default: mockBluetoothClassic,
}));

describe('BluetoothPrinterService', () => {
  const mockDevice: BluetoothDevice = {
    id: 'test-device-id',
    name: 'Xprinter P300',
    address: '00:11:22:33:44:55',
    isConnected: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isBluetoothAvailable', () => {
    it('should return true when Bluetooth is enabled', async () => {
      mockBluetoothClassic.isBluetoothEnabled.mockResolvedValue(true);

      const result = await BluetoothPrinterService.isBluetoothAvailable();

      expect(result).toBe(true);
      expect(mockBluetoothClassic.isBluetoothEnabled).toHaveBeenCalled();
    });

    it('should return false when Bluetooth is disabled', async () => {
      mockBluetoothClassic.isBluetoothEnabled.mockResolvedValue(false);

      const result = await BluetoothPrinterService.isBluetoothAvailable();

      expect(result).toBe(false);
    });

    it('should return false when Bluetooth check fails', async () => {
      mockBluetoothClassic.isBluetoothEnabled.mockRejectedValue(
        new Error('Bluetooth error')
      );

      const result = await BluetoothPrinterService.isBluetoothAvailable();

      expect(result).toBe(false);
    });
  });

  describe('scanForPrinters', () => {
    it('should return filtered printer devices', async () => {
      const mockBondedDevices = [
        { id: '1', name: 'Xprinter P300', address: '00:11:22:33:44:55' },
        { id: '2', name: 'iPhone', address: '00:11:22:33:44:66' },
        { id: '3', name: 'Thermal Printer', address: '00:11:22:33:44:77' },
      ];

      mockBluetoothClassic.isBluetoothEnabled.mockResolvedValue(true);
      mockBluetoothClassic.getBondedDevices.mockResolvedValue(
        mockBondedDevices
      );

      const result = await BluetoothPrinterService.scanForPrinters();

      expect(result).toHaveLength(2); // Should filter out iPhone
      expect(result[0].name).toBe('Xprinter P300');
      expect(result[1].name).toBe('Thermal Printer');
    });

    it('should request permissions when Bluetooth is disabled', async () => {
      mockBluetoothClassic.isBluetoothEnabled.mockResolvedValue(false);
      mockBluetoothClassic.requestBluetoothEnabled.mockResolvedValue(true);
      mockBluetoothClassic.getBondedDevices.mockResolvedValue([]);

      await BluetoothPrinterService.scanForPrinters();

      expect(mockBluetoothClassic.requestBluetoothEnabled).toHaveBeenCalled();
    });

    it('should throw error when permission is denied', async () => {
      mockBluetoothClassic.isBluetoothEnabled.mockResolvedValue(false);
      mockBluetoothClassic.requestBluetoothEnabled.mockResolvedValue(false);

      await expect(BluetoothPrinterService.scanForPrinters()).rejects.toThrow(
        'Bluetooth permission denied'
      );
    });
  });

  describe('getSavedPrinter', () => {
    it('should return saved printer from storage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(mockDevice)
      );

      const result = await BluetoothPrinterService.getSavedPrinter();

      expect(result).toEqual(mockDevice);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        'saved_thermal_printer'
      );
    });

    it('should return null when no printer is saved', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await BluetoothPrinterService.getSavedPrinter();

      expect(result).toBeNull();
    });

    it('should return null when storage read fails', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      const result = await BluetoothPrinterService.getSavedPrinter();

      expect(result).toBeNull();
    });
  });

  describe('savePrinter', () => {
    it('should save printer to storage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await BluetoothPrinterService.savePrinter(mockDevice);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'saved_thermal_printer',
        JSON.stringify(mockDevice)
      );
    });

    it('should handle storage save errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(
        new Error('Storage error')
      );

      // Should not throw
      await expect(
        BluetoothPrinterService.savePrinter(mockDevice)
      ).resolves.toBeUndefined();
    });
  });

  describe('removeSavedPrinter', () => {
    it('should remove printer from storage', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await BluetoothPrinterService.removeSavedPrinter();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        'saved_thermal_printer'
      );
    });
  });
});
