import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  DollarSign,
  HelpCircle,
  Globe,
  Download,
  Info,
  Settings,
  ChevronRight,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';

export default function More() {
  const router = useRouter();
  const { t } = useTranslation();

  const menuItems = [
    {
      id: 'expenses',
      title: t('more.expenses'),
      subtitle: t('more.expensesSubtitle'),
      icon: DollarSign,
      color: '#EF4444',
      backgroundColor: '#FEF2F2',
      route: '/expenses',
    },
    {
      id: 'help',
      title: t('more.help'),
      subtitle: t('more.helpSubtitle'),
      icon: HelpCircle,
      color: '#3B82F6',
      backgroundColor: '#EFF6FF',
      route: '/help',
    },
    {
      id: 'language',
      title: t('more.language'),
      subtitle: t('more.languageSubtitle'),
      icon: Globe,
      color: '#10B981',
      backgroundColor: '#ECFDF5',
      route: '/language-settings',
    },
    {
      id: 'export',
      title: t('more.dataExport'),
      subtitle: t('more.dataExportSubtitle'),
      icon: Download,
      color: '#F59E0B',
      backgroundColor: '#FFFBEB',
      route: '/data-export',
    },
    {
      id: 'about',
      title: t('more.about'),
      subtitle: t('more.aboutSubtitle'),
      icon: Info,
      color: '#8B5CF6',
      backgroundColor: '#F5F3FF',
      route: '/about',
    },
    // {
    //   id: 'settings',
    //   title: t('more.settings'),
    //   subtitle: t('more.settingsSubtitle'),
    //   icon: Settings,
    //   color: '#6B7280',
    //   backgroundColor: '#F9FAFB',
    //   route: '/settings',
    // },
  ];

  const handleItemPress = (route: string) => {
    router.push(route as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('more.title')}</Text>
        <Text style={styles.subtitle}>{t('more.subtitle')}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.menuGrid}>
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={() => handleItemPress(item.route)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: item.backgroundColor },
                  ]}
                >
                  <IconComponent size={24} color={item.color} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                </View>
                <ChevronRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* App Info Section */}
        <View style={styles.appInfoSection}>
          <Text style={styles.appInfoTitle}>{t('more.appInfo')}</Text>
          <View style={styles.appInfoCard}>
            <Text style={styles.appName}>Mobile POS</Text>
            <Text style={styles.appVersion}>Version 1.0.0</Text>
            <Text style={styles.appDescription}>
              {t('more.appDescription')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  menuGrid: {
    padding: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  appInfoSection: {
    padding: 20,
    paddingTop: 0,
  },
  appInfoTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  appInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  appName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
