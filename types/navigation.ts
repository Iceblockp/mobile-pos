/**
 * Navigation transition configuration types
 * Defines TypeScript interfaces for configuring smooth page transitions
 */

/**
 * Transition timing configuration
 */
export interface TransitionTiming {
  duration: number;
  easing: (value: number) => number;
}

/**
 * Transition specification for open/close animations
 */
export interface TransitionSpec {
  animation: 'spring' | 'timing';
  config: {
    duration?: number;
    easing?: (value: number) => number;
    stiffness?: number;
    damping?: number;
    mass?: number;
  };
}

/**
 * Complete transition configuration
 */
export interface TransitionConfig {
  transitionSpec: {
    open: TransitionSpec;
    close: TransitionSpec;
  };
  cardStyleInterpolator: (props: any) => any;
  gestureEnabled?: boolean;
  gestureDirection?: 'horizontal' | 'vertical';
}

/**
 * Screen type enum for determining transition style
 */
export enum ScreenType {
  DRAWER_PAGE = 'drawer_page',
  DETAIL_PAGE = 'detail_page',
  FORM_PAGE = 'form_page',
  MODAL_PAGE = 'modal_page',
}
