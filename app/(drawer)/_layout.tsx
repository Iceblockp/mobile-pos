import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { DrawerProvider } from '@/context/DrawerContext';
import { Sidebar } from '@/components/Sidebar';
import { useDrawer } from '@/context/DrawerContext';
import { detailScreenOptions } from '@/config/screenOptions';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * DrawerContent component
 * Renders the sidebar and screen content with Stack navigation
 * Separated to allow useDrawer hook access within DrawerProvider
 */
function DrawerContent() {
  const { isOpen, closeDrawer } = useDrawer();
  const pathname = usePathname();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Screen content with Stack navigation */}
      <Stack screenOptions={{ headerShown: false }}>
        {/* Detail and form screens with modal presentation */}
        <Stack.Screen name="product-detail" options={detailScreenOptions} />
        <Stack.Screen name="product-form" options={detailScreenOptions} />
      </Stack>

      {/* Sidebar overlay */}
      <Sidebar isOpen={isOpen} onClose={closeDrawer} currentRoute={pathname} />
    </SafeAreaView>
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
