import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  LayoutChangeEvent,
} from 'react-native';
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
  onLayout?: (event: LayoutChangeEvent) => void;
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
 * @param onLayout - Optional layout callback for position tracking
 */
export const DrawerMenuItem = React.memo(function DrawerMenuItem({
  item,
  currentRoute,
  onPress,
  style,
  onLayout,
}: DrawerMenuItemProps) {
  const router = useRouter();

  // Normalize routes for comparison
  // currentRoute might be "/sale-history" while item.route is "/(drawer)/sale-history"
  const normalizedCurrentRoute = currentRoute.startsWith('/(drawer)')
    ? currentRoute
    : `/(drawer)${currentRoute}`;
  const isActive = normalizedCurrentRoute === item.route;

  const Icon = item.icon;

  /**
   * Handle menu item press
   * Navigates to the route and closes the drawer
   */
  const handlePress = () => {
    try {
      router.push(item.route as any);
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
      onLayout={onLayout}
      accessibilityLabel={item.label}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <Icon size={22} color={isActive ? '#047857' : '#6B7280'} />
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
    backgroundColor: 'transparent',
  },
  menuItemActive: {
    backgroundColor: '#DCFCE7', // More prominent green background
    borderLeftWidth: 4, // Thicker border for better visibility
    borderLeftColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2, // Subtle elevation for Android
  },
  menuItemText: {
    fontSize: 15,
    fontFamily: 'NotoSansMyanmar-Regular',
    color: '#6B7280',
    flex: 1,
    marginLeft: 12,
  },
  menuItemTextActive: {
    color: '#047857', // Darker green for better contrast
    fontFamily: 'NotoSansMyanmar-Bold',
    fontWeight: '700', // Bolder text
  },
});
