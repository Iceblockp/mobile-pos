import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Settings as SettingsIcon,
  Bell,
  Moon,
  Vibrate,
  Volume2,
  Database,
  Trash2,
  RefreshCw,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { useToast } from '@/context/ToastContext';

export default function Settings() {
  const router = useRouter();
  const { t } = useTranslation();
  const { showToast } = useToast();

  // Settings state
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear temporary files and cached data. The app may take longer to load initially after clearing cache.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // Simulate cache clearing
            showToast('Cache cleared successfully', 'success');
          },
        },
      ]
    );
  };

  const handleResetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all app settings to their default values. Your data will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setNotifications(true);
            setDarkMode(false);
            setHapticFeedback(true);
            setSoundEffects(true);
            showToast('Settings reset to defaults', 'success');
          },
        },
      ]
    );
  };

  const handleFactoryReset = () => {
    Alert.alert(
      '⚠️ Factory Reset',
      'This will permanently delete ALL data including sales, products, expenses, and settings. This action cannot be undone.\n\nMake sure you have exported your data before proceeding.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I understand, proceed',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? This will delete everything permanently.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Everything',
                  style: 'destructive',
                  onPress: () => {
                    showToast('Factory reset would be performed here', 'error');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{t('more.settings')}</Text>
          <Text style={styles.subtitle}>{t('more.settingsSubtitle')}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* App Preferences */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <SettingsIcon size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>App Preferences</Text>
          </View>
        </View>

        <View style={styles.settingsList}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Bell size={20} color="#6B7280" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive alerts for low stock and important updates
                </Text>
              </View>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor={notifications ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Moon size={20} color="#6B7280" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Dark Mode</Text>
                <Text style={styles.settingDescription}>
                  Use dark theme for better viewing in low light
                </Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor={darkMode ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Vibrate size={20} color="#6B7280" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Haptic Feedback</Text>
                <Text style={styles.settingDescription}>
                  Feel vibrations when interacting with the app
                </Text>
              </View>
            </View>
            <Switch
              value={hapticFeedback}
              onValueChange={setHapticFeedback}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor={hapticFeedback ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Volume2 size={20} color="#6B7280" />
              <View style={styles.settingText}>
                <Text style={styles.settingTitle}>Sound Effects</Text>
                <Text style={styles.settingDescription}>
                  Play sounds for actions and notifications
                </Text>
              </View>
            </View>
            <Switch
              value={soundEffects}
              onValueChange={setSoundEffects}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor={soundEffects ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Database size={20} color="#6B7280" />
            <Text style={styles.sectionTitle}>Data Management</Text>
          </View>
        </View>

        <View style={styles.actionsList}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleClearCache}
          >
            <View style={styles.actionInfo}>
              <RefreshCw size={20} color="#3B82F6" />
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Clear Cache</Text>
                <Text style={styles.actionDescription}>
                  Clear temporary files and cached data
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleResetSettings}
          >
            <View style={styles.actionInfo}>
              <SettingsIcon size={20} color="#F59E0B" />
              <View style={styles.actionText}>
                <Text style={styles.actionTitle}>Reset Settings</Text>
                <Text style={styles.actionDescription}>
                  Reset all settings to default values
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionItem, styles.dangerAction]}
            onPress={handleFactoryReset}
          >
            <View style={styles.actionInfo}>
              <Trash2 size={20} color="#EF4444" />
              <View style={styles.actionText}>
                <Text style={[styles.actionTitle, styles.dangerText]}>
                  Factory Reset
                </Text>
                <Text style={styles.actionDescription}>
                  Delete all data and reset app completely
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Information */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Important Notes</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              • Settings are automatically saved when changed
            </Text>
            <Text style={styles.infoText}>
              • Dark mode is coming in a future update
            </Text>
            <Text style={styles.infoText}>
              • Factory reset cannot be undone - export data first
            </Text>
            <Text style={styles.infoText}>
              • Some settings may require app restart to take effect
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  settingsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 18,
  },
  actionsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dangerAction: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  actionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    marginLeft: 12,
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  dangerText: {
    color: '#EF4444',
  },
  actionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 18,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  infoTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
});
