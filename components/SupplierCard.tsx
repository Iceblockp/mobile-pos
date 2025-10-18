import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { Ionicons } from '@expo/vector-icons';
import { SupplierWithStats } from '@/services/database';
import { useCurrencyFormatter } from '@/hooks/useCurrency';
import { useTranslation } from '@/context/LocalizationContext';

interface SupplierCardProps {
  supplier: SupplierWithStats;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}

export const SupplierCard: React.FC<SupplierCardProps> = ({
  supplier,
  onEdit,
  onDelete,
  onView,
}) => {
  const { t } = useTranslation();
  const { formatPrice } = useCurrencyFormatter();

  return (
    <TouchableOpacity style={styles.card} onPress={onView} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.supplierInfo}>
          <Text style={styles.supplierName} weight="medium">
            {supplier.name}
          </Text>
          <Text style={styles.contactName}>{supplier.contact_name}</Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Ionicons name="pencil" size={18} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Ionicons name="trash" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contactInfo}>
        <View style={styles.contactItem}>
          <Ionicons name="call" size={16} color="#6B7280" />
          <Text style={styles.contactText}>{supplier.phone}</Text>
        </View>
        {supplier.email && (
          <View style={styles.contactItem}>
            <Ionicons name="mail" size={16} color="#6B7280" />
            <Text style={styles.contactText}>{supplier.email}</Text>
          </View>
        )}
      </View>

      {supplier.address && (
        <View style={styles.addressContainer}>
          <Ionicons name="location" size={16} color="#6B7280" />
          <Text style={styles.addressText}>{supplier.address}</Text>
        </View>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue} weight="medium">
            {supplier.total_products || 0}
          </Text>
          <Text style={styles.statLabel}>
            {t('suppliers.supplierProducts')}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue} weight="medium">
            {supplier.recent_deliveries || 0}
          </Text>
          <Text style={styles.statLabel}>
            {t('suppliers.recentDeliveries')}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue} weight="medium">
            {formatPrice(supplier.total_purchase_value || 0)}
          </Text>
          <Text style={styles.statLabel}>{t('suppliers.purchaseValue')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 4,
  },
  contactName: {
    fontSize: 14,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
  },
  contactInfo: {
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  addressText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
