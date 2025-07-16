import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation objects
import { en, type TranslationKeys } from '@/locales/en';
import { my } from '@/locales/my';

type Language = 'en' | 'my';

interface LocalizationContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
}

const translations = {
  en,
  my,
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(
  undefined
);

const STORAGE_KEY = '@mobile_pos_language';

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setCurrentLanguage] = useState<Language>('en');

  // Load saved language on app start
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'my')) {
        setCurrentLanguage(savedLanguage as Language);
      }
    } catch (error) {
      console.error('Error loading saved language:', error);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
      setCurrentLanguage(lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  // Translation function with nested key support and parameter interpolation
  const t = (key: string, params?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found in current language
        value = translations.en;
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey];
          } else {
            console.warn(`Translation key not found: ${key}`);
            return key; // Return the key itself if translation not found
          }
        }
        break;
      }
    }

    // Handle function-based translations (for dynamic messages)
    if (typeof value === 'function') {
      if (params) {
        // Extract parameter values in order for function calls
        const paramValues = Object.values(params);
        return value(...paramValues);
      } else {
        console.warn(
          `Function-based translation requires parameters for key: ${key}`
        );
        return key;
      }
    }

    if (typeof value !== 'string') {
      console.warn(
        `Translation value is not a string or function for key: ${key}`
      );
      return key;
    }

    // Handle parameter interpolation for string-based translations
    if (params) {
      return value.replace(/\{\{(\w+)\}\}/g, (match, paramKey) => {
        return params[paramKey]?.toString() || match;
      });
    }

    return value;
  };

  // Myanmar is not RTL, but keeping this for future language support
  const isRTL = false;

  const value: LocalizationContextType = {
    language,
    setLanguage,
    t,
    isRTL,
  };

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export const useLocalization = (): LocalizationContextType => {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error(
      'useLocalization must be used within a LocalizationProvider'
    );
  }
  return context;
};

// Helper hook for easier usage
export const useTranslation = () => {
  const { t } = useLocalization();
  return { t };
};

// Language options for UI
export const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'my', name: 'Myanmar', nativeName: 'မြန်မာ', flag: '🇲🇲' },
] as const;
