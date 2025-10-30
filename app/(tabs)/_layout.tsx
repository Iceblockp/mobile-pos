import { Tabs, useRouter } from 'expo-router';
import {
  Chrome as Home,
  Package,
  ShoppingCart,
  ChartBar as BarChart3,
  Settings,
  MoreHorizontal,
} from 'lucide-react-native';
import { useEffect } from 'react';
import { useLicense } from '@/hooks/useLicense';
import { useTranslation } from '@/context/LocalizationContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';

export default function TabLayout() {
  const { isLicenseValid, loading, licenseStatus } = useLicense();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!loading && !isLicenseValid()) {
      router.replace('/');
    }
  }, [loading, licenseStatus, isLicenseValid]); // Add licenseStatus as dependency

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#6B7280',
        lazy: true,
        // tabBarStyle: Platform.select({
        //   ios: {
        //     // Use a transparent background on iOS to show the blur effect
        //     position: 'absolute',
        //   },
        //   default: {},
        //   android: {
        //     paddingBottom: insets.bottom + 20,
        //   },
        // }),
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          // borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          // height: 70, // Add safe area bottom inset
          paddingBottom: insets.bottom + 10, // Add safe area bottom inset plus padding
          shadowColor: '#000',
          // shadowOffset: { width: 0, height: -2 },
          // shadowOpacity: 0.1,
          // shadowRadius: 8,
          // elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'NotoSansMyanmar-Medium',
          // marginTop: 4,
        },
        tabBarIconStyle: {
          // marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('navigation.dashboard'),
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
          // freezeOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: t('navigation.sales'),
          tabBarIcon: ({ size, color }) => (
            <ShoppingCart size={size} color={color} />
          ),
          // freezeOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: t('navigation.inventory'),
          tabBarIcon: ({ size, color }) => (
            <Package size={size} color={color} />
          ),
          // freezeOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: t('navigation.reports'),
          tabBarIcon: ({ size, color }) => (
            <BarChart3 size={size} color={color} />
          ),
          // freezeOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: t('navigation.more'),
          tabBarIcon: ({ size, color }) => (
            <MoreHorizontal size={size} color={color} />
          ),
          // freezeOnBlur: true,
        }}
      />
    </Tabs>
  );
}
