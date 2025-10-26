import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, Camera, Flashlight, RotateCcw } from 'lucide-react-native';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { useTranslation } from '@/context/LocalizationContext';

interface BarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  onClose: () => void;
  continuousScanning?: boolean;
  onContinuousScanningChange?: (enabled: boolean) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onBarcodeScanned,
  onClose,
  continuousScanning = false,
  onContinuousScanningChange,
}) => {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState<AudioPlayer | null>(null);

  // Cleanup function to release audio player when component unmounts
  useEffect(() => {
    return () => {
      if (audioPlayer) {
        audioPlayer.release();
      }
    };
  }, [audioPlayer]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      Alert.alert(
        t('barcodeScanner.cameraNotAvailable'),
        t('barcodeScanner.cameraNotAvailableWeb'),
        [{ text: t('common.confirm'), onPress: onClose }]
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
            <Text style={styles.loadingText}>
              {t('barcodeScanner.loadingCamera')}
            </Text>
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
            <Text style={styles.headerTitle} weight="medium">
              {t('barcodeScanner.cameraPermission')}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.permissionContainer}>
            <Camera size={64} color="#6B7280" />
            <Text style={styles.permissionTitle} weight="bold">
              {t('barcodeScanner.cameraAccessRequired')}
            </Text>
            <Text style={styles.permissionText}>
              {t('barcodeScanner.cameraPermissionText')}
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText} weight="medium">
                {t('barcodeScanner.grantPermission')}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const handleBarcodeScanned = async ({
    data,
  }: {
    type: string;
    data: string;
  }) => {
    // Prevent rapid duplicate scans
    if (scanned) return;

    setScanned(true);

    // Play the sound when barcode is scanned
    // For continuous scanning, create a new audio player instance each time
    // This ensures reliable playback without conflicts
    try {
      const scanAudioPlayer = createAudioPlayer(
        require('../assets/audios/barcode-scan.mp3')
      );
      await scanAudioPlayer.play();

      // Clean up the audio player after a short delay
      setTimeout(() => {
        scanAudioPlayer.release();
      }, 2000);
    } catch (error) {
      console.error('Failed to play scan sound', error);
    }
    console.log('scan again');
    onBarcodeScanned(data);

    // Auto-reset scanner if continuous scanning is enabled
    if (continuousScanning) {
      setTimeout(() => {
        setScanned(false);
      }, 1500); // Reset after 1.5 seconds to allow for feedback
    }
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
          <Text style={styles.headerTitle} weight="medium">
            {t('barcodeScanner.title')}
          </Text>
          <TouchableOpacity
            style={styles.flashButton}
            onPress={() => {
              console.log('Flash button pressed, current state:', flashOn);
              setFlashOn(!flashOn);
            }}
          >
            <Flashlight size={24} color={flashOn ? '#FCD34D' : '#FFFFFF'} />
          </TouchableOpacity>
        </View>

        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={
              continuousScanning || !scanned ? handleBarcodeScanned : undefined
            }
            enableTorch={flashOn}
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
            {t('barcodeScanner.positionBarcode')}
          </Text>

          {/* Continuous Scanning Toggle */}
          <TouchableOpacity
            style={styles.continuousScanToggle}
            onPress={() => onContinuousScanningChange?.(!continuousScanning)}
          >
            <View
              style={[
                styles.checkbox,
                continuousScanning && styles.checkboxActive,
              ]}
            >
              {continuousScanning && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.continuousScanText}>
              {t('barcodeScanner.continuousScanning')}
            </Text>
          </TouchableOpacity>

          {scanned && !continuousScanning && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={resetScanner}
            >
              <RotateCcw size={16} color="#FFFFFF" />
              <Text style={styles.rescanButtonText} weight="medium">
                {t('barcodeScanner.scanAnother')}
              </Text>
            </TouchableOpacity>
          )}

          {scanned && continuousScanning && (
            <View style={styles.continuousScanFeedback}>
              <Text style={styles.continuousScanFeedbackText}>
                {t('barcodeScanner.scanningNext')}
              </Text>
            </View>
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
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  rescanButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rescanButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
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
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
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
    color: '#FFFFFF',
  },
  continuousScanToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  continuousScanText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  continuousScanFeedback: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  continuousScanFeedbackText: {
    fontSize: 14,
    color: '#10B981',
    textAlign: 'center',
  },
});
