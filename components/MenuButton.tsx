import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Menu } from 'lucide-react-native';

/**
 * MenuButton component props
 */
interface MenuButtonProps {
  onPress: () => void;
  style?: ViewStyle;
}

/**
 * MenuButton component
 * Hamburger menu button that appears in the top-left corner of pages
 * Opens the sidebar navigation when pressed
 *
 * Features:
 * - Hamburger icon (three horizontal lines)
 * - Minimum 44x44px touch target for accessibility
 * - Consistent styling with app design
 * - Proper accessibility labels for screen readers
 *
 * @param onPress - Callback function to open the drawer
 * @param style - Optional additional styles
 */
export function MenuButton({ onPress, style }: MenuButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.menuButton, style]}
      onPress={onPress}
      accessibilityLabel="Open navigation menu"
      accessibilityRole="button"
      accessibilityHint="Opens the sidebar navigation menu"
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Menu size={24} color="#111827" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
});
