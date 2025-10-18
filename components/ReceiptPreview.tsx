import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { WebView } from 'react-native-webview';
import { useTranslation } from '@/context/LocalizationContext';
import { ShopSettingsService } from '@/services/shopSettingsService';
import { ShopSettings } from '@/services/shopSettingsStorage';

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
  const [webViewHeight, setWebViewHeight] = useState<number>(500); // Dynamic height

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
      setWebViewHeight(500); // Reset to default height while loading

      try {
        // Use provided shop settings or create default sample settings
        const previewSettings = shopSettings || {
          shopName: 'Sample Shop',
          address: '123 Main Street, City',
          phone: '+95-9-123-456-789',
          logoPath: undefined, // No logo for sample
          receiptFooter: 'Thank you for your business!',
          thankYouMessage: 'Come again soon!',
          receiptTemplate: templateId,
          lastUpdated: new Date().toISOString(),
        };

        const html = await shopSettingsService.previewTemplate(
          templateId,
          previewSettings
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
        <Text style={styles.errorText} weight="medium">
          {error}
        </Text>
        <Text style={styles.errorSubtext}>
          Please check your settings and try again
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle} weight="medium">
          {t('shopSettings.preview')}
        </Text>
        <Text style={styles.previewSubtitle}>
          Live preview with your shop information
        </Text>
      </View>

      <View style={[styles.previewWrapper]}>
        <WebView
          source={{ html: previewHtml }}
          style={[styles.webView, { height: webViewHeight }]} // Dynamic height
          scrollEnabled={false} // Disable internal scrolling - let page handle it
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={false} // Prevent nested scroll conflicts
          onError={(error) => {
            console.error('WebView error:', error);
            setError('Failed to display preview');
          }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'contentHeight' && data.height) {
                // Update WebView height to match content
                const newHeight = Math.max(data.height + 20, 300); // Add padding, minimum 300px
                setWebViewHeight(newHeight);
              }
            } catch (error) {
              console.log('WebView message parsing error:', error);
            }
          }}
          // Auto-height JavaScript
          injectedJavaScript={`
            const meta = document.createElement('meta');
            meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            meta.setAttribute('name', 'viewport');
            document.getElementsByTagName('head')[0].appendChild(meta);
            
            // Prevent horizontal overflow
            document.body.style.overflowX = 'hidden';
            document.body.style.width = '100%';
            document.body.style.maxWidth = '100%';
            document.body.style.margin = '0';
            document.body.style.padding = '10px';
            
            // Ensure content fits
            const receipt = document.querySelector('.receipt');
            if (receipt) {
              receipt.style.maxWidth = '100%';
              receipt.style.overflow = 'hidden';
            }
            
            // Function to measure and send content height
            function sendContentHeight() {
              const height = Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
              );
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'contentHeight',
                height: height
              }));
            }
            
            // Send height when content loads
            window.addEventListener('load', () => {
              setTimeout(sendContentHeight, 100);
            });
            
            // Send height after DOM is ready
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', () => {
                setTimeout(sendContentHeight, 100);
              });
            } else {
              setTimeout(sendContentHeight, 100);
            }
            
            // Fallback - send height after a delay
            setTimeout(sendContentHeight, 500);
            
            true;
          `}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%', // Ensure full width
    // Allow natural height sizing
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
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  previewHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  previewWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%', // Ensure full width
    // Height will be determined by WebView content
  },
  webView: {
    backgroundColor: '#FFFFFF',
    width: '100%', // Prevent horizontal overflow
    // Height will be set dynamically via style prop based on content
  },
});
