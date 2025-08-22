import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Check, Eye } from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { useToast } from '@/context/ToastContext';
import { ShopSettingsService } from '@/services/shopSettingsService';
import { ReceiptTemplate } from '@/services/templateEngine';
import { ShopSettings } from '@/services/shopSettingsStorage';

interface ReceiptTemplateSelectorProps {
  selectedTemplate: string;
  onTemplateChange: (templateId: string) => void;
  shopSettingsService: ShopSettingsService;
  shopSettings?: ShopSettings | null;
}

const { width: screenWidth } = Dimensions.get('window');
const previewWidth = Math.min(screenWidth - 80, 320);

export const ReceiptTemplateSelector: React.FC<
  ReceiptTemplateSelectorProps
> = ({
  selectedTemplate,
  onTemplateChange,
  shopSettingsService,
  shopSettings,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [templates, setTemplates] = useState<ReceiptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewHtml, setPreviewHtml] = useState<{ [key: string]: string }>({});
  const [previewLoading, setPreviewLoading] = useState<{
    [key: string]: boolean;
  }>({});
  const [expandedPreview, setExpandedPreview] = useState<string | null>(null);

  // Load available templates
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const availableTemplates = shopSettingsService.getAvailableTemplates();
        setTemplates(availableTemplates);

        // Generate previews for all templates
        const previews: { [key: string]: string } = {};
        const loadingStates: { [key: string]: boolean } = {};

        for (const template of availableTemplates) {
          loadingStates[template.id] = true;
        }
        setPreviewLoading(loadingStates);

        // Generate previews asynchronously
        for (const template of availableTemplates) {
          try {
            const html = await shopSettingsService.previewTemplate(
              template.id,
              shopSettings || undefined
            );
            previews[template.id] = html;
            setPreviewHtml((prev) => ({ ...prev, [template.id]: html }));
          } catch (error) {
            console.error(
              `Failed to generate preview for ${template.id}:`,
              error
            );
          } finally {
            setPreviewLoading((prev) => ({ ...prev, [template.id]: false }));
          }
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
        showToast('Failed to load receipt templates', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [shopSettingsService, shopSettings, showToast]);

  const handleTemplateSelect = (templateId: string) => {
    onTemplateChange(templateId);
  };

  const togglePreview = (templateId: string) => {
    setExpandedPreview(expandedPreview === templateId ? null : templateId);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('shopSettings.template')}</Text>
      <Text style={styles.sectionSubtitle}>
        Choose a receipt template that matches your business style
      </Text>

      <ScrollView
        style={styles.templatesContainer}
        showsVerticalScrollIndicator={false}
      >
        {templates.map((template) => (
          <View key={template.id} style={styles.templateCard}>
            {/* Template Header */}
            <TouchableOpacity
              style={[
                styles.templateHeader,
                selectedTemplate === template.id &&
                  styles.templateHeaderSelected,
              ]}
              onPress={() => handleTemplateSelect(template.id)}
            >
              <View style={styles.templateInfo}>
                <View style={styles.templateTitleRow}>
                  <Text style={styles.templateName}>
                    {t(`shopSettings.templates.${template.id}`) ||
                      template.name}
                  </Text>
                  {selectedTemplate === template.id && (
                    <View style={styles.selectedBadge}>
                      <Check size={16} color="#FFFFFF" />
                    </View>
                  )}
                </View>
                <Text style={styles.templateDescription}>
                  {template.description}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Preview Toggle */}
            <TouchableOpacity
              style={styles.previewToggle}
              onPress={() => togglePreview(template.id)}
            >
              <Eye size={16} color="#059669" />
              <Text style={styles.previewToggleText}>
                {expandedPreview === template.id
                  ? 'Hide Preview'
                  : 'Show Preview'}
              </Text>
            </TouchableOpacity>

            {/* Preview Section */}
            {expandedPreview === template.id && (
              <View style={styles.previewContainer}>
                {previewLoading[template.id] ? (
                  <View style={styles.previewLoading}>
                    <ActivityIndicator size="small" color="#059669" />
                    <Text style={styles.previewLoadingText}>
                      Generating preview...
                    </Text>
                  </View>
                ) : previewHtml[template.id] ? (
                  <View
                    style={[styles.previewWrapper, { width: previewWidth }]}
                  >
                    <WebView
                      source={{ html: previewHtml[template.id] }}
                      style={styles.previewWebView}
                      scrollEnabled={true}
                      showsVerticalScrollIndicator={false}
                      showsHorizontalScrollIndicator={false}
                      onError={(error) => {
                        console.error('WebView error:', error);
                      }}
                    />
                  </View>
                ) : (
                  <View style={styles.previewError}>
                    <Text style={styles.previewErrorText}>
                      Failed to load preview
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Selected Template Info */}
      <View style={styles.selectedInfo}>
        <Text style={styles.selectedInfoText}>
          Selected:{' '}
          {t(`shopSettings.templates.${selectedTemplate}`) ||
            templates.find((t) => t.id === selectedTemplate)?.name ||
            'None'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  templatesContainer: {
    flex: 1,
  },
  templateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  templateHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  templateHeaderSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#059669',
  },
  templateInfo: {
    flex: 1,
  },
  templateTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  templateName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  selectedBadge: {
    backgroundColor: '#059669',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  previewToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  previewToggleText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#059669',
    marginLeft: 8,
  },
  previewContainer: {
    backgroundColor: '#F9FAFB',
  },
  previewLoading: {
    padding: 40,
    alignItems: 'center',
  },
  previewLoadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Inter-Regular',
  },
  previewWrapper: {
    height: 400,
    margin: 16,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewWebView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  previewError: {
    padding: 40,
    alignItems: 'center',
  },
  previewErrorText: {
    fontSize: 14,
    color: '#EF4444',
    fontFamily: 'Inter-Regular',
  },
  selectedInfo: {
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  selectedInfoText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
    textAlign: 'center',
  },
});
