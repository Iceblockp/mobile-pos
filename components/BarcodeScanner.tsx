import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, SafeAreaView, Alert, Platform } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { X, Camera, Flashlight } from 'lucide-react-native';

interface BarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onBarcodeScanned,
  onClose,
}) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      Alert.alert(
        'Camera Not Available',
        'Barcode scanning is not available on web. Please enter the barcode manually.',
        [{ text: 'OK', onPress: onClose }]
      );
      return;
    }
  }, []);

  if (Platform.OS === 'web') {
    return null;
  }

  if (!permission) {
    return (
      <Modal visible={true} animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading camera...</Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={true} animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Camera Permission</Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={styles.permissionContainer}>
            <Camera size={64} color="#6B7280" />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              We need camera access to scan barcodes. Please grant permission to continue.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    onBarcodeScanned(data);
  };

  const resetScanner = () => {
    setScanned(false);
  };

  return (
    <Modal visible={true} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Barcode</Text>
          <TouchableOpacity 
            style={styles.flashButton} 
            onPress={() => setFlashOn(!flashOn)}
          >
            <Flashlight size={24} color={flashOn ? "#FCD34D" : "#FFFFFF"} />
          </TouchableOpacity>
        </View>

        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            flash={flashOn ? 'on' : 'off'}
          >
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={styles.scanFrame} />
              </View>
            </View>
          </CameraView>
        </View>

        <View style={styles.footer}>
          <Text style={styles.instructionText}>
            Position the barcode within the frame to scan
          </Text>
          
          {scanned && (
            <TouchableOpacity style={styles.rescanButton} onPress={resetScanner}>
              <Text style={styles.rescanButtonText}>Scan Another</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  flashButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  rescanButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  rescanButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});