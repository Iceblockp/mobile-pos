import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import {
  Text as RNText,
  TextInput as RNTextInput,
  Platform,
} from 'react-native';
import { SplashScreen } from 'expo-router';
import { DatabaseProvider } from '@/context/DatabaseContext';
import { MigrationProvider } from '@/context/MigrationContext';
import { ToastProvider } from '@/context/ToastContext';
import { LocalizationProvider } from '@/context/LocalizationContext';
import { ShopSettingsProvider } from '@/context/ShopSettingsContext';
import { CurrencyProvider } from '@/context/CurrencyContext';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { enableScreens, enableFreeze } from 'react-native-screens';

// enableScreens(); // Enables native screens (required)
// enableFreeze(); // Enables auto freeze on blur

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded] = useFonts({
    'NotoSansMyanmar-Regular': require('../assets/fonts/NotoSansMyanmar-Regular.ttf'),
    'NotoSansMyanmar-Medium': require('../assets/fonts/NotoSansMyanmar-Medium.ttf'),
    'NotoSansMyanmar-Bold': require('../assets/fonts/NotoSansMyanmar-Bold.ttf'),
  });

  // useEffect(() => {
  //   if (fontsLoaded || fontError) {
  //     SplashScreen.hideAsync();
  //   }
  // }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (fontsLoaded) {
      const defaultMyanmarStyle = {
        fontFamily: Platform.select({
          ios: 'NotoSansMyanmar-Regular',
          android: 'NotoSansMyanmar-Regular',
          default: 'NotoSansMyanmar-Regular',
        }),
        // Fix font padding and line height for Myanmar text
        includeFontPadding: Platform.OS === 'android' ? true : false,
        lineHeight: Platform.select({
          ios: undefined, // Let iOS handle it naturally
          android: undefined, // Let Android handle it naturally
          default: undefined,
        }),
        // Add text alignment baseline for better Myanmar rendering
        textAlignVertical: Platform.OS === 'android' ? 'center' : undefined,
      };

      // Override Text component globally
      (RNText as any).defaultProps = {
        ...(RNText as any).defaultProps,
        style: [defaultMyanmarStyle, (RNText as any).defaultProps?.style],
        // Add allowFontScaling for consistent sizing
        allowFontScaling: false,
      };

      // Override TextInput component globally
      (RNTextInput as any).defaultProps = {
        ...(RNTextInput as any).defaultProps,
        style: [defaultMyanmarStyle, (RNTextInput as any).defaultProps?.style],
        allowFontScaling: false,
        // Fix text input specific issues
        textAlignVertical: Platform.OS === 'android' ? 'center' : 'auto',
      };
      SplashScreen.hideAsync();
      // setTimeout(() => {
      //   setIsLoading(false);
      // }, 2000);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <MigrationProvider>
      <DatabaseProvider>
        <QueryClientProvider client={queryClient}>
          <LocalizationProvider>
            <ShopSettingsProvider>
              <CurrencyProvider>
                <ToastProvider>
                  <SafeAreaProvider>
                    <SafeAreaView style={{ flex: 1 }}>
                      <Stack screenOptions={{ headerShown: false }}>
                        <Stack.Screen name="index" />
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
              </CurrencyProvider>
            </ShopSettingsProvider>
          </LocalizationProvider>
        </QueryClientProvider>
      </DatabaseProvider>
    </MigrationProvider>
  );
}
