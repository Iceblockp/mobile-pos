# Design Document

## Overview

This design implements direct Bluetooth thermal printing for the Xprinter P300 by adding minimal, clean components to the existing printing system. The approach focuses on simplicity and reliability, integrating seamlessly with the current EnhancedPrintManager and TemplateEngine.

## Architecture

### High-Level Flow

1. **User completes sale** → EnhancedPrintManager shows "Print Direct" option
2. **User taps Print Direct** → BluetoothPrinterService connects to saved printer
3. **Receipt data converted** → ESCPOSConverter transforms to thermal commands
4. **Print directly** → Commands sent via Bluetooth to Xprinter P300

### Integration Points

- **EnhancedPrintManager**: Add new "Print Direct" button
- **TemplateEngine**: Reuse existing receipt data and shop settings
- **AsyncStorage**: Store paired printer information
- **Fallback**: Use existing PDF sharing if Bluetooth fails

## Components and Interfaces

### 1. BluetoothPrinterService

**Purpose**: Handle Bluetooth connection and printing operations

```typescript
interface BluetoothPrinterService {
  // Core printing
  printReceipt(receiptData: ReceiptData): Promise<boolean>;

  // Printer management
  scanForPrinters(): Promise<BluetoothDevice[]>;
  connectToPrinter(device: BluetoothDevice): Promise<boolean>;
  getSavedPrinter(): Promise<BluetoothDevice | null>;

  // Status
  isConnected(): Promise<boolean>;
}
```

### 2. ESCPOSConverter

**Purpose**: Convert receipt data to ESC/POS thermal printer commands

```typescript
interface ESCPOSConverter {
  convertReceipt(
    receiptData: ReceiptData,
    shopSettings: ShopSettings | null
  ): string;
}
```

### 3. ThermalPrinterSettings (Component)

**Purpose**: Simple printer pairing interface in shop settings

```typescript
interface ThermalPrinterSettingsProps {
  onPrinterPaired: (printer: BluetoothDevice) => void;
}
```

## Data Models

### BluetoothDevice

```typescript
interface BluetoothDevice {
  id: string;
  name: string;
  address: string;
  isConnected: boolean;
}
```

### ThermalPrinterConfig

```typescript
interface ThermalPrinterConfig {
  savedPrinter: BluetoothDevice | null;
  lastConnected: string | null;
  printDensity: 'light' | 'normal' | 'dark';
}
```

## Error Handling

### Connection Errors

- **Printer not found**: Show "Printer not available, using PDF sharing"
- **Connection failed**: Retry once, then fallback to PDF
- **Print failed**: Show error message, offer retry or PDF option

### Graceful Degradation

- Always fallback to existing PDF sharing method
- Never block the sales process
- Clear error messages for users

## Testing Strategy

### Unit Tests

- **BluetoothPrinterService**: Mock Bluetooth operations
- **ESCPOSConverter**: Test command generation with sample data
- **ThermalPrinterSettings**: Test UI interactions

### Integration Tests

- **End-to-end printing flow**: Mock printer responses
- **Fallback scenarios**: Test error handling paths
- **Settings persistence**: Test printer pairing storage

### Manual Testing

- **Physical printer testing**: Test with actual Xprinter P300
- **Different receipt types**: Test various shop settings and items
- **Connection scenarios**: Test pairing, reconnection, failures

## Implementation Notes

### Dependencies

```json
{
  "react-native-bluetooth-classic": "^1.60.0-rc.5",
  "react-native-permissions": "^3.10.1"
}
```

### Xprinter P300 Specifications

- **Paper width**: 58mm (384 dots)
- **Protocol**: ESC/POS compatible
- **Connection**: Bluetooth Classic (not BLE)
- **Character encoding**: UTF-8 support for Myanmar text

### ESC/POS Commands (Basic Set)

- **Initialize**: `\x1B\x40`
- **Text align center**: `\x1B\x61\x01`
- **Text align left**: `\x1B\x61\x00`
- **Bold on**: `\x1B\x45\x01`
- **Bold off**: `\x1B\x45\x00`
- **Line feed**: `\x0A`
- **Cut paper**: `\x1D\x56\x00`

### Simple Implementation Strategy

1. **Start minimal**: Basic text printing only
2. **No complex formatting**: Keep ESC/POS commands simple
3. **Reuse existing data**: Use current TemplateEngine output
4. **Focus on reliability**: Prioritize working over fancy features
