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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ErrorBoundary } from '@/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded] = useFonts({
    'NotoSansMyanmar-Regular': require('../assets/fonts/NotoSansMyanmar-Regular.ttf'),
    'NotoSansMyanmar-Medium': require('../assets/fonts/NotoSansMyanmar-Medium.ttf'),
    'NotoSansMyanmar-Bold': require('../assets/fonts/NotoSansMyanmar-Bold.ttf'),
    Padauk: require('../assets/fonts/Padauk-Regular.ttf'),
    'Padauk-Bold': require('../assets/fonts/Padauk-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      try {
        const defaultMyanmarStyle = {
          fontFamily: Platform.select({
            ios: 'NotoSansMyanmar-Regular',
            android: 'NotoSansMyanmar-Regular',
            default: 'NotoSansMyanmar-Regular',
          }),
          includeFontPadding: Platform.OS === 'android' ? true : false,
          lineHeight: Platform.select({
            ios: undefined,
            android: undefined,
            default: undefined,
          }),
          textAlignVertical: Platform.OS === 'android' ? 'center' : undefined,
        };

        // Safer global override with error handling
        if (RNText && typeof RNText === 'object') {
          (RNText as any).defaultProps = {
            ...(RNText as any).defaultProps,
            style: [defaultMyanmarStyle, (RNText as any).defaultProps?.style],
            allowFontScaling: false,
          };
        }

        if (RNTextInput && typeof RNTextInput === 'object') {
          (RNTextInput as any).defaultProps = {
            ...(RNTextInput as any).defaultProps,
            style: [
              defaultMyanmarStyle,
              (RNTextInput as any).defaultProps?.style,
            ],
            allowFontScaling: false,
            textAlignVertical: Platform.OS === 'android' ? 'center' : 'auto',
          };
        }

        SplashScreen.hideAsync();
      } catch (fontError) {
        console.error('Font setup error:', fontError);
        // Hide splash screen even if font setup fails
        SplashScreen.hideAsync();
      }
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    // <ErrorBoundary>
    <MigrationProvider>
      <DatabaseProvider>
        <QueryClientProvider client={queryClient}>
          <LocalizationProvider>
            <ShopSettingsProvider>
              <CurrencyProvider>
                <ToastProvider>
                  <SafeAreaProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="index" />
                      <Stack.Screen
                        name="(drawer)"
                        options={{
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen
                        name="(tabs)"
                        options={{
                          headerShown: false,
                        }}
                      />
                      <Stack.Screen name="+not-found" />
                    </Stack>
                    <StatusBar style="dark" />
                  </SafeAreaProvider>
                </ToastProvider>
              </CurrencyProvider>
            </ShopSettingsProvider>
          </LocalizationProvider>
        </QueryClientProvider>
      </DatabaseProvider>
    </MigrationProvider>
    // </ErrorBoundary>
  );
}
