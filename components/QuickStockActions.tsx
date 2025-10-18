import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StockMovementForm } from '@/components/StockMovementForm';
import { Product } from '@/services/database';
import { useStockMovementMutations } from '@/hooks/useQueries';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  Package,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';
import { useToast } from '@/context/ToastContext';

interface QuickStockActionsProps {
  product: Product;
  onStockUpdated?: () => void;
  compact?: boolean;
}

export const QuickStockActions: React.FC<QuickStockActionsProps> = ({
  product,
  onStockUpdated,
  compact = false,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [quickQuantity, setQuickQuantity] = useState('');
  const [quickType, setQuickType] = useState<'stock_in' | 'stock_out'>(
    'stock_in'
  );
  const [showFullForm, setShowFullForm] = useState(false);
  const [fullFormType, setFullFormType] = useState<'stock_in' | 'stock_out'>(
    'stock_in'
  );

  const { addStockMovement } = useStockMovementMutations();

  const handleQuickMovement = async () => {
    const quantity = parseInt(quickQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert(t('common.error'), t('stockMovement.enterValidQuantity'));
      return;
    }

    if (quickType === 'stock_out' && quantity > product.quantity) {
      Alert.alert(
        t('common.error'),
        t('stockMovement.insufficientStock', {
          available: product.quantity,
          requested: quantity,
        })
      );
      return;
    }

    try {
      await addStockMovement.mutateAsync({
        product_id: product.id,
        type: quickType,
        quantity,
        reason:
          quickType === 'stock_in'
            ? t('stockMovement.quickStockIn')
            : t('stockMovement.quickStockOut'),
      });

      showToast(
        quickType === 'stock_in'
          ? t('stockMovement.stockAddedSuccessfully')
          : t('stockMovement.stockRemovedSuccessfully'),
        'success'
      );

      setShowQuickForm(false);
      setQuickQuantity('');
      onStockUpdated?.();
    } catch (error) {
      Alert.alert(t('common.error'), t('stockMovement.failedToProcess'));
      console.error('Error processing quick stock movement:', error);
    }
  };

  const handleFullFormOpen = (type: 'stock_in' | 'stock_out') => {
    setFullFormType(type);
    setShowFullForm(true);
  };

  const renderModals = () => (
    <>
      {/* Quick Form Modal */}
      {showQuickForm && (
        <View style={styles.quickFormOverlay}>
          <View style={styles.quickFormContainer}>
            <View style={styles.quickFormHeader}>
              <View style={styles.quickFormIcon}>
                {quickType === 'stock_in' ? (
                  <TrendingUp size={20} color="#059669" />
                ) : (
                  <TrendingDown size={20} color="#EF4444" />
                )}
              </View>
              <Text style={styles.quickFormTitle} weight="medium">
                {quickType === 'stock_in'
                  ? t('stockMovement.addStock')
                  : t('stockMovement.removeStock')}
              </Text>
            </View>

            <Text style={styles.quickFormSubtitle}>
              {product.name} - {t('stockMovement.currentStock')}:{' '}
              {product.quantity}
            </Text>

            <TextInput
              style={styles.quickFormInput}
              placeholder={t('stockMovement.enterQuantity')}
              value={quickQuantity}
              onChangeText={setQuickQuantity}
              keyboardType="numeric"
              autoFocus
            />

            <View style={styles.quickFormActions}>
              <Button
                title={t('common.cancel')}
                onPress={() => {
                  setShowQuickForm(false);
                  setQuickQuantity('');
                }}
                variant="secondary"
                style={styles.quickFormButton}
              />
              <Button
                title={t('common.confirm')}
                onPress={handleQuickMovement}
                style={styles.quickFormButton}
                disabled={addStockMovement.isPending}
              />
            </View>

            <TouchableOpacity
              style={styles.fullFormLink}
              onPress={() => {
                setShowQuickForm(false);
                handleFullFormOpen(quickType);
              }}
            >
              <Text style={styles.fullFormLinkText} weight="medium">
                {t('stockMovement.useFullForm')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Full Stock Movement Form */}
      <StockMovementForm
        visible={showFullForm}
        onClose={() => {
          setShowFullForm(false);
          onStockUpdated?.();
        }}
        product={product}
        initialType={fullFormType}
      />
    </>
  );

  if (compact) {
    return (
      <>
        <View style={styles.compactContainer}>
          <TouchableOpacity
            style={[styles.compactButton, styles.stockInButton]}
            onPress={() => {
              setQuickType('stock_in');
              setShowQuickForm(true);
            }}
          >
            <Plus size={12} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.compactButton, styles.stockOutButton]}
            onPress={() => {
              setQuickType('stock_out');
              setShowQuickForm(true);
            }}
          >
            <Minus size={12} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {renderModals()}
      </>
    );
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Package size={20} color="#6B7280" />
        <Text style={styles.title} weight="medium">
          {t('stockMovement.quickActions')}
        </Text>
      </View>

      <View style={styles.currentStock}>
        <Text style={styles.currentStockLabel} weight="medium">
          {t('stockMovement.currentStock')}:
        </Text>
        <Text
          style={[
            styles.currentStockValue,
            product.quantity <= product.min_stock && styles.lowStockValue,
          ]}
          weight="bold"
        >
          {product.quantity}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionCard, styles.stockInCard]}
          onPress={() => {
            setQuickType('stock_in');
            setShowQuickForm(true);
          }}
        >
          <TrendingUp size={24} color="#059669" />
          <Text style={styles.actionCardTitle} weight="medium">
            {t('stockMovement.addStock')}
          </Text>
          <Text style={styles.actionCardSubtitle}>
            {t('stockMovement.stockIn')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.stockOutCard]}
          onPress={() => {
            setQuickType('stock_out');
            setShowQuickForm(true);
          }}
        >
          <TrendingDown size={24} color="#EF4444" />
          <Text style={styles.actionCardTitle} weight="medium">
            {t('stockMovement.removeStock')}
          </Text>
          <Text style={styles.actionCardSubtitle}>
            {t('stockMovement.stockOut')}
          </Text>
        </TouchableOpacity>
      </View>

      {renderModals()}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    color: '#111827',
  },
  currentStock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  currentStockLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  currentStockValue: {
    fontSize: 18,
    color: '#111827',
  },
  lowStockValue: {
    color: '#EF4444',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  stockInCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  stockOutCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionCardTitle: {
    fontSize: 14,
    color: '#111827',
    marginTop: 8,
    textAlign: 'center',
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },

  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  compactButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockInButton: {
    backgroundColor: '#059669',
  },
  stockOutButton: {
    backgroundColor: '#EF4444',
  },

  // Quick form styles
  quickFormOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  quickFormContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    minWidth: 300,
  },
  quickFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  quickFormIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickFormTitle: {
    fontSize: 18,
    color: '#111827',
    flex: 1,
  },
  quickFormSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  quickFormInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
    marginBottom: 20,
  },
  quickFormActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickFormButton: {
    flex: 1,
  },
  fullFormLink: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  fullFormLinkText: {
    fontSize: 14,
    color: '#3B82F6',
  },
});
