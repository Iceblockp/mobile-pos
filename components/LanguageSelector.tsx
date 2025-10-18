import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import {
  useLocalization,
  LANGUAGE_OPTIONS,
} from '@/context/LocalizationContext';
import { Globe, Check, X } from 'lucide-react-native';

interface LanguageSelectorProps {
  showLabel?: boolean;
  style?: any;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  showLabel = true,
  style,
}) => {
  const { language, setLanguage, t } = useLocalization();
  const [showModal, setShowModal] = useState(false);

  const currentLanguage = LANGUAGE_OPTIONS.find(
    (lang) => lang.code === language
  );

  const handleLanguageChange = async (langCode: 'en' | 'my') => {
    await setLanguage(langCode);
    setShowModal(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.languageButton, style]}
        onPress={() => setShowModal(true)}
      >
        <Globe size={20} color="#6B7280" />
        {showLabel && (
          <Text style={styles.languageButtonText} weight="medium">
            {currentLanguage?.nativeName}
          </Text>
        )}
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} weight="medium">
              Select Language
            </Text>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.languageList}>
            {LANGUAGE_OPTIONS.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageOption,
                  language === lang.code && styles.languageOptionActive,
                ]}
                onPress={() => handleLanguageChange(lang.code)}
              >
                <View style={styles.languageInfo}>
                  <Text style={styles.languageName} weight="medium">
                    {lang.nativeName}
                  </Text>
                  <Text style={styles.languageNameSecondary}>{lang.name}</Text>
                </View>
                {language === lang.code && <Check size={20} color="#10B981" />}
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalFooter}>
            <Text style={styles.footerText}>
              Language preference will be saved automatically
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  languageButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  languageList: {
    flex: 1,
    padding: 20,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionActive: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    color: '#111827',
  },
  languageNameSecondary: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  modalFooter: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
