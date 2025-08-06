import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Upload, X, ImageIcon } from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { useToast } from '@/context/ToastContext';
import { ShopSettingsService } from '@/services/shopSettingsService';

interface LogoUploaderProps {
  logoPath?: string;
  onLogoChange: (logoPath: string | null) => void;
  shopSettingsService: ShopSettingsService;
}

export const LogoUploader: React.FC<LogoUploaderProps> = ({
  logoPath,
  onLogoChange,
  shopSettingsService,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [uploading, setUploading] = useState(false);

  const showImageSourceOptions = () => {
    Alert.alert(
      t('shopSettings.logoUpload.selectSource'),
      '',
      [
        {
          text: t('shopSettings.logoUpload.camera'),
          onPress: handleTakePhoto,
        },
        {
          text: t('shopSettings.logoUpload.gallery'),
          onPress: handlePickFromGallery,
        },
        {
          text: t('shopSettings.logoUpload.cancel'),
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleTakePhoto = async () => {
    setUploading(true);
    try {
      const imageUri = await shopSettingsService.takePhotoWithCamera();
      if (imageUri) {
        const logoPath = await shopSettingsService.uploadLogo(imageUri);
        onLogoChange(logoPath);
        showToast(t('shopSettings.success.logoUploaded'), 'success');
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : t('shopSettings.errors.failedToUploadLogo');
      showToast(errorMessage, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handlePickFromGallery = async () => {
    setUploading(true);
    try {
      const imageUri = await shopSettingsService.pickImageFromGallery();
      if (imageUri) {
        const logoPath = await shopSettingsService.uploadLogo(imageUri);
        onLogoChange(logoPath);
        showToast(t('shopSettings.success.logoUploaded'), 'success');
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : t('shopSettings.errors.failedToUploadLogo');
      showToast(errorMessage, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    Alert.alert(
      t('shopSettings.removeLogo'),
      'Are you sure you want to remove the current logo?',
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('shopSettings.removeLogo'),
          style: 'destructive',
          onPress: async () => {
            try {
              if (logoPath) {
                await shopSettingsService.deleteLogo(logoPath);
              }
              onLogoChange(null);
              showToast(t('shopSettings.success.logoRemoved'), 'success');
            } catch (error) {
              console.error('Failed to remove logo:', error);
              showToast(t('shopSettings.errors.failedToRemoveLogo'), 'error');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('shopSettings.logo')}</Text>

      <View style={styles.logoContainer}>
        {logoPath ? (
          // Show existing logo
          <View style={styles.logoPreview}>
            <Image source={{ uri: logoPath }} style={styles.logoImage} />
            <View style={styles.logoOverlay} testID="logo-overlay">
              <TouchableOpacity
                style={styles.removeButton}
                onPress={handleRemoveLogo}
                testID="remove-logo-button"
              >
                <X size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Show upload placeholder
          <View style={styles.uploadPlaceholder}>
            <ImageIcon size={32} color="#9CA3AF" />
            <Text style={styles.placeholderText}>No logo uploaded</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        {logoPath ? (
          <TouchableOpacity
            style={[
              styles.uploadButton,
              uploading && styles.uploadButtonDisabled,
            ]}
            onPress={showImageSourceOptions}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator
                size="small"
                color="#059669"
                testID="activity-indicator"
              />
            ) : (
              <>
                <Upload size={16} color="#059669" />
                <Text style={styles.uploadButtonText}>
                  {t('shopSettings.changeLogo')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.uploadButton,
              uploading && styles.uploadButtonDisabled,
            ]}
            onPress={showImageSourceOptions}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator
                size="small"
                color="#059669"
                testID="activity-indicator"
              />
            ) : (
              <>
                <Upload size={16} color="#059669" />
                <Text style={styles.uploadButtonText}>
                  {t('shopSettings.uploadLogo')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.helpText}>
        Recommended: Square image, max 2MB (JPG, PNG, GIF)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  logoPreview: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    padding: 8,
  },
  removeButton: {
    backgroundColor: '#EF4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  placeholderText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#059669',
    backgroundColor: '#FFFFFF',
  },
  uploadButtonDisabled: {
    borderColor: '#9CA3AF',
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#059669',
    marginLeft: 8,
  },
  helpText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});
