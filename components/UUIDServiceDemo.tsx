import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { UUIDService, generateUUID } from '../utils/uuid';
import { testUUIDService } from '../scripts/testUUIDService';
import {
  UUIDMigrationService,
  MigrationStatus,
} from '../services/uuidMigrationService';

/**
 * Demo component to test UUID service functionality in the mobile app
 */
export const UUIDServiceDemo: React.FC = () => {
  const [generatedUUIDs, setGeneratedUUIDs] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<string>('');
  const [migrationStatus, setMigrationStatus] =
    useState<MigrationStatus | null>(null);

  const handleGenerateUUID = () => {
    const newUUID = generateUUID();
    setGeneratedUUIDs((prev) => [newUUID, ...prev.slice(0, 9)]); // Keep last 10
  };

  const handleRunTests = () => {
    console.log('Running UUID Service Tests...');
    const results = testUUIDService();

    const passedTests = results.filter((r) => r.passed).length;
    const totalTests = results.length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    setTestResults(
      `Tests: ${passedTests}/${totalTests} passed (${successRate}%)`
    );
  };

  const handleGenerateMultiple = () => {
    const multipleUUIDs = UUIDService.generateMultiple(5);
    setGeneratedUUIDs((prev) => [...multipleUUIDs, ...prev.slice(0, 5)]);
  };

  const handleTestMigrationService = () => {
    // Create a mock database for demonstration
    const mockDb = {
      execAsync: async (sql: string) =>
        console.log('Mock SQL:', sql.substring(0, 50)),
      getAllAsync: async () => [{ name: 'id', type: 'INTEGER' }],
      getFirstAsync: async () => ({ count: 0 }),
      runAsync: async () => {},
    } as any;

    const migrationService = new UUIDMigrationService(mockDb);
    const status = migrationService.getMigrationStatus();
    setMigrationStatus(status);

    Alert.alert(
      'Migration Service Test',
      `Status: ${status.currentStep}\nProgress: ${status.progress}%\nComplete: ${status.isComplete}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>UUID Service Demo</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity style={styles.button} onPress={handleGenerateUUID}>
          <Text style={styles.buttonText}>Generate Single UUID</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleGenerateMultiple}
        >
          <Text style={styles.buttonText}>Generate 5 UUIDs</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={handleRunTests}>
          <Text style={styles.buttonText}>Run UUID Tests</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.migrationButton}
          onPress={handleTestMigrationService}
        >
          <Text style={styles.buttonText}>Test Migration Service</Text>
        </TouchableOpacity>
      </View>

      {testResults ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UUID Test Results</Text>
          <Text style={styles.resultText}>{testResults}</Text>
          <Text style={styles.note}>
            Check console for detailed test output
          </Text>
        </View>
      ) : null}

      {migrationStatus ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Migration Service Status</Text>
          <Text style={styles.resultText}>
            Step: {migrationStatus.currentStep}
          </Text>
          <Text style={styles.resultText}>
            Progress: {migrationStatus.progress}%
          </Text>
          <Text style={styles.resultText}>
            Complete: {migrationStatus.isComplete ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.note}>This is a demo with mock database</Text>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Generated UUIDs</Text>
        {generatedUUIDs.map((uuid, index) => (
          <View key={index} style={styles.uuidContainer}>
            <Text style={styles.uuidText}>{uuid}</Text>
            <Text style={styles.validationText}>
              {UUIDService.isValid(uuid) ? '✅ Valid' : '❌ Invalid'}
            </Text>
          </View>
        ))}
        {generatedUUIDs.length === 0 && (
          <Text style={styles.emptyText}>No UUIDs generated yet</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    alignItems: 'center',
  },
  testButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    alignItems: 'center',
  },
  migrationButton: {
    backgroundColor: '#FF9500',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  resultText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  note: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  uuidContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  uuidText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
  },
  validationText: {
    fontSize: 12,
    marginLeft: 10,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
  },
});
