import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Slot, usePathname } from 'expo-router';
import { DrawerProvider } from '@/context/DrawerContext';
import { Sidebar } from '@/components/Sidebar';
import { useDrawer } from '@/context/DrawerContext';

/**
 * DrawerContent component
 * Renders the sidebar and screen content
 * Separated to allow useDrawer hook access within DrawerProvider
 */
function DrawerContent() {
  const { isOpen, closeDrawer } = useDrawer();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {/* Screen content */}
      <Slot />

      {/* Sidebar overlay */}
      <Sidebar isOpen={isOpen} onClose={closeDrawer} currentRoute={pathname} />
    </View>
  );
}

/**
 * DrawerLayout component
 * Main layout wrapper for drawer navigation
 * Wraps all drawer screens with DrawerProvider and renders Sidebar
 *
 * Requirements:
 * - 1.1: Navigation system displays Dashboard as default page
 * - 7.1: Sidebar navigation coexists with tab navigation during migration
 * - 7.2: Navigation system supports both patterns simultaneously
 */
export default function DrawerLayout() {
  return (
    <DrawerProvider>
      <DrawerContent />
    </DrawerProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
