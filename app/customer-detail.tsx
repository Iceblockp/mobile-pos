import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShoppingBag,
  TrendingUp,
  User,
  FileText,
  MoreVertical,
} from 'lucide-react-native';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useCustomer, useCustomerMutations } from '@/hooks/useQueries';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { useToast } from '@/context/ToastContext';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useDatabase } from '@/context/DatabaseContext';

export default function CustomerDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { deleteCustomer } = useCustomerMutations();
  const { db } = useDatabase();

  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const { data: customer, isLoading, error, refetch } = useCustomer(id!);
  const { formatPrice } = useCurrencyFormatter();

  // Fetch customer debt balance
  const { data: debtBalance = 0 } = useQuery({
    queryKey: ['customerDebtBalance', id],
    queryFn: async () => {
      if (!db) return 0;
      return await db.getCustomerDebtBalance(id!);
    },
    enabled: !!id && !!db,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEdit = () => {
    setShowActionsMenu(false);
    router.push(`/customer-form?id=${customer?.id}`);
  };

  const handleDelete = () => {
    if (!customer) return;

    setShowActionsMenu(false);

    Alert.alert(
      t('customers.deleteCustomer'),
      t('customers.deleteConfirmation', { name: customer.name }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCustomer.mutateAsync(customer.id);
              showToast(t('customers.customerDeleted'), 'success');
              router.back();
            } catch (error) {
              console.error('Error deleting customer:', error);
              Alert.alert(t('common.error'), t('customers.failedToDelete'));
            }
          },
        },
      ],
    );
  };

  const handleCall = () => {
    if (customer?.phone) {
      // TODO: Implement phone call functionality
      showToast('Call feature coming soon', 'info');
    }
  };

  const handleEmail = () => {
    if (customer?.email) {
      // TODO: Implement email functionality
      showToast('Email feature coming soon', 'info');
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !customer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>
            {error ? t('common.errorLoadingData') : 'Customer not found'}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText} weight="medium">
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} weight="bold">
            {customer.name}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setShowActionsMenu(!showActionsMenu)}
        >
          <MoreVertical size={24} color="#111827" />
        </TouchableOpacity>

        {/* Actions Dropdown Menu */}
        {showActionsMenu && (
          <View style={styles.actionsMenu}>
            <TouchableOpacity
              style={styles.actionsMenuItem}
              onPress={handleEdit}
            >
              <Edit size={18} color="#059669" />
              <Text style={styles.actionsMenuItemText}>{t('common.edit')}</Text>
            </TouchableOpacity>

            <View style={styles.actionsMenuDivider} />

            <TouchableOpacity
              style={styles.actionsMenuItem}
              onPress={handleDelete}
            >
              <Trash2 size={18} color="#EF4444" />
              <Text style={[styles.actionsMenuItemText, styles.deleteText]}>
                {t('common.delete')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Customer Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.customerHeader}>
            <View style={styles.avatarContainer}>
              <User size={32} color="#059669" />
            </View>
            <View style={styles.customerBasicInfo}>
              <Text style={styles.customerName} weight="bold">
                {customer.name}
              </Text>
              <Text style={styles.customerSince}>
                Customer since {formatDate(customer.created_at)}
              </Text>
            </View>
          </View>

          <View style={styles.contactInfo}>
            {customer.phone && (
              <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
                <Phone size={16} color="#6B7280" />
                <Text style={styles.contactText}>{customer.phone}</Text>
              </TouchableOpacity>
            )}
            {customer.email && (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={handleEmail}
              >
                <Mail size={16} color="#6B7280" />
                <Text style={styles.contactText}>{customer.email}</Text>
              </TouchableOpacity>
            )}
            {customer.address && (
              <View style={styles.contactItem}>
                <MapPin size={16} color="#6B7280" />
                <Text style={styles.contactText}>{customer.address}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Statistics Cards */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <ShoppingBag size={24} color="#059669" />
            </View>
            <Text style={styles.statValue} weight="bold">
              {formatPrice(customer.total_spent)}
            </Text>
            <Text style={styles.statLabel} weight="medium">
              {t('customers.totalSpent')}
            </Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Calendar size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statValue} weight="bold">
              {customer.visit_count}
            </Text>
            <Text style={styles.statLabel} weight="medium">
              {t('customers.visits')}
            </Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <TrendingUp size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statValue} weight="bold">
              {customer.visit_count > 0
                ? formatPrice(
                    Math.round(customer.total_spent / customer.visit_count),
                  )
                : formatPrice(0)}
            </Text>
            <Text style={styles.statLabel} weight="medium">
              {t('customers.avgOrder')}
            </Text>
          </Card>
        </View>

        {/* Debt Balance Card - Only show if customer has debt */}
        {debtBalance > 0 && (
          <Card style={styles.debtCard}>
            <View style={styles.debtHeader}>
              <View style={styles.debtIconContainer}>
                <FileText size={24} color="#F59E0B" />
              </View>
              <View style={styles.debtInfo}>
                <Text style={styles.debtLabel} weight="medium">
                  {t('debt.debtBalance')}
                </Text>
                <Text style={styles.debtValue} weight="bold">
                  {formatPrice(debtBalance)}
                </Text>
              </View>
            </View>
            <Text style={styles.debtDescription}>
              This customer has outstanding debt from sales made on credit.
            </Text>
          </Card>
        )}

        {/* Purchase History */}
        <Card style={styles.historyCard}>
          <Text style={styles.sectionTitle} weight="medium">
            Purchase History
          </Text>
          {customer.visit_count > 0 ? (
            <View style={styles.historyContent}>
              <Text style={styles.historyText}>
                This customer has made {customer.visit_count} purchase
                {customer.visit_count !== 1 ? 's' : ''}
                with a total value of {formatPrice(customer.total_spent)}.
              </Text>
              {/* <TouchableOpacity style={styles.viewHistoryButton}>
                <Text style={styles.viewHistoryButtonText} weight="medium">
                  View Full History
                </Text>
              </TouchableOpacity> */}
            </View>
          ) : (
            <View style={styles.noHistoryContent}>
              <Text style={styles.noHistoryText}>
                This customer hasn't made any purchases yet.
              </Text>
            </View>
          )}
        </Card>

        {/* Customer Notes */}
        <Card style={styles.notesCard}>
          <Text style={styles.sectionTitle} weight="medium">
            Notes
          </Text>
          <Text style={styles.notesText}>
            Customer notes and preferences will be available in a future update.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    color: '#111827',
  },
  moreButton: {
    padding: 4,
  },
  actionsMenu: {
    position: 'absolute',
    top: 60,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  actionsMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionsMenuItemText: {
    fontSize: 15,
    color: '#111827',
  },
  deleteText: {
    color: '#EF4444',
  },
  actionsMenuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    marginBottom: 16,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  customerBasicInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 24,
    color: '#111827',
    marginBottom: 4,
  },
  customerSince: {
    fontSize: 14,
    color: '#6B7280',
  },
  contactInfo: {
    gap: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactText: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  historyCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#111827',
    marginBottom: 12,
  },
  historyContent: {
    alignItems: 'flex-start',
  },
  historyText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  viewHistoryButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  viewHistoryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  noHistoryContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noHistoryText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  notesCard: {
    marginBottom: 16,
  },
  notesText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  debtCard: {
    marginBottom: 16,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  debtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  debtIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  debtInfo: {
    flex: 1,
  },
  debtLabel: {
    fontSize: 14,
    color: '#92400E',
    marginBottom: 4,
  },
  debtValue: {
    fontSize: 24,
    color: '#D97706',
  },
  debtDescription: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
});
