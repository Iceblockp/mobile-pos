import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import APIKeySetup from '../../components/APIKeySetup';
import { APIKeyManager } from '../../services/apiKeyManager';

// Mock dependencies
jest.mock('../../services/apiKeyManager');
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
    Linking: {
      openURL: jest.fn(),
    },
  };
});

describe('APIKeySetup', () => {
  let mockAPIKeyManager: jest.Mocked<APIKeyManager>;
  const mockOnComplete = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    onComplete: mockOnComplete,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    mockAPIKeyManager =
      APIKeyManager.getInstance() as jest.Mocked<APIKeyManager>;
    mockAPIKeyManager.getMaskedApiKey.mockResolvedValue(null);
    mockAPIKeyManager.validateKey.mockResolvedValue(true);
    mockAPIKeyManager.setApiKey.mockResolvedValue();
    mockAPIKeyManager.clearApiKey.mockResolvedValue();

    jest.clearAllMocks();
  });

  it('renders correctly for new setup', async () => {
    const { getByText, getByPlaceholderText } = render(
      <APIKeySetup {...defaultProps} />
    );

    await waitFor(() => {
      expect(getByText('AI Analytics Setup')).toBeTruthy();
      expect(getByText('Configure Gemini API Key')).toBeTruthy();
      expect(getByPlaceholderText('AIzaSy...')).toBeTruthy();
      expect(getByText('Save API Key')).toBeTruthy();
    });
  });

  it('shows existing API key when available', async () => {
    mockAPIKeyManager.getMaskedApiKey.mockResolvedValue('AIza****2345');

    const { getByText } = render(<APIKeySetup {...defaultProps} />);

    await waitFor(() => {
      expect(getByText('Current API Key')).toBeTruthy();
      expect(getByText('AIza****2345')).toBeTruthy();
      expect(getByText('Update API Key')).toBeTruthy();
    });
  });

  it('validates API key format before saving', async () => {
    const { getByPlaceholderText, getByText } = render(
      <APIKeySetup {...defaultProps} />
    );

    const input = getByPlaceholderText('AIzaSy...');
    const saveButton = getByText('Save API Key');

    // Enter invalid API key
    fireEvent.changeText(input, 'invalid-key');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(getByText(/Invalid API key format/)).toBeTruthy();
    });

    expect(mockAPIKeyManager.validateKey).not.toHaveBeenCalled();
  });

  it('validates API key with server when format is correct', async () => {
    mockAPIKeyManager.validateKey.mockResolvedValue(true);

    const { getByPlaceholderText, getByText } = render(
      <APIKeySetup {...defaultProps} />
    );

    const input = getByPlaceholderText('AIzaSy...');
    const saveButton = getByText('Save API Key');

    // Enter valid format API key
    fireEvent.changeText(input, 'AIzaSyDummyKeyForTesting123456789012345');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockAPIKeyManager.validateKey).toHaveBeenCalledWith(
        'AIzaSyDummyKeyForTesting123456789012345'
      );
    });
  });

  it('saves API key when validation succeeds', async () => {
    mockAPIKeyManager.validateKey.mockResolvedValue(true);
    mockAPIKeyManager.setApiKey.mockResolvedValue();

    const { getByPlaceholderText, getByText } = render(
      <APIKeySetup {...defaultProps} />
    );

    const input = getByPlaceholderText('AIzaSy...');
    const saveButton = getByText('Save API Key');

    fireEvent.changeText(input, 'AIzaSyDummyKeyForTesting123456789012345');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(mockAPIKeyManager.setApiKey).toHaveBeenCalledWith(
        'AIzaSyDummyKeyForTesting123456789012345'
      );
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'API key configured successfully! You can now use AI Analytics.',
        expect.any(Array)
      );
    });
  });

  it('shows error when API key validation fails', async () => {
    mockAPIKeyManager.validateKey.mockResolvedValue(false);

    const { getByPlaceholderText, getByText } = render(
      <APIKeySetup {...defaultProps} />
    );

    const input = getByPlaceholderText('AIzaSy...');
    const saveButton = getByText('Save API Key');

    fireEvent.changeText(input, 'AIzaSyDummyKeyForTesting123456789012345');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(getByText(/API key is invalid or expired/)).toBeTruthy();
    });
  });

  it('handles network errors during validation', async () => {
    mockAPIKeyManager.validateKey.mockRejectedValue(new Error('Network error'));

    const { getByPlaceholderText, getByText } = render(
      <APIKeySetup {...defaultProps} />
    );

    const input = getByPlaceholderText('AIzaSy...');
    const saveButton = getByText('Save API Key');

    fireEvent.changeText(input, 'AIzaSyDummyKeyForTesting123456789012345');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(getByText(/Failed to validate API key/)).toBeTruthy();
    });
  });

  it('shows loading state during validation', async () => {
    // Mock a delayed validation
    mockAPIKeyManager.validateKey.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(true), 100))
    );

    const { getByPlaceholderText, getByText } = render(
      <APIKeySetup {...defaultProps} />
    );

    const input = getByPlaceholderText('AIzaSy...');
    const saveButton = getByText('Save API Key');

    fireEvent.changeText(input, 'AIzaSyDummyKeyForTesting123456789012345');
    fireEvent.press(saveButton);

    // Should show loading state
    expect(saveButton.props.disabled).toBe(true);
  });

  it('allows clearing existing API key', async () => {
    mockAPIKeyManager.getMaskedApiKey.mockResolvedValue('AIza****2345');
    mockAPIKeyManager.clearApiKey.mockResolvedValue();

    const { getByTestId } = render(<APIKeySetup {...defaultProps} />);

    await waitFor(() => {
      const clearButton = getByTestId('clear-api-key-button');
      fireEvent.press(clearButton);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Clear API Key',
      'Are you sure you want to remove the existing API key?',
      expect.any(Array)
    );
  });

  it('toggles instructions visibility', async () => {
    const { getByText, queryByText } = render(
      <APIKeySetup {...defaultProps} />
    );

    const toggleButton = getByText('How to get a Gemini API key');

    // Instructions should be hidden initially
    expect(queryByText('1. Visit Google AI Studio')).toBeNull();

    // Show instructions
    fireEvent.press(toggleButton);
    expect(getByText('1. Visit Google AI Studio')).toBeTruthy();

    // Hide instructions
    fireEvent.press(toggleButton);
    expect(queryByText('1. Visit Google AI Studio')).toBeNull();
  });

  it('opens Google AI Studio link', async () => {
    const { getByText } = render(<APIKeySetup {...defaultProps} />);

    // Show instructions first
    fireEvent.press(getByText('How to get a Gemini API key'));

    const linkButton = getByText('Open Google AI Studio');
    fireEvent.press(linkButton);

    expect(Linking.openURL).toHaveBeenCalledWith(
      'https://makersuite.google.com/app/apikey'
    );
  });

  it('calls onCancel when cancel button is pressed', () => {
    const { getByTestId } = render(<APIKeySetup {...defaultProps} />);

    const cancelButton = getByTestId('cancel-button');
    fireEvent.press(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('calls onComplete after successful API key setup', async () => {
    mockAPIKeyManager.validateKey.mockResolvedValue(true);
    mockAPIKeyManager.setApiKey.mockResolvedValue();

    const { getByPlaceholderText, getByText } = render(
      <APIKeySetup {...defaultProps} />
    );

    const input = getByPlaceholderText('AIzaSy...');
    const saveButton = getByText('Save API Key');

    fireEvent.changeText(input, 'AIzaSyDummyKeyForTesting123456789012345');
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalled();
    });

    // Simulate pressing OK on the success alert
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const okButton = alertCall[2][0]; // First button in the alert
    okButton.onPress();

    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('disables save button when input is empty', () => {
    const { getByText } = render(<APIKeySetup {...defaultProps} />);

    const saveButton = getByText('Save API Key');
    expect(saveButton.props.disabled).toBe(true);
  });

  it('enables save button when valid input is provided', () => {
    const { getByPlaceholderText, getByText } = render(
      <APIKeySetup {...defaultProps} />
    );

    const input = getByPlaceholderText('AIzaSy...');
    const saveButton = getByText('Save API Key');

    fireEvent.changeText(input, 'AIzaSyDummyKeyForTesting123456789012345');

    expect(saveButton.props.disabled).toBe(false);
  });
});
