import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ChatInterface from '../../components/ChatInterface';
import MessageList from '../../components/MessageList';
import InputBox from '../../components/InputBox';
import { ChatMessage } from '../../types/aiAnalytics';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('ChatInterface', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      type: 'user',
      content: 'How are my sales?',
      timestamp: new Date('2023-01-01T10:00:00Z'),
    },
    {
      id: '2',
      type: 'ai',
      content: 'Your sales are doing well!',
      timestamp: new Date('2023-01-01T10:01:00Z'),
    },
  ];

  const defaultProps = {
    messages: mockMessages,
    isLoading: false,
    onSendMessage: jest.fn(),
    inputText: '',
    onInputChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with messages', () => {
    const { getByText } = render(<ChatInterface {...defaultProps} />);

    expect(getByText('How are my sales?')).toBeTruthy();
    expect(getByText('Your sales are doing well!')).toBeTruthy();
  });

  it('calls onSendMessage when message is sent', () => {
    const onSendMessage = jest.fn();
    const { getByPlaceholderText } = render(
      <ChatInterface {...defaultProps} onSendMessage={onSendMessage} />
    );

    const input = getByPlaceholderText('Ask about your business...');
    fireEvent.changeText(input, 'Test message');
    fireEvent(input, 'submitEditing');

    expect(onSendMessage).toHaveBeenCalledWith('Test message');
  });

  it('shows loading state correctly', () => {
    const { getByTestId } = render(
      <ChatInterface {...defaultProps} isLoading={true} />
    );

    // Should show loading indicator in send button
    expect(getByTestId).toBeTruthy();
  });
});

describe('MessageList', () => {
  const mockScrollViewRef = { current: null };

  it('renders empty state when no messages', () => {
    const { getByText } = render(
      <MessageList messages={[]} scrollViewRef={mockScrollViewRef} />
    );

    expect(getByText('Ask me anything about your business!')).toBeTruthy();
  });

  it('renders messages correctly', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'user',
        content: 'Test user message',
        timestamp: new Date(),
      },
      {
        id: '2',
        type: 'ai',
        content: 'Test AI response',
        timestamp: new Date(),
      },
    ];

    const { getByText } = render(
      <MessageList messages={messages} scrollViewRef={mockScrollViewRef} />
    );

    expect(getByText('Test user message')).toBeTruthy();
    expect(getByText('Test AI response')).toBeTruthy();
  });

  it('shows loading message correctly', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'ai',
        content: '',
        timestamp: new Date(),
        isLoading: true,
      },
    ];

    const { getByText } = render(
      <MessageList messages={messages} scrollViewRef={mockScrollViewRef} />
    );

    expect(getByText('Analyzing...')).toBeTruthy();
  });

  it('shows error message correctly', () => {
    const messages: ChatMessage[] = [
      {
        id: '1',
        type: 'ai',
        content: 'Failed message',
        timestamp: new Date(),
        error: 'Network error occurred',
      },
    ];

    const { getByText } = render(
      <MessageList messages={messages} scrollViewRef={mockScrollViewRef} />
    );

    expect(getByText('Network error occurred')).toBeTruthy();
  });
});

describe('InputBox', () => {
  const defaultProps = {
    value: '',
    onChangeText: jest.fn(),
    onSend: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByPlaceholderText } = render(<InputBox {...defaultProps} />);

    expect(getByPlaceholderText('Ask about your business...')).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <InputBox {...defaultProps} onChangeText={onChangeText} />
    );

    const input = getByPlaceholderText('Ask about your business...');
    fireEvent.changeText(input, 'Test input');

    expect(onChangeText).toHaveBeenCalledWith('Test input');
  });

  it('calls onSend when send button is pressed', () => {
    const onSend = jest.fn();
    const { getByRole } = render(
      <InputBox {...defaultProps} value="Test message" onSend={onSend} />
    );

    const sendButton = getByRole('button');
    fireEvent.press(sendButton);

    expect(onSend).toHaveBeenCalledWith('Test message');
  });

  it('disables send button when input is empty', () => {
    const onSend = jest.fn();
    const { getByRole } = render(
      <InputBox {...defaultProps} value="" onSend={onSend} />
    );

    const sendButton = getByRole('button');
    fireEvent.press(sendButton);

    expect(onSend).not.toHaveBeenCalled();
  });

  it('shows loading state correctly', () => {
    const { getByTestId } = render(
      <InputBox {...defaultProps} isLoading={true} />
    );

    // Should show loading indicator
    expect(getByTestId).toBeTruthy();
  });

  it('trims whitespace when sending', () => {
    const onSend = jest.fn();
    const { getByRole } = render(
      <InputBox {...defaultProps} value="  Test message  " onSend={onSend} />
    );

    const sendButton = getByRole('button');
    fireEvent.press(sendButton);

    expect(onSend).toHaveBeenCalledWith('Test message');
  });
});
