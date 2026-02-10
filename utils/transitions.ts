/**
 * Transition preset functions and utilities
 * Provides pre-configured transition animations for different navigation patterns
 */

import { Easing, Platform } from 'react-native';
import {
  CardStyleInterpolators,
  TransitionSpecs,
  StackNavigationOptions,
} from '@react-navigation/stack';
import { TransitionConfig, ScreenType } from '@/types/navigation';

/**
 * Horizontal slide transition for drawer pages
 * Slides new screen from right, previous screen to left
 */
export const horizontalSlideTransition: TransitionConfig = {
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 300,
        easing: Easing.in(Easing.cubic),
      },
    },
  },
  cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
  gestureEnabled: true,
  gestureDirection: 'horizontal',
};

/**
 * Modal presentation transition for detail/form pages
 * Slides new screen up from bottom
 */
export const modalPresentationTransition: TransitionConfig = {
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 300,
        easing: Easing.out(Easing.ease),
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 300,
        easing: Easing.in(Easing.ease),
      },
    },
  },
  cardStyleInterpolator: CardStyleInterpolators.forModalPresentationIOS,
  gestureEnabled: true,
  gestureDirection: 'vertical',
};

/**
 * Fade transition for specific screens
 * Crossfades between screens
 */
export const fadeTransition: TransitionConfig = {
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 250,
        easing: Easing.inOut(Easing.ease),
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 250,
        easing: Easing.inOut(Easing.ease),
      },
    },
  },
  cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
  gestureEnabled: false,
};

/**
 * Platform-specific default transition
 * Uses iOS-style on iOS, Android-style on Android
 */
export const platformDefaultTransition: TransitionConfig = {
  transitionSpec: {
    open:
      Platform.OS === 'ios'
        ? TransitionSpecs.TransitionIOSSpec
        : TransitionSpecs.FadeInFromBottomAndroidSpec,
    close:
      Platform.OS === 'ios'
        ? TransitionSpecs.TransitionIOSSpec
        : TransitionSpecs.FadeOutToBottomAndroidSpec,
  },
  cardStyleInterpolator:
    Platform.OS === 'ios'
      ? CardStyleInterpolators.forHorizontalIOS
      : CardStyleInterpolators.forFadeFromBottomAndroid,
  gestureEnabled: true,
  gestureDirection: 'horizontal',
};

/**
 * Get transition configuration based on screen type
 */
export function getTransitionForScreenType(
  screenType: ScreenType,
): TransitionConfig {
  switch (screenType) {
    case ScreenType.DRAWER_PAGE:
      return horizontalSlideTransition;
    case ScreenType.DETAIL_PAGE:
    case ScreenType.FORM_PAGE:
    case ScreenType.MODAL_PAGE:
      return modalPresentationTransition;
    default:
      return platformDefaultTransition;
  }
}

/**
 * Convert TransitionConfig to StackNavigationOptions
 */
export function transitionConfigToScreenOptions(
  config: TransitionConfig,
): Partial<StackNavigationOptions> {
  return {
    transitionSpec: config.transitionSpec,
    cardStyleInterpolator: config.cardStyleInterpolator,
    gestureEnabled: config.gestureEnabled,
    gestureDirection: config.gestureDirection,
  };
}
