import React from 'react';
import { render } from '@testing-library/react-native';
import DefaultQuestions from '../../components/DefaultQuestions';
import MessageList from '../../components/MessageList';
import InputBox from '../../components/InputBox';

// Mock the localization context
const mockTranslation = {
  'aiAnalytics.quickQuestions': 'Quick Questions',
  'aiAnalytics.quickQuestionsSubtitle':
    'Tap any question to get instant insights',
  'aiAnalytics.salesThisWeek': 'How are my sales this week?',
  'aiAnalytics.topProducts': 'What products are selling well?',
  'aiAnalytics.restockNeeded': 'Which items need restocking?',
  'aiAnalytics.bestCustomers': 'Show me my best customers',
  'aiAnalytics.salesChanges': 'Why did sales change recently?',
  'aiAnalytics.focusToday': 'What should I focus on today?',
  'aiAnalytics.analyzing': 'Analyzing...',
  'aiAnalytics.emptyStateTitle': 'Ask me anything about your business!',
  'aiAnalytics.emptyStateSubtitle':
    'I can help you analyze sales, inventory, customers, and more.',
  'aiAnalytics.askQuestion': 'Ask about your business...',
};

const mockMyanmarTranslation = {
  'aiAnalytics.quickQuestions': 'မြန်ဆန်သောမေးခွန်းများ',
  'aiAnalytics.quickQuestionsSubtitle':
    'သင့်လုပ်ငန်းအကြောင်း ချက်ချင်းသိရှိရန် မေးခွန်းတစ်ခုခုကို နှိပ်ပါ',
  'aiAnalytics.salesThisWeek': 'ဒီအပတ် ကျွန်တော့်ရောင်းချမှု ဘယ်လိုလဲ?',
  'aiAnalytics.topProducts': 'ဘယ်ကုန်ပစ္စည်းတွေ ကောင်းကောင်းရောင်းနေလဲ?',
  'aiAnalytics.restockNeeded': 'ဘယ်ပစ္စည်းတွေ ပြန်ဖြည့်ဖို့လိုလဲ?',
  'aiAnalytics.bestCustomers': 'ကျွန်တော့်အကောင်းဆုံးဖောက်သည်တွေကို ပြပါ',
  'aiAnalytics.salesChanges': 'ရောင်းချမှု ဘာကြောင့် ပြောင်းလဲသွားလဲ?',
  'aiAnalytics.focusToday': 'ယနေ့ ဘာကို အာရုံစိုက်သင့်လဲ?',
  'aiAnalytics.analyzing': 'ခွဲခြမ်းစိတ်ဖြာနေသည်...',
  'aiAnalytics.emptyStateTitle': 'သင့်လုပ်ငန်းအကြောင်း မည်သည့်အရာမဆို မေးပါ!',
  'aiAnalytics.emptyStateSubtitle':
    'ရောင်းချမှု၊ ကုန်စာရင်း၊ ဖောက်သည်များနှင့် အခြားအရာများကို ခွဲခြမ်းစိတ်ဖြာရာတွင် ကူညီနိုင်ပါသည်။',
  'aiAnalytics.askQuestion': 'သင့်လုပ်ငန်းအကြောင်း မေးပါ...',
};

jest.mock('../../context/LocalizationContext', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      mockTranslation[key as keyof typeof mockTranslation] || key,
  }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('AI Analytics Localization', () => {
  describe('DefaultQuestions', () => {
    const defaultProps = {
      onQuestionSelect: jest.fn(),
      isLoading: false,
    };

    it('renders localized title and subtitle', () => {
      const { getByText } = render(<DefaultQuestions {...defaultProps} />);

      expect(getByText('Quick Questions')).toBeTruthy();
      expect(
        getByText('Tap any question to get instant insights')
      ).toBeTruthy();
    });

    it('renders localized default questions', () => {
      const { getByText } = render(<DefaultQuestions {...defaultProps} />);

      expect(getByText('How are my sales this week?')).toBeTruthy();
      expect(getByText('What products are selling well?')).toBeTruthy();
      expect(getByText('Which items need restocking?')).toBeTruthy();
      expect(getByText('Show me my best customers')).toBeTruthy();
      expect(getByText('Why did sales change recently?')).toBeTruthy();
      expect(getByText('What should I focus on today?')).toBeTruthy();
    });
  });

  describe('MessageList', () => {
    const mockScrollViewRef = { current: null };

    it('renders localized empty state', () => {
      const { getByText } = render(
        <MessageList messages={[]} scrollViewRef={mockScrollViewRef} />
      );

      expect(getByText('Ask me anything about your business!')).toBeTruthy();
      expect(
        getByText(
          'I can help you analyze sales, inventory, customers, and more.'
        )
      ).toBeTruthy();
    });

    it('renders localized loading message', () => {
      const loadingMessage = {
        id: '1',
        type: 'ai' as const,
        content: '',
        timestamp: new Date(),
        isLoading: true,
      };

      const { getByText } = render(
        <MessageList
          messages={[loadingMessage]}
          scrollViewRef={mockScrollViewRef}
        />
      );

      expect(getByText('Analyzing...')).toBeTruthy();
    });
  });

  describe('InputBox', () => {
    const defaultProps = {
      value: '',
      onChangeText: jest.fn(),
      onSend: jest.fn(),
      isLoading: false,
    };

    it('renders localized placeholder', () => {
      const { getByPlaceholderText } = render(<InputBox {...defaultProps} />);

      expect(getByPlaceholderText('Ask about your business...')).toBeTruthy();
    });

    it('uses custom placeholder when provided', () => {
      const { getByPlaceholderText } = render(
        <InputBox {...defaultProps} placeholder="Custom placeholder" />
      );

      expect(getByPlaceholderText('Custom placeholder')).toBeTruthy();
    });
  });
});

describe('Myanmar Localization', () => {
  beforeEach(() => {
    // Mock Myanmar translations
    jest.doMock('../../context/LocalizationContext', () => ({
      useTranslation: () => ({
        t: (key: string) =>
          mockMyanmarTranslation[key as keyof typeof mockMyanmarTranslation] ||
          key,
      }),
    }));
  });

  afterEach(() => {
    jest.resetModules();
  });

  it('renders Myanmar text correctly', () => {
    // Re-import components after mocking Myanmar translations
    const DefaultQuestions =
      require('../../components/DefaultQuestions').default;

    const { getByText } = render(
      <DefaultQuestions onQuestionSelect={jest.fn()} isLoading={false} />
    );

    expect(getByText('မြန်ဆန်သောမေးခွန်းများ')).toBeTruthy();
    expect(getByText('ဒီအပတ် ကျွန်တော့်ရောင်းချမှု ဘယ်လိုလဲ?')).toBeTruthy();
  });
});

describe('Localization Edge Cases', () => {
  it('handles missing translations gracefully', () => {
    jest.doMock('../../context/LocalizationContext', () => ({
      useTranslation: () => ({
        t: (key: string) => key, // Return key if translation not found
      }),
    }));

    const DefaultQuestions =
      require('../../components/DefaultQuestions').default;

    const { getByText } = render(
      <DefaultQuestions onQuestionSelect={jest.fn()} isLoading={false} />
    );

    // Should show the translation key as fallback
    expect(getByText('aiAnalytics.quickQuestions')).toBeTruthy();
  });

  it('handles empty translations', () => {
    jest.doMock('../../context/LocalizationContext', () => ({
      useTranslation: () => ({
        t: () => '', // Return empty string
      }),
    }));

    const InputBox = require('../../components/InputBox').default;

    const { getByPlaceholderText } = render(
      <InputBox
        value=""
        onChangeText={jest.fn()}
        onSend={jest.fn()}
        isLoading={false}
      />
    );

    // Should handle empty translation gracefully
    expect(getByPlaceholderText('')).toBeTruthy();
  });
});
