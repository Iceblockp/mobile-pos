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

export default function TabLayout() {
  const { isLicenseValid, loading } = useLicense();
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !isLicenseValid()) {
      router.replace('/');
    }
  }, [loading, isLicenseValid]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#6B7280',
        lazy: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F3F4F6',
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: 'NotoSansMyanmar-Bold',
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 2,
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
