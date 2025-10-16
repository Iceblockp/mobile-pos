import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Ionicons } from '@expo/vector-icons';
import { APIKeyManager } from '../services/apiKeyManager';
import { validateApiKeyFormat } from '../utils/aiAnalyticsConfig';
import { useTranslation } from '../context/LocalizationContext';

interface APIKeySetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

const APIKeySetup: React.FC<APIKeySetupProps> = ({ onComplete, onCancel }) => {
  const { t } = useTranslation();
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [existingKey, setExistingKey] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const apiKeyManager = APIKeyManager.getInstance();

  useEffect(() => {
    loadExistingKey();
  }, []);

  const loadExistingKey = async () => {
    try {
      const maskedKey = await apiKeyManager.getMaskedApiKey();
      setExistingKey(maskedKey);
    } catch (error) {
      console.error('Error loading existing key:', error);
    }
  };

  const validateAndSaveKey = async () => {
    if (!apiKey.trim()) {
      setValidationError('Please enter an API key');
      return;
    }

    // Basic format validation
    if (!validateApiKeyFormat(apiKey.trim())) {
      setValidationError(
        'Invalid API key format. Gemini API keys should start with "AIza" and be 39 characters long.'
      );
      return;
    }

    setIsValidating(true);
    setValidationError('');

    try {
      // Validate with actual API call
      const isValid = await apiKeyManager.validateKey(apiKey.trim());

      if (!isValid) {
        setValidationError(
          'API key is invalid or expired. Please check your key and try again.'
        );
        setIsValidating(false);
        return;
      }

      // Save the key
      await apiKeyManager.setApiKey(apiKey.trim());

      setIsValidating(false);
      Alert.alert(
        'Success',
        'API key configured successfully! You can now use AI Analytics.',
        [{ text: 'OK', onPress: onComplete }]
      );
    } catch (error) {
      console.error('Error validating API key:', error);
      setValidationError(
        'Failed to validate API key. Please check your internet connection and try again.'
      );
      setIsValidating(false);
    }
  };

  const clearExistingKey = async () => {
    Alert.alert(
      'Clear API Key',
      'Are you sure you want to remove the existing API key?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiKeyManager.clearApiKey();
              setExistingKey(null);
              setApiKey('');
            } catch (error) {
              console.error('Error clearing API key:', error);
            }
          },
        },
      ]
    );
  };

  const openGoogleAIStudio = () => {
    Linking.openURL('https://makersuite.google.com/app/apikey');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onCancel}
          style={styles.cancelButton}
          testID="cancel-button"
        >
          <Ionicons name="close" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title} weight="medium">
          {t('aiAnalytics.title')} Setup
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle} weight="medium">
            {t('aiAnalytics.configureApiKey')}
          </Text>
          <Text style={styles.sectionDescription}>
            To use AI Analytics, you need a Gemini API key from Google AI
            Studio.
          </Text>
        </View>

        {existingKey && (
          <View style={styles.existingKeySection}>
            <Text style={styles.existingKeyTitle} weight="medium">
              Current API Key
            </Text>
            <View style={styles.existingKeyContainer}>
              <Text style={styles.existingKeyText}>{existingKey}</Text>
              <TouchableOpacity
                onPress={clearExistingKey}
                style={styles.clearButton}
                testID="clear-api-key-button"
              >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.inputSection}>
          <Text style={styles.inputLabel} weight="medium">
            {existingKey ? 'New API Key' : 'API Key'}
          </Text>
          <TextInput
            style={styles.textInput}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder={t('aiAnalytics.apiKeyPlaceholder')}
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry={false}
            multiline={false}
          />
          {validationError ? (
            <Text style={styles.errorText}>{validationError}</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.saveButton,
            (!apiKey.trim() || isValidating) && styles.saveButtonDisabled,
          ]}
          onPress={validateAndSaveKey}
          disabled={!apiKey.trim() || isValidating}
        >
          {isValidating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText} weight="medium">
              {existingKey ? 'Update API Key' : 'Save API Key'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.instructionsSection}>
          <TouchableOpacity
            style={styles.instructionsToggle}
            onPress={() => setShowInstructions(!showInstructions)}
          >
            <Text style={styles.instructionsToggleText} weight="medium">
              How to get a Gemini API key
            </Text>
            <Ionicons
              name={showInstructions ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#007AFF"
            />
          </TouchableOpacity>

          {showInstructions && (
            <View style={styles.instructionsContent}>
              <Text style={styles.instructionStep}>
                1. Visit Google AI Studio (makersuite.google.com)
              </Text>
              <Text style={styles.instructionStep}>
                2. Sign in with your Google account
              </Text>
              <Text style={styles.instructionStep}>
                3. Click "Get API key" in the left sidebar
              </Text>
              <Text style={styles.instructionStep}>
                4. Create a new API key for your project
              </Text>
              <Text style={styles.instructionStep}>
                5. Copy the API key and paste it above
              </Text>

              <TouchableOpacity
                style={styles.openLinkButton}
                onPress={openGoogleAIStudio}
              >
                <Ionicons name="open-outline" size={16} color="#007AFF" />
                <Text style={styles.openLinkText}>Open Google AI Studio</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.noteSection}>
          <View style={styles.noteIcon}>
            <Ionicons name="information-circle" size={20} color="#FF9500" />
          </View>
          <Text style={styles.noteText}>
            Your API key is stored securely on your device and is only used to
            send requests to Google's AI service. We never store or transmit
            your key to our servers.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingTop: 50, // Account for status bar
  },
  cancelButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    color: '#666',
  },
  existingKeySection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  existingKeyTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  existingKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  existingKeyText: {
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 8,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  saveButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  instructionsSection: {
    marginBottom: 24,
  },
  instructionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  instructionsToggleText: {
    fontSize: 16,
    color: '#007AFF',
  },
  instructionsContent: {
    paddingTop: 16,
  },
  instructionStep: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  openLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  openLinkText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 4,
  },
  noteSection: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    marginBottom: 24,
  },
  noteIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
  },
});

export default APIKeySetup;
