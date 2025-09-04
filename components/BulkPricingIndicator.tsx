import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendingDown, Gift, ArrowUp } from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import {
  calculateBulkPrice,
  getNextBulkTier,
  formatBulkSavings,
  hasBulkPricing,
} from '@/utils/bulkPricingUtils';
import { Product } from '@/services/database';

interface BulkPricingIndicatorProps {
  product: Product;
  quantity: number;
  onQuantityChange?: (newQuantity: number) => void;
  compact?: boolean;
  showUpsell?: boolean;
}

export const BulkPricingIndicator: React.FC<BulkPricingIndicatorProps> = ({
  product,
  quantity,
  onQuantityChange,
  compact = false,
  showUpsell = true,
}) => {
  const { t } = useTranslation();

  if (!hasBulkPricing(product)) {
    return null;
  }

  const pricing = calculateBulkPrice(product, quantity);
  const nextTier = getNextBulkTier(product, quantity);
  const hasActiveBulkPricing = pricing.appliedTier !== undefined;
  const hasSavings = pricing.totalSavings > 0;

  const formatMMK = (amount: number) => {
    return new Intl.NumberFormat('en-US').format(amount) + ' MMK';
  };

  const handleUpsellClick = () => {
    if (nextTier && onQuantityChange) {
      onQuantityChange(nextTier.min_quantity);
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {hasSavings && (
          <View style={styles.compactSavings}>
            <Gift size={12} color="#DC2626" />
            <Text style={styles.compactSavingsText}>
              {formatBulkSavings(pricing.totalSavings, t('common.locale'))}
            </Text>
          </View>
        )}

        {nextTier && showUpsell && (
          <TouchableOpacity
            style={styles.compactUpsell}
            onPress={handleUpsellClick}
          >
            <ArrowUp size={10} color="#059669" />
            <Text style={styles.compactUpsellText}>
              {nextTier.min_quantity}+ for {formatMMK(nextTier.bulk_price)}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Current Bulk Pricing Status */}
      {hasActiveBulkPricing && (
        <View style={styles.activeBulkPricing}>
          <View style={styles.bulkPricingHeader}>
            <TrendingDown size={16} color="#059669" />
            <Text style={styles.bulkPricingTitle}>
              {t('bulkPricing.bulkDiscount')}
            </Text>
          </View>

          <View style={styles.pricingDetails}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {t('bulkPricing.regularPrice')}:
              </Text>
              <Text style={[styles.priceValue, styles.originalPrice]}>
                {formatMMK(pricing.originalPrice)}
              </Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                {t('bulkPricing.bestPrice')}:
              </Text>
              <Text style={[styles.priceValue, styles.bulkPrice]}>
                {formatMMK(pricing.bulkPrice)}
              </Text>
            </View>

            <View style={styles.savingsRow}>
              <Gift size={14} color="#DC2626" />
              <Text style={styles.savingsText}>
                {t('bulkPricing.youSave')}: {formatMMK(pricing.totalSavings)} (
                {pricing.discountPercentage.toFixed(1)}%)
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Upsell to Next Tier */}
      {nextTier && showUpsell && (
        <TouchableOpacity
          style={styles.upsellContainer}
          onPress={handleUpsellClick}
        >
          <View style={styles.upsellContent}>
            <ArrowUp size={16} color="#059669" />
            <View style={styles.upsellText}>
              <Text style={styles.upsellTitle}>
                {t('bulkPricing.getMoreSavings')}
              </Text>
              <Text style={styles.upsellDetails}>
                {t('bulkPricing.buy')} {nextTier.min_quantity}+{' '}
                {t('bulkPricing.for')} {formatMMK(nextTier.bulk_price)}{' '}
                {t('bulkPricing.each')}
              </Text>
              <Text style={styles.upsellSavings}>
                {t('bulkPricing.additionalSavings')}:{' '}
                {formatMMK(
                  (product.price - nextTier.bulk_price) *
                    nextTier.min_quantity -
                    pricing.totalSavings
                )}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      )}

      {/* Bulk Pricing Tiers Overview */}
      {!hasActiveBulkPricing && product.bulk_pricing && (
        <View style={styles.tiersOverview}>
          <Text style={styles.tiersTitle}>
            {t('bulkPricing.quantityBreaks')}
          </Text>
          <View style={styles.tiersList}>
            {product.bulk_pricing
              .sort((a, b) => a.min_quantity - b.min_quantity)
              .map((tier, index) => {
                const tierDiscount =
                  ((product.price - tier.bulk_price) / product.price) * 100;
                return (
                  <View key={index} style={styles.tierItem}>
                    <Text style={styles.tierQuantity}>
                      {tier.min_quantity}+
                    </Text>
                    <Text style={styles.tierPrice}>
                      {formatMMK(tier.bulk_price)}
                    </Text>
                    <Text style={styles.tierDiscount}>
                      ({tierDiscount.toFixed(0)}% {t('bulkPricing.off')})
                    </Text>
                  </View>
                );
              })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },

  // Active bulk pricing styles
  activeBulkPricing: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  bulkPricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bulkPricingTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
    marginLeft: 6,
  },
  pricingDetails: {
    gap: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  originalPrice: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  bulkPrice: {
    color: '#059669',
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#BBF7D0',
  },
  savingsText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
    marginLeft: 4,
  },

  // Upsell styles
  upsellContainer: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  upsellContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  upsellText: {
    flex: 1,
    marginLeft: 8,
  },
  upsellTitle: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#1D4ED8',
  },
  upsellDetails: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  upsellSavings: {
    fontSize: 11,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
    marginTop: 2,
  },

  // Tiers overview styles
  tiersOverview: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  tiersTitle: {
    fontSize: 13,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
    marginBottom: 8,
  },
  tiersList: {
    gap: 4,
  },
  tierItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierQuantity: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#059669',
    minWidth: 30,
  },
  tierPrice: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  tierDiscount: {
    fontSize: 11,
    fontFamily: 'Inter-Regular',
    color: '#DC2626',
  },

  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  compactSavings: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactSavingsText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
    marginLeft: 2,
  },
  compactUpsell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactUpsellText: {
    fontSize: 9,
    fontFamily: 'Inter-Medium',
    color: '#059669',
    marginLeft: 2,
  },
});
