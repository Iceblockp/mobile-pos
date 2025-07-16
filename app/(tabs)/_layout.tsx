import { router, Tabs, useRouter } from 'expo-router';
import {
  Chrome as Home,
  Package,
  ShoppingCart,
  ChartBar as BarChart3,
  TrendingUp,
} from 'lucide-react-native';

// Add the expenses icon import
import { DollarSign } from 'lucide-react-native';
import { useEffect } from 'react';
import { useLicense } from '@/hooks/useLicense';

export default function TabLayout() {
  const { isLicenseValid, loading } = useLicense();
  const router = useRouter();

  console.log('LicenseGuard - loading:', loading);
  console.log('LicenseGuard - isLicenseValid:', isLicenseValid());

  useEffect(() => {
    if (!loading && !isLicenseValid()) {
      // Redirect to the root page if license is not valid
      console.log('goess');
      router.replace('/');
    }
  }, [loading, isLicenseValid]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#059669',
        tabBarInactiveTintColor: '#6B7280',
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
          fontFamily: 'Inter-Medium',
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
          title: 'Dashboard',
          tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sales"
        options={{
          title: 'Sales',
          tabBarIcon: ({ size, color }) => (
            <ShoppingCart size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ size, color }) => (
            <Package size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ size, color }) => (
            <BarChart3 size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
