import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { X, Camera as CameraIcon } from 'lucide-react-native';
import { useLocalization } from '../context/LocalizationContext';
import TextRecognition from '@react-native-ml-kit/text-recognition';

interface TextScannerProps {
  visible: boolean;
  onClose: () => void;
  onTextDetected: (text: string) => void;
}

const { width, height } = Dimensions.get('window');

export default function TextScanner({
  visible,
  onClose,
  onTextDetected,
}: TextScannerProps) {
  const { t } = useLocalization();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [cameraRef, setCameraRef] = useState<any>(null);

  useEffect(() => {
    getCameraPermissions();
  }, []);

  const getCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const handleTextRecognition = async (imageUri: string) => {
    try {
      console.log('Processing image for text recognition:', imageUri);

      // Use ML Kit to recognize text from the image
      const result = await TextRecognition.recognize(imageUri);

      if (result.text && result.text.trim()) {
        // Clean up the recognized text
        const cleanedText = result.text.trim().replace(/\s+/g, ' ');
        onTextDetected(cleanedText);
      } else {
        Alert.alert(
          'No Text Found',
          'No text was detected in the image. Please try again with clearer text.'
        );
      }
    } catch (error) {
      console.error('Text recognition error:', error);
      Alert.alert('Error', 'Failed to recognize text. Please try again.');
    }
  };

  const takePicture = async (camera: any) => {
    if (!camera || !isScanning) return;

    try {
      setIsScanning(false);
      const photo = await camera.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      await handleTextRecognition(photo.uri);
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take picture');
    } finally {
      setIsScanning(true);
    }
  };

  if (hasPermission === null) {
    return null;
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="slide">
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>
              {t('scanner.cameraPermissionRequired')}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <CameraView style={styles.camera} facing="back" ref={setCameraRef}>
          {/* Overlay for text scanning area */}
          <View style={styles.overlay}>
            <View style={styles.topOverlay} />
            <View style={styles.middleRow}>
              <View style={styles.sideOverlay} />
              <View style={styles.scanArea}>
                <View style={styles.scanFrame} />
              </View>
              <View style={styles.sideOverlay} />
            </View>
            <View style={styles.bottomOverlay} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeIcon} onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerText}>
              {t('scanner.scanProductName')}
            </Text>
            <View style={styles.placeholder} />
          </View>

          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructions}>
              {t('scanner.alignTextInFrame')}
            </Text>
          </View>

          {/* Capture Button */}
          <View style={styles.captureContainer}>
            <TouchableOpacity
              style={[
                styles.captureButton,
                !isScanning && styles.captureButtonDisabled,
              ]}
              onPress={() => takePicture(cameraRef)}
              disabled={!isScanning}
            >
              <CameraIcon size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 200,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanArea: {
    width: width * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: '#00FF00',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 1,
  },
  closeIcon: {
    padding: 8,
  },
  headerText: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    zIndex: 1,
  },
  instructions: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
  },
  captureContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  captureButtonDisabled: {
    backgroundColor: '#666666',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#FFFFFF',
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
