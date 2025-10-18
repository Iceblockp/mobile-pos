import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Save, Store, Palette } from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { useToast } from '@/context/ToastContext';
import { ShopSettingsInput } from '@/services/shopSettingsService';
import { LogoUploader } from '@/components/LogoUploader';
import { ReceiptTemplateSelector } from '@/components/ReceiptTemplateSelector';
import { ReceiptPreview } from '@/components/ReceiptPreview';
import { CurrencySelector } from '@/components/CurrencySelector';
import { useShopSettings } from '@/context/ShopSettingsContext';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { MyanmarTextInput as TextInput } from '@/components/MyanmarTextInput';

export default function ShopSettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const {
    shopSettings,
    shopSettingsService,
    loading: contextLoading,
    updateShopSettings,
  } = useShopSettings();

  // Form state - will be initialized when shop settings load
  const [formData, setFormData] = useState<ShopSettingsInput>({
    shopName: '',
    address: '',
    phone: '',
    logoPath: '',
    receiptFooter: '',
    thankYouMessage: '',
    receiptTemplate: 'classic', // Default fallback
  });

  // Track if form has been initialized to prevent overwriting user changes
  const [formInitialized, setFormInitialized] = useState(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Initialize form data when shop settings load (only once)
  useEffect(() => {
    if (shopSettings && !formInitialized) {
      setFormData({
        shopName: shopSettings.shopName,
        address: shopSettings.address || '',
        phone: shopSettings.phone || '',
        logoPath: shopSettings.logoPath || '',
        receiptFooter: shopSettings.receiptFooter || '',
        thankYouMessage: shopSettings.thankYouMessage || '',
        receiptTemplate: shopSettings.receiptTemplate,
      });
      setFormInitialized(true);
    } else if (!shopSettings && !contextLoading && !formInitialized) {
      // No shop settings exist, initialize with defaults
      setFormData({
        shopName: '',
        address: '',
        phone: '',
        logoPath: '',
        receiptFooter: '',
        thankYouMessage: '',
        receiptTemplate: 'classic',
      });
      setFormInitialized(true);
    }
  }, [shopSettings, contextLoading, formInitialized]);

  // Handle form field changes
  const handleFieldChange = (field: keyof ShopSettingsInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Handle logo changes
  const handleLogoChange = (logoPath: string | null) => {
    setFormData((prev) => ({ ...prev, logoPath: logoPath || '' }));
  };

  // Validate form
  const validateForm = (): boolean => {
    if (!shopSettingsService) return false;

    const validation = shopSettingsService.validateShopSettings(formData);
    setErrors(validation.errors);
    return validation.isValid;
  };

  // Handle save
  const handleSave = async () => {
    if (!shopSettingsService || !validateForm()) {
      return;
    }

    setSaving(true);
    try {
      await updateShopSettings(formData);
      showToast(t('shopSettings.success.settingsSaved'), 'success');
      router.back();
    } catch (error) {
      console.error('Failed to save shop settings:', error);
      showToast(t('shopSettings.errors.failedToSave'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (contextLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title} weight="bold">
            {t('shopSettings.title')}
          </Text>
          {/* <Text style={styles.subtitle}>{t('shopSettings.subtitle')}</Text> */}
        </View>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Save size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Form Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Store size={20} color="#059669" />
            <Text style={styles.sectionTitle} weight="medium">
              {t('shopSettings.basicInfo')}
            </Text>
          </View>

          {/* Shop Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel} weight="medium">
              {t('shopSettings.shopName')}{' '}
              <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.textInput,
                errors.shopName && styles.textInputError,
              ]}
              value={formData.shopName}
              onChangeText={(value) => handleFieldChange('shopName', value)}
              placeholder={t('shopSettings.shopNamePlaceholder')}
              placeholderTextColor="#9CA3AF"
            />
            {errors.shopName && (
              <Text style={styles.errorText}>{errors.shopName}</Text>
            )}
          </View>

          {/* Address */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel} weight="medium">
              {t('shopSettings.address')}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                errors.address && styles.textInputError,
              ]}
              value={formData.address}
              onChangeText={(value) => handleFieldChange('address', value)}
              placeholder={t('shopSettings.addressPlaceholder')}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {errors.address && (
              <Text style={styles.errorText}>{errors.address}</Text>
            )}
          </View>

          {/* Phone */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel} weight="medium">
              {t('shopSettings.phone')}
            </Text>
            <TextInput
              style={[styles.textInput, errors.phone && styles.textInputError]}
              value={formData.phone}
              onChangeText={(value) => handleFieldChange('phone', value)}
              placeholder={t('shopSettings.phonePlaceholder')}
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
            {errors.phone && (
              <Text style={styles.errorText}>{errors.phone}</Text>
            )}
          </View>

          {/* Currency Configuration */}
          <CurrencySelector />
        </View>

        {/* Branding Section */}
        {/* <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Palette size={20} color="#059669" />
            <Text style={styles.sectionTitle} weight="medium">
              {t('shopSettings.branding')}
            </Text>
          </View>

          {shopSettingsService && (
            <LogoUploader
              logoPath={formData.logoPath}
              onLogoChange={handleLogoChange}
              shopSettingsService={shopSettingsService}
            />
          )}
        </View> */}

        {/* Receipt Customization Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} weight="medium">
              {t('shopSettings.receiptCustomization')}
            </Text>
          </View>

          {/* Receipt Footer */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel} weight="medium">
              {t('shopSettings.receiptFooter')}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                errors.receiptFooter && styles.textInputError,
              ]}
              value={formData.receiptFooter}
              onChangeText={(value) =>
                handleFieldChange('receiptFooter', value)
              }
              placeholder={t('shopSettings.receiptFooterPlaceholder')}
              placeholderTextColor="#9CA3AF"
              maxLength={200}
            />
            {errors.receiptFooter && (
              <Text style={styles.errorText}>{errors.receiptFooter}</Text>
            )}
            <Text style={styles.characterCount}>
              {formData.receiptFooter?.length}/200
            </Text>
          </View>

          {/* Thank You Message */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel} weight="medium">
              {t('shopSettings.thankYouMessage')}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                errors.thankYouMessage && styles.textInputError,
              ]}
              value={formData.thankYouMessage}
              onChangeText={(value) =>
                handleFieldChange('thankYouMessage', value)
              }
              placeholder={t('shopSettings.thankYouMessagePlaceholder')}
              placeholderTextColor="#9CA3AF"
              maxLength={200}
            />
            {errors.thankYouMessage && (
              <Text style={styles.errorText}>{errors.thankYouMessage}</Text>
            )}
            <Text style={styles.characterCount}>
              {formData.thankYouMessage?.length}/200
            </Text>
          </View>
        </View>

        {/* Template Selection Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} weight="medium">
              {t('shopSettings.template')}
            </Text>
          </View>

          {shopSettingsService && (
            <ReceiptTemplateSelector
              selectedTemplate={formData.receiptTemplate || ''}
              onTemplateChange={(templateId) =>
                handleFieldChange('receiptTemplate', templateId)
              }
              shopSettingsService={shopSettingsService}
              shopSettings={shopSettings}
            />
          )}
        </View>

        {/* Receipt Preview Section */}
        {/* <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle} weight="medium">
              {t('shopSettings.preview')}
            </Text>
          </View>

          {shopSettingsService && formInitialized && (
            <ReceiptPreview
              shopSettings={
                formData.shopName
                  ? {
                      shopName: formData.shopName,
                      address: formData.address,
                      phone: formData.phone,
                      logoPath: formData.logoPath,
                      receiptFooter: formData.receiptFooter,
                      thankYouMessage: formData.thankYouMessage,
                      receiptTemplate: formData.receiptTemplate,
                      lastUpdated: new Date().toISOString(),
                    }
                  : null
              }
              templateId={formData.receiptTemplate || ''}
              shopSettingsService={shopSettingsService}
              style={styles.previewContainer}
            />
          )}

          {(!formInitialized || contextLoading) && (
            <View style={[styles.previewContainer, styles.loadingContainer]}>
              <ActivityIndicator size="small" color="#059669" />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          )}
        </View> */}

        {/* Save Button (Mobile) */}
        <View style={styles.mobileButtonContainer}>
          <TouchableOpacity
            style={[
              styles.mobileSaveButton,
              saving && styles.mobileSaveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={20} color="#FFFFFF" />
                <Text style={styles.mobileSaveButtonText} weight="medium">
                  {t('shopSettings.save')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // loadingContainer: {
  //   flex: 1,
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  // loadingText: {
  //   marginTop: 12,
  //   fontSize: 16,
  //   color: '#6B7280',
  //   fontFamily: 'Inter-Regular',
  // },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  saveButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 100, // Extra bottom padding to ensure preview is fully visible
    flexGrow: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#111827',
    marginLeft: 8,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
  },
  textInputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  mobileButtonContainer: {
    paddingVertical: 16,
  },
  mobileSaveButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  mobileSaveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  mobileSaveButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  previewContainer: {
    // Remove height constraints to show full content
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
  },
});
