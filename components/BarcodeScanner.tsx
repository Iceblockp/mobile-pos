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
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { X, Camera, Flashlight } from 'lucide-react-native';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { useTranslation } from '@/context/LocalizationContext';

interface BarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onBarcodeScanned,
  onClose,
}) => {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [audioPlayer, setAudioPlayer] = useState<AudioPlayer | null>(null);

  // Load sound when component mounts
  useEffect(() => {
    const loadSound = async () => {
      try {
        const player = createAudioPlayer(
          require('../assets/audios/barcode-scan.mp3')
        );
        setAudioPlayer(player);
      } catch (error) {
        console.error('Failed to load sound', error);
      }
    };

    loadSound();

    // Cleanup function to release audio player when component unmounts
    return () => {
      if (audioPlayer) {
        audioPlayer.release();
      }
    };
  }, []);

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
    type,
    data,
  }: {
    type: string;
    data: string;
  }) => {
    if (scanned) return;

    setScanned(true);

    // Play the sound when barcode is scanned
    try {
      if (audioPlayer) {
        await audioPlayer.play();
      }
    } catch (error) {
      console.error('Failed to play sound', error);
    }

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
          <Text style={styles.headerTitle} weight="medium">
            {t('barcodeScanner.title')}
          </Text>
          <TouchableOpacity
            style={styles.flashButton}
            onPress={() => setFlashOn(!flashOn)}
          >
            <Flashlight size={24} color={flashOn ? '#FCD34D' : '#FFFFFF'} />
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
            {t('barcodeScanner.positionBarcode')}
          </Text>

          {scanned && (
            <TouchableOpacity
              style={styles.rescanButton}
              onPress={resetScanner}
            >
              <Text style={styles.rescanButtonText} weight="medium">
                {t('barcodeScanner.scanAnother')}
              </Text>
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
});
