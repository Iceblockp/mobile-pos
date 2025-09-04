import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { EnhancedMovementHistory } from '@/components/EnhancedMovementHistory';
import { StockMovementForm } from '@/components/StockMovementForm';
import { Product } from '@/services/database';
import {
  History,
  TrendingUp,
  TrendingDown,
  X,
  Plus,
  Minus,
} from 'lucide-react-native';
import { useTranslation } from '@/context/LocalizationContext';

interface ProductMovementHistoryProps {
  product: Product;
  compact?: boolean;
}

export const ProductMovementHistory: React.FC<ProductMovementHistoryProps> = ({
  product,
  compact = false,
}) => {
  const { t } = useTranslation();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showStockMovementForm, setShowStockMovementForm] = useState(false);
  const [movementType, setMovementType] = useState<'stock_in' | 'stock_out'>(
    'stock_in'
  );

  const handleQuickStockMovement = (type: 'stock_in' | 'stock_out') => {
    setMovementType(type);
    setShowStockMovementForm(true);
  };

  const renderModals = () => (
    <>
      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('stockMovement.history')} - {product.name}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowHistoryModal(false)}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <EnhancedMovementHistory
              productId={product.id}
              showProductName={false}
              showFilters={true}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Stock Movement Form */}
      <StockMovementForm
        visible={showStockMovementForm}
        onClose={() => setShowStockMovementForm(false)}
        product={product}
        initialType={movementType}
      />
    </>
  );

  if (compact) {
    return (
      <>
        <View style={styles.compactContainer}>
          <TouchableOpacity
            style={styles.compactButton}
            onPress={() => setShowHistoryModal(true)}
          >
            <History size={16} color="#6B7280" />
            <Text style={styles.compactButtonText}>
              {t('stockMovement.history')}
            </Text>
          </TouchableOpacity>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.stockInButton]}
              onPress={() => handleQuickStockMovement('stock_in')}
            >
              <Plus size={14} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionButton, styles.stockOutButton]}
              onPress={() => handleQuickStockMovement('stock_out')}
            >
              <Minus size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {renderModals()}
      </>
    );
  }

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('stockMovement.title')}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowHistoryModal(true)}
          >
            <History size={20} color="#6B7280" />
            <Text style={styles.actionButtonText}>
              {t('stockMovement.history')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.quickActionsContainer}>
        <Text style={styles.quickActionsTitle}>
          {t('stockMovement.quickActions')}
        </Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.quickActionCard, styles.stockInCard]}
            onPress={() => handleQuickStockMovement('stock_in')}
          >
            <TrendingUp size={24} color="#059669" />
            <Text style={styles.quickActionCardTitle}>
              {t('stockMovement.addStock')}
            </Text>
            <Text style={styles.quickActionCardSubtitle}>
              {t('stockMovement.stockIn')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionCard, styles.stockOutCard]}
            onPress={() => handleQuickStockMovement('stock_out')}
          >
            <TrendingDown size={24} color="#EF4444" />
            <Text style={styles.quickActionCardTitle}>
              {t('stockMovement.removeStock')}
            </Text>
            <Text style={styles.quickActionCardSubtitle}>
              {t('stockMovement.stockOut')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.recentMovements}>
        <Text style={styles.recentMovementsTitle}>
          {t('stockMovement.recentActivity')}
        </Text>
        <EnhancedMovementHistory
          productId={product.id}
          showProductName={false}
          compact={true}
          showFilters={false}
        />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  quickActionsContainer: {
    marginBottom: 20,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionCard: {
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
  quickActionCardTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginTop: 8,
    textAlign: 'center',
  },
  quickActionCardSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
    textAlign: 'center',
  },
  recentMovements: {
    marginTop: 8,
  },
  recentMovementsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 12,
  },

  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    gap: 6,
  },
  compactButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 4,
  },
  quickActionButton: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockInButton: {
    backgroundColor: '#059669',
  },
  stockOutButton: {
    backgroundColor: '#EF4444',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
});
