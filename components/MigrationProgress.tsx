import React from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { useMigration } from '@/context/MigrationContext';

interface MigrationProgressProps {
  visible: boolean;
}

export const MigrationProgress: React.FC<MigrationProgressProps> = ({
  visible,
}) => {
  const { migrationStatus, isMigrationInProgress } = useMigration();

  if (!visible || !isMigrationInProgress || !migrationStatus) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}} // Prevent closing during migration
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Database Migration</Text>
          <Text style={styles.subtitle}>
            Upgrading your database to use improved identifiers
          </Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${migrationStatus.progress}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {migrationStatus.progress.toFixed(0)}%
            </Text>
          </View>

          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.statusText}>{migrationStatus.currentStep}</Text>
          </View>

          <Text style={styles.warningText}>
            Please do not close the app during this process
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    minWidth: 300,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E5E5',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 12,
    color: '#FF6B35',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
