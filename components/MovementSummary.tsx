import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useStockMovementSummary } from '@/hooks/useQueries';
import {
  TrendingUp,
  TrendingDown,
  Package,
  RotateCcw,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';

interface MovementSummaryProps {
  productId?: string;
  startDate?: Date;
  endDate?: Date;
  compact?: boolean;
}

export const MovementSummary: React.FC<MovementSummaryProps> = ({
  productId,
  startDate,
  endDate,
  compact = false,
}) => {
  const { t } = useTranslation();

  const {
    data: summary,
    isLoading,
    isRefetching,
  } = useStockMovementSummary(productId, startDate, endDate);

  if (isLoading && !isRefetching) {
    return <LoadingSpinner />;
  }

  if (!summary) {
    return null;
  }

  const summaryCards = [
    {
      title: t('stockMovement.totalIn'),
      value: summary.totalStockIn || 0,
      icon: TrendingUp,
      color: '#059669',
      backgroundColor: '#F0FDF4',
    },
    {
      title: t('stockMovement.totalOut'),
      value: summary.totalStockOut || 0,
      icon: TrendingDown,
      color: '#EF4444',
      backgroundColor: '#FEF2F2',
    },
    {
      title: t('stockMovement.netChange'),
      value: summary.netMovement || 0,
      icon: RotateCcw,
      color: '#3B82F6',
      backgroundColor: '#EFF6FF',
    },
    {
      title: t('stockMovement.totalMovements'),
      value: summary.movementCount || 0,
      icon: Package,
      color: '#8B5CF6',
      backgroundColor: '#F5F3FF',
    },
  ];

  const renderCard = (card: (typeof summaryCards)[0], index: number) => {
    const cardStyle = {
      ...styles.summaryCard,
      ...(compact ? styles.summaryCardCompact : {}),
      backgroundColor: card.backgroundColor,
    };

    return (
      <Card key={index} style={cardStyle}>
        <View style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: card.color }]}>
            <card.icon size={compact ? 20 : 24} color="#FFFFFF" />
          </View>
          <View style={styles.cardText}>
            <Text
              style={
                compact
                  ? [styles.cardValue, styles.cardValueCompact]
                  : styles.cardValue
              }
              weight="bold"
            >
              {typeof card.value === 'number' && card.value >= 0 ? '+' : ''}
              {card.value}
            </Text>
            <Text
              style={
                compact
                  ? [styles.cardTitle, styles.cardTitleCompact]
                  : styles.cardTitle
              }
              weight="medium"
            >
              {card.title}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View
      style={
        compact ? [styles.container, styles.containerCompact] : styles.container
      }
    >
      {!compact && (
        <Text style={styles.sectionTitle} weight="medium">
          {t('stockMovement.summary')}
        </Text>
      )}

      <View
        style={
          compact
            ? [styles.cardsContainer, styles.cardsContainerCompact]
            : styles.cardsContainer
        }
      >
        {summaryCards.map((card, index) => renderCard(card, index))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  containerCompact: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  cardsContainerCompact: {
    paddingHorizontal: 0,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryCardCompact: {
    padding: 12,
    minWidth: '48%',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardText: {
    flex: 1,
  },
  cardValue: {
    fontSize: 20,
    color: '#111827',
  },
  cardValueCompact: {
    fontSize: 18,
  },
  cardTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  cardTitleCompact: {
    fontSize: 12,
  },
});
