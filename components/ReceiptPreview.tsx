import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from '@/context/LocalizationContext';
import { ShopSettingsService } from '@/services/shopSettingsService';
import { ShopSettings } from '@/services/database';

interface ReceiptPreviewProps {
  shopSettings: ShopSettings | null;
  templateId: string;
  shopSettingsService: ShopSettingsService | null;
  style?: any;
}

const { width: screenWidth } = Dimensions.get('window');
const previewWidth = Math.min(screenWidth - 40, 320);

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
  shopSettings,
  templateId,
  shopSettingsService,
  style,
}) => {
  const { t } = useTranslation();
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate preview when inputs change
  useEffect(() => {
    const generatePreview = async () => {
      if (!shopSettingsService) {
        setError('Shop settings service not available');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const html = await shopSettingsService.previewTemplate(
          templateId,
          shopSettings
        );
        setPreviewHtml(html);
      } catch (err) {
        console.error('Failed to generate receipt preview:', err);
        setError('Failed to generate preview');
      } finally {
        setLoading(false);
      }
    };

    generatePreview();
  }, [shopSettings, templateId, shopSettingsService]);

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Generating preview...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer, style]}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorSubtext}>
          Please check your settings and try again
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>{t('shopSettings.preview')}</Text>
        <Text style={styles.previewSubtitle}>
          Live preview with your shop information
        </Text>
      </View>

      <View style={styles.previewWrapper}>
        <WebView
          source={{ html: previewHtml }}
          style={styles.webView}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          onError={(error) => {
            console.error('WebView error:', error);
            setError('Failed to display preview');
          }}
          onLoadStart={() => {
            // Optional: Show loading state when WebView starts loading
          }}
          onLoadEnd={() => {
            // Optional: Hide loading state when WebView finishes loading
          }}
          // Disable zoom and scaling
          injectedJavaScript={`
            const meta = document.createElement('meta');
            meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            meta.setAttribute('name', 'viewport');
            document.getElementsByTagName('head')[0].appendChild(meta);
            true;
          `}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontFamily: 'Inter-SemiBold',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  previewHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  previewWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 400,
  },
  webView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
