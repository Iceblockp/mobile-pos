import { useEffect } from 'react';
import { Stack } from 'expo-router';
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
import { ShopSettingsProvider } from '@/context/ShopSettingsContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { enableScreens, enableFreeze } from 'react-native-screens';

enableScreens(); // Enables native screens (required)
enableFreeze(); // Enables auto freeze on blur

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

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
          <ShopSettingsProvider>
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
          </ShopSettingsProvider>
        </DatabaseProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  );
}
