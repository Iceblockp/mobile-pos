/**
 * Route Migration Utilities
 *
 * Provides mapping and helper functions for migrating from tab-based navigation
 * to drawer-based navigation. Supports backward compatibility during transition.
 *
 * Requirements:
 * - 7.1: Map old tab routes to new drawer routes
 * - 7.2: Support both navigation patterns simultaneously
 * - 7.3: Maintain existing routing structure during transition
 */

/**
 * Route migration map
 * Maps old tab-based routes to new drawer-based routes
 */
export const ROUTE_MIGRATION_MAP: Record<string, string> = {
  // Tab routes to drawer routes
  '/(tabs)/dashboard': '/(drawer)/dashboard',
  '/(tabs)/sales': '/(drawer)/sale',
  '/(tabs)/inventory': '/(drawer)/product-management',
  '/(tabs)/reports': '/(drawer)/overview',
  '/(tabs)/more': '/(drawer)/customer-management',

  // Direct tab routes (without group prefix)
  '/dashboard': '/(drawer)/dashboard',
  '/sales': '/(drawer)/sale',
  '/inventory': '/(drawer)/product-management',
  '/reports': '/(drawer)/overview',
  '/more': '/(drawer)/customer-management',

  // Specific feature routes from tabs
  sales: '/(drawer)/sale',
  inventory: '/(drawer)/product-management',
  reports: '/(drawer)/overview',
  dashboard: '/(drawer)/dashboard',
  more: '/(drawer)/customer-management',
};

/**
 * Reverse route migration map
 * Maps drawer routes back to tab routes for backward compatibility
 */
export const REVERSE_ROUTE_MIGRATION_MAP: Record<string, string> = {
  '/(drawer)/dashboard': '/(tabs)/dashboard',
  '/(drawer)/sale': '/(tabs)/sales',
  '/(drawer)/product-management': '/(tabs)/inventory',
  '/(drawer)/movement-history': '/(tabs)/inventory',
  '/(drawer)/low-stock': '/(tabs)/inventory',
  '/(drawer)/overview': '/(tabs)/reports',
  '/(drawer)/customer-analytics': '/(tabs)/reports',
  '/(drawer)/ai-analytics': '/(tabs)/reports',
  '/(drawer)/customer-management': '/(tabs)/more',
  '/(drawer)/supplier-management': '/(tabs)/more',
  '/(drawer)/expenses': '/(tabs)/more',
  '/(drawer)/shop-settings': '/(tabs)/more',
  '/(drawer)/license-management': '/(tabs)/more',
  '/(drawer)/language-settings': '/(tabs)/more',
  '/(drawer)/data-export': '/(tabs)/more',
  '/(drawer)/data-import': '/(tabs)/more',
  '/(drawer)/sale-history': '/(tabs)/sales',
};

/**
 * Migrates a route from old tab-based format to new drawer-based format
 *
 * @param oldRoute - The old tab-based route
 * @returns The new drawer-based route, or the original route if no mapping exists
 *
 * @example
 * migrateRoute('/(tabs)/dashboard') // Returns '/(drawer)/dashboard'
 * migrateRoute('/sales') // Returns '/(drawer)/sale'
 * migrateRoute('/unknown') // Returns '/unknown'
 */
export function migrateRoute(oldRoute: string): string {
  // Check if route exists in migration map
  if (ROUTE_MIGRATION_MAP[oldRoute]) {
    return ROUTE_MIGRATION_MAP[oldRoute];
  }

  // Return original route if no mapping exists
  return oldRoute;
}

/**
 * Migrates a route from drawer-based format back to tab-based format
 * Useful for backward compatibility scenarios
 *
 * @param drawerRoute - The drawer-based route
 * @returns The tab-based route, or the original route if no mapping exists
 *
 * @example
 * reverseRouteMapping('/(drawer)/dashboard') // Returns '/(tabs)/dashboard'
 * reverseRouteMapping('/(drawer)/sale-history') // Returns '/(tabs)/sales'
 */
export function reverseRouteMapping(drawerRoute: string): string {
  // Check if route exists in reverse migration map
  if (REVERSE_ROUTE_MIGRATION_MAP[drawerRoute]) {
    return REVERSE_ROUTE_MIGRATION_MAP[drawerRoute];
  }

  // Return original route if no mapping exists
  return drawerRoute;
}

/**
 * Checks if a route is a tab-based route
 *
 * @param route - The route to check
 * @returns True if the route is a tab-based route
 *
 * @example
 * isTabRoute('/(tabs)/dashboard') // Returns true
 * isTabRoute('/(drawer)/dashboard') // Returns false
 */
export function isTabRoute(route: string): boolean {
  return (
    route.includes('/(tabs)/') ||
    (route.startsWith('/') && !route.includes('/(drawer)/'))
  );
}

/**
 * Checks if a route is a drawer-based route
 *
 * @param route - The route to check
 * @returns True if the route is a drawer-based route
 *
 * @example
 * isDrawerRoute('/(drawer)/dashboard') // Returns true
 * isDrawerRoute('/(tabs)/dashboard') // Returns false
 */
export function isDrawerRoute(route: string): boolean {
  return route.includes('/(drawer)/');
}

/**
 * Normalizes a route by removing group prefixes and leading slashes
 * Useful for comparing routes regardless of their navigation pattern
 *
 * @param route - The route to normalize
 * @returns The normalized route name
 *
 * @example
 * normalizeRoute('/(tabs)/dashboard') // Returns 'dashboard'
 * normalizeRoute('/(drawer)/sale') // Returns 'sale'
 * normalizeRoute('/dashboard') // Returns 'dashboard'
 */
export function normalizeRoute(route: string): string {
  return route
    .replace(/\/\(tabs\)\//, '')
    .replace(/\/\(drawer\)\//, '')
    .replace(/^\//, '');
}

/**
 * Checks if two routes are equivalent (point to the same feature)
 * regardless of their navigation pattern
 *
 * @param route1 - First route to compare
 * @param route2 - Second route to compare
 * @returns True if routes are equivalent
 *
 * @example
 * areRoutesEquivalent('/(tabs)/dashboard', '/(drawer)/dashboard') // Returns true
 * areRoutesEquivalent('/sales', '/(drawer)/sale') // Returns true
 */
export function areRoutesEquivalent(route1: string, route2: string): boolean {
  // Direct comparison
  if (route1 === route2) {
    return true;
  }

  // Check if one is the migrated version of the other
  if (migrateRoute(route1) === route2 || migrateRoute(route2) === route1) {
    return true;
  }

  // Check reverse mapping
  if (
    reverseRouteMapping(route1) === route2 ||
    reverseRouteMapping(route2) === route1
  ) {
    return true;
  }

  // Normalize and compare
  const normalized1 = normalizeRoute(route1);
  const normalized2 = normalizeRoute(route2);

  return normalized1 === normalized2;
}

/**
 * Gets all available drawer routes
 *
 * @returns Array of all drawer route paths
 */
export function getAllDrawerRoutes(): string[] {
  return [
    '/(drawer)/dashboard',
    '/(drawer)/sale',
    '/(drawer)/sale-history',
    '/(drawer)/product-management',
    '/(drawer)/movement-history',
    '/(drawer)/low-stock',
    '/(drawer)/overview',
    '/(drawer)/customer-analytics',
    '/(drawer)/ai-analytics',
    '/(drawer)/customer-management',
    '/(drawer)/supplier-management',
    '/(drawer)/expenses',
    '/(drawer)/shop-settings',
    '/(drawer)/license-management',
    '/(drawer)/language-settings',
    '/(drawer)/data-export',
    '/(drawer)/data-import',
  ];
}

/**
 * Validates if a route exists in the drawer navigation system
 *
 * @param route - The route to validate
 * @returns True if the route exists in drawer navigation
 */
export function isValidDrawerRoute(route: string): boolean {
  const allRoutes = getAllDrawerRoutes();
  return allRoutes.includes(route);
}

/**
 * Gets the corresponding tab route for a drawer route
 * Useful for maintaining tab bar state during migration
 *
 * @param drawerRoute - The drawer route
 * @returns The corresponding tab route or null if no mapping exists
 */
export function getCorrespondingTabRoute(drawerRoute: string): string | null {
  return REVERSE_ROUTE_MIGRATION_MAP[drawerRoute] || null;
}
