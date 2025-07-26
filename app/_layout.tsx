import { useEffect, useState } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SplashScreen } from 'expo-router';
import { DatabaseProvider } from '@/context/DatabaseContext';
import { ToastProvider } from '@/context/ToastContext';
import { LocalizationProvider } from '@/context/LocalizationContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  const pathname = usePathname();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LocalizationProvider>
        <DatabaseProvider>
          <ToastProvider>
            <SafeAreaProvider>
              <SafeAreaView style={{ flex: 1 }}>
                <Stack screenOptions={{ headerShown: false }}>
                  {/* <Stack.Screen name="index" /> */}
                  <Stack.Screen
                    name="(tabs)"
                    options={{
                      headerShown: false,
                      statusBarStyle: 'dark',
                      statusBarBackgroundColor: 'white',
                    }}
                  />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" />
              </SafeAreaView>
            </SafeAreaProvider>
          </ToastProvider>
        </DatabaseProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  );
}
