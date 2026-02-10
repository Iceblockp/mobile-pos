/**
 * Screen options configuration for Stack Navigator
 * Provides pre-configured screen options for different navigation patterns
 *
 * Note: expo-router uses @react-navigation/native-stack which has different
 * options than @react-navigation/stack. We use the native stack options here.
 */

import { Platform } from 'react-native';

/**
 * Global default screen options for all screens
 * Applied to Stack.Navigator screenOptions prop
 */
export const defaultScreenOptions = {
  headerShown: false,
  // Native stack animation options
  animation: Platform.OS === 'ios' ? 'default' : 'fade_from_bottom',
  // Enable gestures
  gestureEnabled: true,
  // Animation duration
  animationDuration: 300,
} as const;

/**
 * Screen options for detail/form pages
 * Applied to individual Stack.Screen options prop
 */
export const detailScreenOptions = {
  headerShown: false,
  // Modal presentation for detail/form screens
  presentation: Platform.OS === 'ios' ? 'modal' : 'card',
  animation: Platform.OS === 'ios' ? 'slide_from_bottom' : 'fade_from_bottom',
  // Enable gestures for modal dismissal
  gestureEnabled: true,
  gestureDirection: 'vertical',
  // Animation duration
  animationDuration: 300,
} as const;

/**
 * Screen options for drawer pages
 * Applied to drawer layout and its children
 */
export const drawerScreenOptions = {
  headerShown: false,
  animation: Platform.OS === 'ios' ? 'slide_from_right' : 'fade_from_bottom',
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  animationDuration: 300,
} as const;
