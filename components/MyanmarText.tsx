import React from 'react';
import { Text, TextProps, Platform } from 'react-native';

interface MyanmarTextProps extends TextProps {
  children: React.ReactNode;
  weight?: 'regular' | 'medium' | 'bold';
}

export const MyanmarText: React.FC<MyanmarTextProps> = ({
  children,
  style,
  weight = 'regular',
  ...props
}) => {
  const getFontFamily = () => {
    // const baseFamily = Platform.select({
    //   ios: 'NotoSansMyanmar',
    //   android: 'NotoSansMyanmar',
    //   default: 'NotoSansMyanmar',
    // });

    // return 'Padauk-Bold';

    switch (weight) {
      case 'bold':
        return 'NotoSansMyanmar-Bold';
      case 'medium':
        return 'NotoSansMyanmar-Medium';
      default:
        return 'NotoSansMyanmar-Regular';
    }
  };

  const myanmarStyle = {
    fontFamily: getFontFamily(),
    // fontWeight: Platform.select({
    //   ios: 'normal' as const,
    //   android:
    //     weight === 'bold'
    //       ? ('700' as const)
    //       : weight === 'medium'
    //       ? ('500' as const)
    //       : ('400' as const),
    //   default: 'normal' as const,
    // }),
    // Ensure proper text rendering
    includeFontPadding: Platform.OS === 'android' ? true : false,
    // textAlignVertical:
    //   Platform.OS === 'android' ? ('center' as const) : undefined,
    // ...(weight === 'bold' ? { lineHeight: 28 } : {}),
  };

  return (
    <Text {...props} style={[myanmarStyle, style]} allowFontScaling={false}>
      {children}
    </Text>
  );
};
