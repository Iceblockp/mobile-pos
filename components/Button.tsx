import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  style,
  textStyle,
  disabled = false,
}) => {
  const buttonStyles = [
    styles.button,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primary: {
    backgroundColor: '#059669',
  },
  secondary: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  danger: {
    backgroundColor: '#EF4444',
  },
  disabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  small: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  medium: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  large: {
    paddingHorizontal: 28,
    paddingVertical: 18,
  },
  text: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 15,
  },
  primaryText: {
    color: '#FFFFFF',
  },
  secondaryText: {
    color: '#4B5563',
  },
  dangerText: {
    color: '#FFFFFF',
  },
  disabledText: {
    color: '#D1D5DB',
  },
  smallText: {
    fontSize: 13,
  },
  mediumText: {
    fontSize: 15,
  },
  largeText: {
    fontSize: 17,
  },
});