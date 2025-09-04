import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '@/components/Card';
import { User, Phone, Mail, MapPin, Edit, Trash2 } from 'lucide-react-native';
import { Customer } from '@/services/database';
import { useTranslation } from '@/context/LocalizationContext';

interface CustomerCardProps {
  customer: Customer;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  showActions?: boolean;
}

export const CustomerCard: React.FC<CustomerCardProps> = ({
  customer,
  onEdit,
  onDelete,
  showActions = true,
}) => {
  const { t } = useTranslation();

  const formatMMK = (amount: number) => {
    return (
      new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount) + ' MMK'
    );
  };

  return (
    <Card style={styles.customerCard}>
      <View style={styles.customerHeader}>
        <View style={styles.customerInfo}>
          <View style={styles.nameRow}>
            <User size={18} color="#059669" />
            <Text style={styles.customerName}>{customer.name}</Text>
          </View>

          {customer.phone && (
            <View style={styles.contactRow}>
              <Phone size={14} color="#6B7280" />
              <Text style={styles.contactText}>{customer.phone}</Text>
            </View>
          )}

          {customer.email && (
            <View style={styles.contactRow}>
              <Mail size={14} color="#6B7280" />
              <Text style={styles.contactText}>{customer.email}</Text>
            </View>
          )}

          {customer.address && (
            <View style={styles.contactRow}>
              <MapPin size={14} color="#6B7280" />
              <Text style={styles.contactText} numberOfLines={2}>
                {customer.address}
              </Text>
            </View>
          )}
        </View>

        {showActions && (onEdit || onDelete) && (
          <View style={styles.customerActions}>
            {onEdit && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onEdit(customer)}
              >
                <Edit size={18} color="#6B7280" />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onDelete(customer)}
              >
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.customerStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{t('customers.totalSpent')}</Text>
          <Text style={styles.statValue}>
            {formatMMK(customer.total_spent)}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>{t('customers.visits')}</Text>
          <Text style={styles.statValue}>{customer.visit_count}</Text>
        </View>
        {customer.total_spent > 0 && customer.visit_count > 0 && (
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('customers.avgOrder')}</Text>
            <Text style={styles.statValue}>
              {formatMMK(
                Math.round(customer.total_spent / customer.visit_count)
              )}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  customerCard: {
    marginBottom: 12,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  customerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginLeft: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginLeft: 8,
    flex: 1,
  },
  customerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  customerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
  },
});
