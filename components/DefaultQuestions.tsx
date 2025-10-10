import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../context/LocalizationContext';

interface DefaultQuestion {
  id: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  category: 'sales' | 'inventory' | 'customers' | 'general';
}

interface DefaultQuestionsProps {
  onQuestionSelect: (question: string) => void;
  isLoading: boolean;
}

const getDefaultQuestions = (t: (key: string) => string): DefaultQuestion[] => [
  {
    id: '1',
    text: t('aiAnalytics.salesThisWeek'),
    icon: 'trending-up',
    category: 'sales',
  },
  {
    id: '2',
    text: t('aiAnalytics.topProducts'),
    icon: 'star',
    category: 'sales',
  },
  {
    id: '3',
    text: t('aiAnalytics.restockNeeded'),
    icon: 'cube',
    category: 'inventory',
  },
  {
    id: '4',
    text: t('aiAnalytics.bestCustomers'),
    icon: 'people',
    category: 'customers',
  },
  {
    id: '5',
    text: t('aiAnalytics.salesChanges'),
    icon: 'analytics',
    category: 'sales',
  },
  {
    id: '6',
    text: t('aiAnalytics.focusToday'),
    icon: 'bulb',
    category: 'general',
  },
];

const DefaultQuestions: React.FC<DefaultQuestionsProps> = ({
  onQuestionSelect,
  isLoading,
}) => {
  const { t } = useTranslation();
  const handleQuestionPress = (question: string) => {
    if (!isLoading) {
      onQuestionSelect(question);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sales':
        return '#34C759';
      case 'inventory':
        return '#007AFF';
      case 'customers':
        return '#FF9500';
      case 'general':
        return '#8E8E93';
      default:
        return '#8E8E93';
    }
  };

  const defaultQuestions = getDefaultQuestions(t);

  const renderQuestion = (question: DefaultQuestion) => (
    <TouchableOpacity
      key={question.id}
      style={[
        styles.questionButton,
        isLoading && styles.questionButtonDisabled,
      ]}
      onPress={() => handleQuestionPress(question.text)}
      disabled={isLoading}
      activeOpacity={0.7}
    >
      <View style={styles.questionContent}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: getCategoryColor(question.category) },
          ]}
        >
          <Ionicons name={question.icon} size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.questionText}>{question.text}</Text>
        <Ionicons name="chevron-forward" size={16} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('aiAnalytics.quickQuestions')}</Text>
      <Text style={styles.subtitle}>
        {t('aiAnalytics.quickQuestionsSubtitle')}
      </Text>

      <ScrollView
        style={styles.questionsContainer}
        showsVerticalScrollIndicator={false}
      >
        {defaultQuestions.map(renderQuestion)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  questionsContainer: {
    maxHeight: 300,
  },
  questionButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  questionButtonDisabled: {
    opacity: 0.6,
  },
  questionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

export default DefaultQuestions;
