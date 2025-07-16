import React from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import {
  useLocalization,
  LANGUAGE_OPTIONS,
} from '@/context/LocalizationContext';
import { Globe } from 'lucide-react-native';

interface LanguageIconButtonProps {
  style?: any;
  size?: number;
  showFlag?: boolean;
}

export const LanguageIconButton: React.FC<LanguageIconButtonProps> = ({
  style,
  size = 20,
  showFlag = true,
}) => {
  const { language, setLanguage } = useLocalization();

  const currentLanguage = LANGUAGE_OPTIONS.find(
    (lang) => lang.code === language
  );
  const nextLanguage = LANGUAGE_OPTIONS.find((lang) => lang.code !== language);

  const handleToggleLanguage = async () => {
    if (nextLanguage) {
      await setLanguage(nextLanguage.code);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.iconButton, style]}
      onPress={handleToggleLanguage}
      activeOpacity={0.7}
    >
      {showFlag ? (
        <View style={styles.flagContainer}>
          <Text style={[styles.flagText, { fontSize: size * 0.8 }]}>
            {currentLanguage?.flag}
          </Text>
        </View>
      ) : (
        <Globe size={size} color="#6B7280" />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagText: {
    fontSize: 16,
  },
});
