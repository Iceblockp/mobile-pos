import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * Menu item type definition
 */
export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  route: string;
}

/**
 * DrawerMenuItem component props
 */
interface DrawerMenuItemProps {
  item: MenuItem;
  currentRoute: string;
  onPress: () => void;
  style?: ViewStyle;
}

/**
 * DrawerMenuItem component
 * Renders individual menu items in a flat structure without nesting
 * Handles navigation and active state highlighting
 * Optimized with React.memo to prevent unnecessary re-renders (Requirement 8.4)
 *
 * @param item - Menu item configuration
 * @param currentRoute - Current active route
 * @param onPress - Callback to close drawer after navigation
 * @param style - Optional additional styles
 */
export const DrawerMenuItem = React.memo(function DrawerMenuItem({
  item,
  currentRoute,
  onPress,
  style,
}: DrawerMenuItemProps) {
  const router = useRouter();
  const isActive = currentRoute === item.route;
  const Icon = item.icon;

  /**
   * Handle menu item press
   * Navigates to the route and closes the drawer
   */
  const handlePress = () => {
    try {
      router.push(item.route);
      onPress();
    } catch (error) {
      console.error('Navigation error:', error);
      // If navigation fails, still close the drawer
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.menuItem, isActive && styles.menuItemActive, style]}
      onPress={handlePress}
      accessibilityLabel={item.label}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <Icon size={20} color={isActive ? '#059669' : '#6B7280'} />
      <Text
        style={[styles.menuItemText, isActive && styles.menuItemTextActive]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
    minHeight: 44, // Minimum touch target size for accessibility
  },
  menuItemActive: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: 'NotoSansMyanmar-Regular',
    color: '#6B7280',
    flex: 1,
    marginLeft: 12,
  },
  menuItemTextActive: {
    color: '#059669',
    fontFamily: 'NotoSansMyanmar-Medium',
    fontWeight: '600',
  },
});
