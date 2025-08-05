import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useTranslation } from '@/context/LocalizationContext';

// Import the analytics component
import AnalyticsScreen from '../../components/Analytics';

export default function Reports() {
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      {/* Analytics Content */}
      <View style={styles.content}>
        <AnalyticsScreen />
      </View>
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
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
});
