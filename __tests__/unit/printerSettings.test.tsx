import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import PrinterSettingsScreen from '@/app/printer-settings';
import { BluetoothPrinterService } from '@/services/bluetoothPrinterService';

// Mock the BluetoothPrinterService
jest.mock('@/services/bluetoothPrinterService', () => ({
  BluetoothPrinterService: {
    isBluetoothAvailable: jest.fn(),
    scanForPrinters: jest.fn(),
    connectToPrinter: jest.fn(),
    disconnect: jest.fn(),
    isConnected: jest.fn(),
    getSavedPrinter: jest.fn(),
    removeSavedPrinter: jest.fn(),
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock expo-router
jest.mock('expo-router', () => ({
  Stack: {
    Screen: ({ options }: any) => null,
  },
}));

// Mock LocalizationContext
jest.mock('@/context/LocalizationContext', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('PrinterSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly with no saved printer', async () => {
    (BluetoothPrinterService.getSavedPrinter as jest.Mock).mockResolvedValue(
      null
    );
    (BluetoothPrinterService.isConnected as jest.Mock).mockResolvedValue(false);

    const { getByText } = render(<PrinterSettingsScreen />);

    await waitFor(() => {
      expect(getByText('No printer configured')).toBeTruthy();
      expect(
        getByText('Scan for available thermal printers below')
      ).toBeTruthy();
    });
  });

  it('should render correctly with saved printer', async () => {
    const mockSavedPrinter = {
      id: 'test-id',
      name: 'Xprinter P300',
      address: '00:11:22:33:44:55',
      isConnected: false,
    };

    (BluetoothPrinterService.getSavedPrinter as jest.Mock).mockResolvedValue(
      mockSavedPrinter
    );
    (BluetoothPrinterService.isConnected as jest.Mock).mockResolvedValue(true);

    const { getByText } = render(<PrinterSettingsScreen />);

    await waitFor(() => {
      expect(getByText('Xprinter P300')).toBeTruthy();
      expect(getByText('00:11:22:33:44:55')).toBeTruthy();
    });
  });

  it('should handle scan for printers', async () => {
    const mockPrinters = [
      {
        id: 'printer-1',
        name: 'Xprinter P300',
        address: '00:11:22:33:44:55',
        isConnected: false,
      },
    ];

    (BluetoothPrinterService.getSavedPrinter as jest.Mock).mockResolvedValue(
      null
    );
    (BluetoothPrinterService.isConnected as jest.Mock).mockResolvedValue(false);
    (
      BluetoothPrinterService.isBluetoothAvailable as jest.Mock
    ).mockResolvedValue(true);
    (BluetoothPrinterService.scanForPrinters as jest.Mock).mockResolvedValue(
      mockPrinters
    );

    const { getByText } = render(<PrinterSettingsScreen />);

    const scanButton = getByText('Scan');
    fireEvent.press(scanButton);

    await waitFor(() => {
      expect(BluetoothPrinterService.scanForPrinters).toHaveBeenCalled();
    });
  });

  it('should show alert when Bluetooth is not available', async () => {
    (BluetoothPrinterService.getSavedPrinter as jest.Mock).mockResolvedValue(
      null
    );
    (BluetoothPrinterService.isConnected as jest.Mock).mockResolvedValue(false);
    (
      BluetoothPrinterService.isBluetoothAvailable as jest.Mock
    ).mockResolvedValue(false);

    const { getByText } = render(<PrinterSettingsScreen />);

    const scanButton = getByText('Scan');
    fireEvent.press(scanButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Bluetooth Required',
        'Please enable Bluetooth to scan for printers.',
        [{ text: 'OK' }]
      );
    });
  });

  it('should handle printer connection', async () => {
    const mockPrinter = {
      id: 'printer-1',
      name: 'Xprinter P300',
      address: '00:11:22:33:44:55',
      isConnected: false,
    };

    (BluetoothPrinterService.getSavedPrinter as jest.Mock).mockResolvedValue(
      null
    );
    (BluetoothPrinterService.isConnected as jest.Mock).mockResolvedValue(false);
    (
      BluetoothPrinterService.isBluetoothAvailable as jest.Mock
    ).mockResolvedValue(true);
    (BluetoothPrinterService.scanForPrinters as jest.Mock).mockResolvedValue([
      mockPrinter,
    ]);
    (BluetoothPrinterService.connectToPrinter as jest.Mock).mockResolvedValue(
      true
    );

    const { getByText } = render(<PrinterSettingsScreen />);

    // First scan for printers
    const scanButton = getByText('Scan');
    fireEvent.press(scanButton);

    await waitFor(() => {
      expect(getByText('Xprinter P300')).toBeTruthy();
    });

    // Then connect to printer
    const connectButton = getByText('Connect');
    fireEvent.press(connectButton);

    await waitFor(() => {
      expect(BluetoothPrinterService.connectToPrinter).toHaveBeenCalledWith(
        mockPrinter
      );
    });
  });

  it('should handle connection failure', async () => {
    const mockPrinter = {
      id: 'printer-1',
      name: 'Xprinter P300',
      address: '00:11:22:33:44:55',
      isConnected: false,
    };

    (BluetoothPrinterService.connectToPrinter as jest.Mock).mockResolvedValue(
      false
    );

    const { getByText } = render(<PrinterSettingsScreen />);

    // Mock that we have scanned printers
    (BluetoothPrinterService.scanForPrinters as jest.Mock).mockResolvedValue([
      mockPrinter,
    ]);

    const scanButton = getByText('Scan');
    fireEvent.press(scanButton);

    await waitFor(() => {
      const connectButton = getByText('Connect');
      fireEvent.press(connectButton);
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Connection Failed',
        'Failed to connect to the printer. Please try again.',
        [{ text: 'OK' }]
      );
    });
  });
});
