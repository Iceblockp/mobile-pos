import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Card } from '@/components/Card';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Calendar,
} from 'lucide-react-native';

// Import the existing screens as components
import AnalyticsScreen from '../../components/Analytics';
import ExpensesScreen from '../../components/ExpensesManager';

type ReportTab = 'analytics' | 'expenses';

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('analytics');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'analytics':
        return <AnalyticsScreen />;
      case 'expenses':
        return <ExpensesScreen />;
      default:
        return <AnalyticsScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <Text style={styles.subtitle}>
          Business insights and expense tracking
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <BarChart3
            size={20}
            color={activeTab === 'analytics' ? '#059669' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'analytics' && styles.activeTabText,
            ]}
          >
            Analytics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'expenses' && styles.activeTab]}
          onPress={() => setActiveTab('expenses')}
        >
          <DollarSign
            size={20}
            color={activeTab === 'expenses' ? '#059669' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'expenses' && styles.activeTabText,
            ]}
          >
            Expenses
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>{renderTabContent()}</View>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#059669',
    fontFamily: 'Inter-SemiBold',
  },
  content: {
    flex: 1,
  },
});
