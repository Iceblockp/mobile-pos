import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../context/LocalizationContext';

interface InputBoxProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

const InputBox: React.FC<InputBoxProps> = ({
  value,
  onChangeText,
  onSend,
  isLoading,
  placeholder,
}) => {
  const { t } = useTranslation();

  const defaultPlaceholder = placeholder || t('aiAnalytics.askQuestion');

  const handleSend = () => {
    if (value.trim() && !isLoading) {
      onSend(value.trim());
    }
  };

  const canSend = value.trim().length > 0 && !isLoading;

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={defaultPlaceholder}
          placeholderTextColor="#999"
          multiline
          maxLength={500}
          editable={!isLoading}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            canSend ? styles.sendButtonActive : styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={canSend ? '#FFFFFF' : '#999'}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
    paddingVertical: 8,
    paddingRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
});

export default InputBox;
