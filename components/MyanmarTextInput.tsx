import React from 'react';
import { TextInput, TextInputProps, Platform } from 'react-native';

interface MyanmarTextInputProps extends TextInputProps {
  weight?: 'regular' | 'medium' | 'bold';
}

export const MyanmarTextInput: React.FC<MyanmarTextInputProps> = ({
  style,
  weight = 'regular',
  ...props
}) => {
  const getFontFamily = () => {
    switch (weight) {
      case 'bold':
        return 'NotoSansMyanmar-Bold';
      case 'medium':
        return 'NotoSansMyanmar-Medium';
      default:
        return 'NotoSansMyanmar-Regular';
    }
  };

  const myanmarInputStyle = {
    fontFamily: getFontFamily(),
    fontWeight: Platform.select({
      ios: 'normal' as const,
      android:
        weight === 'bold'
          ? ('700' as const)
          : weight === 'medium'
          ? ('500' as const)
          : ('400' as const),
      default: 'normal' as const,
    }),
    // Ensure proper text rendering for TextInput
    includeFontPadding: Platform.OS === 'android' ? true : false,
    textAlignVertical:
      Platform.OS === 'android' ? ('center' as const) : ('auto' as const),
    // Add some padding for better Myanmar text display
    paddingVertical: Platform.select({
      ios: 12,
      android: 8,
      default: 10,
    }),
    // Ensure consistent line height for Myanmar text
    lineHeight: Platform.select({
      ios: undefined, // Let iOS handle naturally
      android: undefined, // Let Android handle naturally
      default: undefined,
    }),
  };

  return (
    <TextInput
      {...props}
      style={[myanmarInputStyle, style]}
      allowFontScaling={false}
      // Ensure proper text input behavior for Myanmar
      autoCorrect={false}
      autoCapitalize="none"
      // Better placeholder handling for Myanmar text
      placeholderTextColor={props.placeholderTextColor || '#9CA3AF'}
    />
  );
};
