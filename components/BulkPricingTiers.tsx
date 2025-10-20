import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { PriceInput } from '@/components/PriceInput';
import { Plus, Trash2, Package, TrendingDown } from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/hooks/useCurrency';

interface BulkPricingTier {
  id?: string;
  min_quantity: number;
  bulk_price: number;
}

interface TierCardProps {
  tier: BulkPricingTier;
  index: number;
  productPrice: number;
  onUpdate: (index: number, updatedTier: BulkPricingTier) => void;
  onRemove: (index: number) => void;
}

const TierCard: React.FC<TierCardProps> = ({
  tier,
  index,
  productPrice,
  onUpdate,
  onRemove,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();
  const [localTier, setLocalTier] = useState<BulkPricingTier>(tier);

  // Update local state when prop changes
  useEffect(() => {
    setLocalTier(tier);
  }, [tier]);

  // Debounced update to parent
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onUpdate(index, localTier);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [localTier, index, onUpdate]);

  const handleQuantityChange = useCallback((text: string) => {
    const numValue = parseInt(text) || 0;
    setLocalTier((prev) => ({ ...prev, min_quantity: numValue }));
  }, []);

  const handlePriceChange = useCallback((text: number) => {
    const numValue = Number(text) || 0;
    setLocalTier((prev) => ({ ...prev, bulk_price: text }));
  }, []);

  const handleRemove = useCallback(() => {
    Alert.alert(t('common.confirm'), t('bulkPricing.confirmDeleteTier'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => onRemove(index),
      },
    ]);
  }, [index, onRemove, t]);

  const getDiscountPercentage = (bulkPrice: number) => {
    if (productPrice <= 0) return 0;
    return ((productPrice - bulkPrice) / productPrice) * 100;
  };

  return (
    <Card style={styles.tierCard}>
      <View style={styles.tierHeader}>
        <View style={styles.tierInfo}>
          <Package size={16} color="#059669" />
          <Text style={styles.tierTitle} weight="medium">
            {t('bulkPricing.tier')} {index + 1}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteTierButton}
          onPress={handleRemove}
        >
          <Trash2 size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <View style={styles.tierInputs}>
        <View style={styles.tierInputGroup}>
          <Text style={styles.tierInputLabel} weight="medium">
            {t('bulkPricing.minQuantity')}
          </Text>
          <TextInput
            style={styles.tierInput}
            value={localTier.min_quantity.toString()}
            onChangeText={handleQuantityChange}
            keyboardType="numeric"
            placeholder="1"
          />
        </View>

        <View style={styles.tierInputGroup}>
          <PriceInput
            label={t('bulkPricing.bulkPrice')}
            value={localTier.bulk_price.toString()}
            onValueChange={(text, numericValue) =>
              handlePriceChange(numericValue)
            }
            showCurrencyHint={false}
            isSmall={true}
          />
        </View>
      </View>

      <View style={styles.tierPreview}>
        <Text style={styles.tierPreviewText} weight="medium">
          {t('bulkPricing.preview')}: {formatPrice(localTier.bulk_price)}
          <Text style={styles.discountText}>
            {' '}
            ({getDiscountPercentage(localTier.bulk_price).toFixed(1)}%{' '}
            {t('bulkPricing.off')})
          </Text>
        </Text>
      </View>
    </Card>
  );
};

interface BulkPricingTiersProps {
  productPrice: number;
  initialTiers?: BulkPricingTier[];
  onTiersChange: (tiers: BulkPricingTier[]) => void;
  compact?: boolean;
}

export const BulkPricingTiers: React.FC<BulkPricingTiersProps> = ({
  productPrice,
  initialTiers = [],
  onTiersChange,
  compact = false,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();
  const [tiers, setTiers] = useState<BulkPricingTier[]>(initialTiers);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setTiers(initialTiers);
  }, [initialTiers]);

  useEffect(() => {
    onTiersChange(tiers);
  }, [tiers, onTiersChange]);

  const addTier = useCallback(() => {
    const newTier: BulkPricingTier = {
      min_quantity: 1,
      bulk_price: productPrice,
    };
    setTiers((prev) => [...prev, newTier]);
    setShowForm(true);
  }, [productPrice]);

  const updateTier = useCallback(
    (index: number, updatedTier: BulkPricingTier) => {
      setTiers((prev) => {
        const newTiers = [...prev];
        newTiers[index] = updatedTier;
        return newTiers;
      });
    },
    []
  );

  const removeTier = useCallback((index: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const validateTiers = (): string[] => {
    const errors: string[] = [];

    // Check for duplicate quantities
    const quantities = tiers.map((tier) => tier.min_quantity);
    const duplicates = quantities.filter(
      (item, index) => quantities.indexOf(item) !== index
    );
    if (duplicates.length > 0) {
      errors.push(t('bulkPricing.duplicateQuantities'));
    }

    // Check that bulk prices are less than regular price
    tiers.forEach((tier, index) => {
      if (tier.bulk_price >= productPrice) {
        errors.push(t('bulkPricing.bulkPriceTooHigh', { tier: index + 1 }));
      }
      if (tier.min_quantity <= 0) {
        errors.push(t('bulkPricing.invalidQuantity', { tier: index + 1 }));
      }
    });

    return errors;
  };

  const getDiscountPercentage = (bulkPrice: number) => {
    if (productPrice <= 0) return 0;
    return ((productPrice - bulkPrice) / productPrice) * 100;
  };

  const getSortedTiers = () => {
    return [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  };

  const renderCompactView = () => {
    // If no tiers, don't render anything in compact mode
    if (!initialTiers || initialTiers.length === 0) {
      return null;
    }

    const sortedTiers = [...initialTiers].sort(
      (a, b) => a.min_quantity - b.min_quantity
    );

    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <TrendingDown size={14} color="#059669" />
          <Text style={styles.compactTitle} weight="medium">
            {t('bulkPricing.bulkPricing')} ({initialTiers.length})
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.compactTiers}>
            {sortedTiers.map((tier, index) => (
              <View key={index} style={styles.compactTier}>
                <Text style={styles.compactTierQuantity} weight="medium">
                  {tier.min_quantity}+
                </Text>
                <Text style={styles.compactTierPrice} weight="medium">
                  {formatPrice(tier.bulk_price)}
                </Text>
                <Text style={styles.compactTierDiscount}>
                  {getDiscountPercentage(tier.bulk_price).toFixed(0)}% off
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  if (compact) {
    return renderCompactView();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TrendingDown size={20} color="#059669" />
          <Text style={styles.title} weight="medium">
            {t('bulkPricing.bulkPricing')}
          </Text>
        </View>
        <TouchableOpacity style={styles.addTierButton} onPress={addTier}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addTierButtonText} weight="medium">
            {t('bulkPricing.addTier')}
          </Text>
        </TouchableOpacity>
      </View>

      {tiers.length === 0 ? (
        <View style={styles.emptyState}>
          <Package size={32} color="#9CA3AF" />
          <Text style={styles.emptyStateText} weight="medium">
            {t('bulkPricing.noTiers')}
          </Text>
          <Text style={styles.emptyStateSubtext}>
            {t('bulkPricing.addTierToStart')}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.tiersContainer}
          showsVerticalScrollIndicator={false}
        >
          {getSortedTiers().map((tier, index) => {
            // Find the original index in the unsorted array
            const originalIndex = tiers.findIndex((t) => t === tier);
            return (
              <TierCard
                key={originalIndex}
                tier={tier}
                index={index}
                productPrice={productPrice}
                onUpdate={updateTier}
                onRemove={removeTier}
              />
            );
          })}
        </ScrollView>
      )}

      {tiers.length > 0 && (
        <View style={styles.validation}>
          {validateTiers().map((error, index) => (
            <Text key={index} style={styles.validationError}>
              • {error}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 8,
  },
  addTierButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addTierButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  tiersContainer: {
    maxHeight: 300,
  },
  tierCard: {
    marginBottom: 12,
    padding: 16,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierTitle: {
    fontSize: 14,
    color: '#111827',
    marginLeft: 8,
  },
  deleteTierButton: {
    padding: 4,
  },
  tierInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  tierInputGroup: {
    flex: 1,
  },
  tierInputLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  tierInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  tierPreview: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  tierPreviewText: {
    fontSize: 12,
    color: '#059669',
  },
  discountText: {
    color: '#DC2626',
  },
  validation: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
  validationError: {
    fontSize: 12,
    color: '#DC2626',
    marginBottom: 2,
  },
  // Compact view styles
  compactContainer: {
    marginVertical: 8,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactTitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  addTierButtonCompact: {
    backgroundColor: '#059669',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactTiers: {
    flexDirection: 'row',
    gap: 8,
  },
  compactTier: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    minWidth: 60,
  },
  compactTierQuantity: {
    fontSize: 10,
    color: '#059669',
  },
  compactTierPrice: {
    fontSize: 9,
    color: '#111827',
  },
  compactTierDiscount: {
    fontSize: 8,
    color: '#DC2626',
  },
});
