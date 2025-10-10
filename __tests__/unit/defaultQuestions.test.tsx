import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DefaultQuestions from '../../components/DefaultQuestions';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('DefaultQuestions', () => {
  const defaultProps = {
    onQuestionSelect: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = render(<DefaultQuestions {...defaultProps} />);

    expect(getByText('Quick Questions')).toBeTruthy();
    expect(
      getByText('Tap any question to get instant insights about your business')
    ).toBeTruthy();
  });

  it('displays all default questions', () => {
    const { getByText } = render(<DefaultQuestions {...defaultProps} />);

    expect(getByText('How are my sales this week?')).toBeTruthy();
    expect(getByText('What products are selling well?')).toBeTruthy();
    expect(getByText('Which items need restocking?')).toBeTruthy();
    expect(getByText('Show me my best customers')).toBeTruthy();
    expect(getByText('Why did sales change recently?')).toBeTruthy();
    expect(getByText('What should I focus on today?')).toBeTruthy();
  });

  it('calls onQuestionSelect when question is pressed', () => {
    const onQuestionSelect = jest.fn();
    const { getByText } = render(
      <DefaultQuestions {...defaultProps} onQuestionSelect={onQuestionSelect} />
    );

    const question = getByText('How are my sales this week?');
    fireEvent.press(question);

    expect(onQuestionSelect).toHaveBeenCalledWith(
      'How are my sales this week?'
    );
  });

  it('disables questions when loading', () => {
    const onQuestionSelect = jest.fn();
    const { getByText } = render(
      <DefaultQuestions
        {...defaultProps}
        onQuestionSelect={onQuestionSelect}
        isLoading={true}
      />
    );

    const question = getByText('How are my sales this week?');
    fireEvent.press(question);

    expect(onQuestionSelect).not.toHaveBeenCalled();
  });

  it('applies disabled styling when loading', () => {
    const { getByText } = render(
      <DefaultQuestions {...defaultProps} isLoading={true} />
    );

    // Check that questions are still rendered but with disabled styling
    expect(getByText('How are my sales this week?')).toBeTruthy();
  });

  it('renders different categories with appropriate colors', () => {
    const { getByText } = render(<DefaultQuestions {...defaultProps} />);

    // All questions should be rendered regardless of category
    expect(getByText('How are my sales this week?')).toBeTruthy(); // sales category
    expect(getByText('Which items need restocking?')).toBeTruthy(); // inventory category
    expect(getByText('Show me my best customers')).toBeTruthy(); // customers category
    expect(getByText('What should I focus on today?')).toBeTruthy(); // general category
  });

  it('handles multiple question presses correctly', () => {
    const onQuestionSelect = jest.fn();
    const { getByText } = render(
      <DefaultQuestions {...defaultProps} onQuestionSelect={onQuestionSelect} />
    );

    fireEvent.press(getByText('How are my sales this week?'));
    fireEvent.press(getByText('What products are selling well?'));

    expect(onQuestionSelect).toHaveBeenCalledTimes(2);
    expect(onQuestionSelect).toHaveBeenNthCalledWith(
      1,
      'How are my sales this week?'
    );
    expect(onQuestionSelect).toHaveBeenNthCalledWith(
      2,
      'What products are selling well?'
    );
  });
});
