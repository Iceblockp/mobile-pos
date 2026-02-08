/**
 * Deep Linking Utilities
 *
 * Provides utilities for handling deep links in the drawer navigation system.
 * Expo Router automatically handles deep linking based on file structure,
 * but these utilities help with programmatic navigation and link generation.
 *
 * Requirements:
 * - 7.4: Ensure deep links work with new drawer routes
 */

import { router } from 'expo-router';
import { migrateRoute, isValidDrawerRoute } from './routeMigration';

/**
 * Deep link configuration for the app
 * Maps URL paths to drawer routes
 */
export const DEEP_LINK_CONFIG = {
  scheme: 'pos',
  prefixes: ['pos://', 'https://pos.app'],
  config: {
    screens: {
      index: '',
      '(drawer)': {
        screens: {
          dashboard: 'dashboard',
          sale: 'sale',
          'sale-history': 'sale-history',
          'product-management': 'products',
          'movement-history': 'movements',
          'low-stock': 'low-stock',
          overview: 'overview',
          'customer-analytics': 'customer-analytics',
          'ai-analytics': 'ai-analytics',
          'customer-management': 'customers',
          'supplier-management': 'suppliers',
          expenses: 'expenses',
          'shop-settings': 'settings',
          'license-management': 'license',
          'language-settings': 'language',
          'data-export': 'export',
          'data-import': 'import',
        },
      },
      '(tabs)': {
        screens: {
          dashboard: 'tabs/dashboard',
          sales: 'tabs/sales',
          inventory: 'tabs/inventory',
          reports: 'tabs/reports',
          more: 'tabs/more',
        },
      },
    },
  },
};

/**
 * Generates a deep link URL for a given route
 *
 * @param route - The app route (e.g., '/(drawer)/dashboard')
 * @param params - Optional query parameters
 * @returns The deep link URL
 *
 * @example
 * generateDeepLink('/(drawer)/dashboard') // Returns 'pos://dashboard'
 * generateDeepLink('/(drawer)/sale-history', { date: '2024-01-01' }) // Returns 'pos://sale-history?date=2024-01-01'
 */
export function generateDeepLink(
  route: string,
  params?: Record<string, string>,
): string {
  // Extract the screen name from the route
  const screenName = route.split('/').pop() || '';

  // Build the base URL
  let url = `${DEEP_LINK_CONFIG.scheme}://${screenName}`;

  // Add query parameters if provided
  if (params && Object.keys(params).length > 0) {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    url += `?${queryString}`;
  }

  return url;
}

/**
 * Handles navigation from a deep link
 * Supports both old tab routes and new drawer routes
 *
 * @param url - The deep link URL
 * @returns True if navigation was successful
 *
 * @example
 * handleDeepLink('pos://dashboard') // Navigates to dashboard
 * handleDeepLink('pos://tabs/sales') // Migrates to drawer and navigates
 */
export function handleDeepLink(url: string): boolean {
  try {
    // Parse the URL
    const urlObj = new URL(url);
    const path = urlObj.pathname.replace(/^\//, '');

    // Check if it's a tab route that needs migration
    if (path.startsWith('tabs/')) {
      const tabRoute = `/(tabs)/${path.replace('tabs/', '')}`;
      const drawerRoute = migrateRoute(tabRoute);
      router.push(drawerRoute as any);
      return true;
    }

    // Handle drawer routes
    const drawerRoute = `/(drawer)/${path}`;
    if (isValidDrawerRoute(drawerRoute)) {
      router.push(drawerRoute as any);
      return true;
    }

    // Fallback to dashboard if route is invalid
    console.warn(`Invalid deep link route: ${path}, redirecting to dashboard`);
    router.push('/(drawer)/dashboard');
    return false;
  } catch (error) {
    console.error('Error handling deep link:', error);
    return false;
  }
}

/**
 * Parses query parameters from a deep link URL
 *
 * @param url - The deep link URL
 * @returns Object containing query parameters
 *
 * @example
 * parseDeepLinkParams('pos://sale-history?date=2024-01-01')
 * // Returns { date: '2024-01-01' }
 */
export function parseDeepLinkParams(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url);
    const params: Record<string, string> = {};

    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });

    return params;
  } catch (error) {
    console.error('Error parsing deep link params:', error);
    return {};
  }
}

/**
 * Validates if a deep link URL is valid for the app
 *
 * @param url - The deep link URL to validate
 * @returns True if the URL is valid
 *
 * @example
 * isValidDeepLink('pos://dashboard') // Returns true
 * isValidDeepLink('https://example.com') // Returns false
 */
export function isValidDeepLink(url: string): boolean {
  try {
    const urlObj = new URL(url);

    // Check if scheme matches
    if (urlObj.protocol.replace(':', '') !== DEEP_LINK_CONFIG.scheme) {
      return false;
    }

    // Check if path is valid
    const path = urlObj.pathname.replace(/^\//, '');
    const drawerRoute = `/(drawer)/${path}`;

    return isValidDrawerRoute(drawerRoute);
  } catch (error) {
    return false;
  }
}

/**
 * Gets the current route from a deep link URL
 *
 * @param url - The deep link URL
 * @returns The app route path
 *
 * @example
 * getRouteFromDeepLink('pos://dashboard') // Returns '/(drawer)/dashboard'
 */
export function getRouteFromDeepLink(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.replace(/^\//, '');

    // Handle tab routes
    if (path.startsWith('tabs/')) {
      const tabRoute = `/(tabs)/${path.replace('tabs/', '')}`;
      return migrateRoute(tabRoute);
    }

    // Handle drawer routes
    return `/(drawer)/${path}`;
  } catch (error) {
    console.error('Error getting route from deep link:', error);
    return null;
  }
}

/**
 * Shares a deep link for a specific route
 * Useful for sharing specific app screens
 *
 * @param route - The app route to share
 * @param params - Optional query parameters
 * @returns The shareable deep link URL
 *
 * @example
 * shareDeepLink('/(drawer)/sale-history', { date: '2024-01-01' })
 * // Returns 'pos://sale-history?date=2024-01-01'
 */
export function shareDeepLink(
  route: string,
  params?: Record<string, string>,
): string {
  return generateDeepLink(route, params);
}
