import React, { useState, useEffect } from 'react';
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
// import { useCurrencyFormatter } from '@/context/CurrencyContext';

interface BulkPricingTier {
  id?: string;
  min_quantity: number;
  bulk_price: number;
}

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

  const addTier = () => {
    const newTier: BulkPricingTier = {
      min_quantity: 1,
      bulk_price: productPrice,
    };
    setTiers([...tiers, newTier]);
    setShowForm(true);
  };

  const updateTier = (
    index: number,
    field: keyof BulkPricingTier,
    value: string
  ) => {
    const updatedTiers = [...tiers];
    const numValue = parseInt(value) || 0;

    if (field === 'min_quantity') {
      updatedTiers[index].min_quantity = numValue;
    } else if (field === 'bulk_price') {
      updatedTiers[index].bulk_price = numValue;
    }

    setTiers(updatedTiers);
  };

  const removeTier = (index: number) => {
    Alert.alert(t('common.confirm'), t('bulkPricing.confirmDeleteTier'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          const updatedTiers = tiers.filter((_, i) => i !== index);
          setTiers(updatedTiers);
        },
      },
    ]);
  };

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

  const renderTierCard = (tier: BulkPricingTier, index: number) => (
    <Card key={index} style={styles.tierCard}>
      <View style={styles.tierHeader}>
        <View style={styles.tierInfo}>
          <Package size={16} color="#059669" />
          <Text style={styles.tierTitle} weight="medium">
            {t('bulkPricing.tier')} {index + 1}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteTierButton}
          onPress={() => removeTier(tiers.indexOf(tier))}
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
            value={tier.min_quantity.toString()}
            onChangeText={(text) =>
              updateTier(tiers.indexOf(tier), 'min_quantity', text)
            }
            keyboardType="numeric"
            placeholder="1"
          />
        </View>

        <View style={styles.tierInputGroup}>
          <PriceInput
            label={t('bulkPricing.bulkPrice')}
            value={tier.bulk_price.toString()}
            onChangeText={(text) =>
              updateTier(tiers.indexOf(tier), 'bulk_price', text)
            }
            showCurrencyHint={false}
          />
        </View>
      </View>

      <View style={styles.tierPreview}>
        <Text style={styles.tierPreviewText} weight="medium">
          {t('bulkPricing.preview')}: {formatPrice(tier.bulk_price)}
          <Text style={styles.discountText}>
            {' '}
            ({getDiscountPercentage(tier.bulk_price).toFixed(1)}%{' '}
            {t('bulkPricing.off')})
          </Text>
        </Text>
      </View>
    </Card>
  );

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
          {getSortedTiers().map((tier, index) => renderTierCard(tier, index))}
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
