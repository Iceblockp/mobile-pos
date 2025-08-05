import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Globe, Check } from 'lucide-react-native';
import {
  useLocalization,
  LANGUAGE_OPTIONS,
} from '@/context/LocalizationContext';

export default function LanguageSettings() {
  const router = useRouter();
  const { language, setLanguage, t } = useLocalization();

  const handleLanguageChange = async (langCode: 'en' | 'my') => {
    await setLanguage(langCode);
  };

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
          <Text style={styles.title}>{t('languageSettings.title')}</Text>
          <Text style={styles.subtitle}>{t('languageSettings.subtitle')}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Language Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Globe size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>
              {t('languageSettings.currentLanguage')}
            </Text>
          </View>
          <Text style={styles.sectionDescription}>
            {t('languageSettings.selectLanguage')}
          </Text>
        </View>

        {/* Language Options */}
        <View style={styles.languageList}>
          {LANGUAGE_OPTIONS.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageOption,
                language === lang.code && styles.languageOptionActive,
              ]}
              onPress={() => handleLanguageChange(lang.code)}
              activeOpacity={0.7}
            >
              <View style={styles.languageInfo}>
                <Text style={styles.languageName}>{lang.nativeName}</Text>
                <Text style={styles.languageNameSecondary}>{lang.name}</Text>
              </View>
              {language === lang.code && (
                <View style={styles.checkContainer}>
                  <Check size={20} color="#10B981" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Information Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>
            {t('languageSettings.languageInfo')}
          </Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              {t('languageSettings.changesTakeEffect')}
            </Text>
            <Text style={styles.infoText}>
              {t('languageSettings.preferenceSaved')}
            </Text>
            <Text style={styles.infoText}>
              {t('languageSettings.allContentDisplayed')}
            </Text>
            <Text style={styles.infoText}>
              {t('languageSettings.numbersAdapt')}
            </Text>
          </View>
        </View>

        {/* Supported Languages */}
        <View style={styles.supportedSection}>
          <Text style={styles.supportedTitle}>
            {t('languageSettings.supportedLanguages')}
          </Text>
          <View style={styles.supportedList}>
            <View style={styles.supportedItem}>
              <Text style={styles.supportedFlag}>🇺🇸</Text>
              <Text style={styles.supportedName}>
                {t('languageSettings.english')}
              </Text>
            </View>
            <View style={styles.supportedItem}>
              <Text style={styles.supportedFlag}>🇲🇲</Text>
              <Text style={styles.supportedName}>
                {t('languageSettings.myanmar')}
              </Text>
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
  },
  languageList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  languageNameSecondary: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  checkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  supportedSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  supportedTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  supportedList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  supportedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  supportedFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  supportedName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#374151',
  },
});
