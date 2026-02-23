import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  FlatList,
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
  Receipt,
} from 'lucide-react-native';
import { Card } from '@/components/Card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  useCustomer,
  useCustomerMutations,
  useInfiniteCustomerSales,
} from '@/hooks/useQueries';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { useToast } from '@/context/ToastContext';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useDatabase } from '@/context/DatabaseContext';
import { Sale } from '@/services/database';

type TabType = 'overview' | 'sales';

export default function CustomerDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { deleteCustomer } = useCustomerMutations();
  const { db } = useDatabase();

  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

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

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <User
            size={18}
            color={activeTab === 'overview' ? '#059669' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'overview' && styles.tabTextActive,
            ]}
            weight={activeTab === 'overview' ? 'medium' : 'regular'}
          >
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sales' && styles.tabActive]}
          onPress={() => setActiveTab('sales')}
        >
          <Receipt
            size={18}
            color={activeTab === 'sales' ? '#059669' : '#6B7280'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'sales' && styles.tabTextActive,
            ]}
            weight={activeTab === 'sales' ? 'medium' : 'regular'}
          >
            Sales History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' ? (
        <OverviewTab
          customer={customer}
          debtBalance={debtBalance}
          formatPrice={formatPrice}
          formatDate={formatDate}
          handleCall={handleCall}
          handleEmail={handleEmail}
          t={t}
        />
      ) : (
        <SalesHistoryTab customerId={id!} />
      )}
    </SafeAreaView>
  );
}

// Overview Tab Component
function OverviewTab({
  customer,
  debtBalance,
  formatPrice,
  formatDate,
  handleCall,
  handleEmail,
  t,
}: any) {
  return (
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
            <TouchableOpacity style={styles.contactItem} onPress={handleEmail}>
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

      {/* Debt Balance Card */}
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
    </ScrollView>
  );
}

// Sales History Tab Component
function SalesHistoryTab({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { formatPrice } = useCurrencyFormatter();
  const { t } = useTranslation();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useInfiniteCustomerSales(customerId);

  const sales = data?.pages.flat() || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderSaleItem = ({ item }: { item: Sale }) => (
    <TouchableOpacity
      style={styles.saleCard}
      onPress={() =>
        router.push({
          pathname: '/(drawer)/sale-detail',
          params: { sale: JSON.stringify(item) },
        })
      }
    >
      <View style={styles.saleCardHeader}>
        <View style={styles.saleCardLeft}>
          <Text style={styles.saleVoucher} weight="medium">
            {item.voucher_id}
          </Text>
          <Text style={styles.saleDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.saleCardRight}>
          <Text style={styles.saleTotal} weight="bold">
            {formatPrice(item.total)}
          </Text>
          <View style={styles.paymentBadge}>
            <Text style={styles.paymentBadgeText}>{item.payment_method}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.loadingMore}>
        <LoadingSpinner />
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptySales}>
      <Receipt size={64} color="#D1D5DB" />
      <Text style={styles.emptySalesTitle} weight="medium">
        No Sales Yet
      </Text>
      <Text style={styles.emptySalesText}>
        This customer hasn't made any purchases yet.
      </Text>
    </View>
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.salesHistoryContainer}>
      <FlatList
        data={sales}
        renderItem={renderSaleItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.salesList,
          sales.length === 0 && styles.salesListEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    justifyContent: 'space-between',
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
    // flex: 1,
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#059669',
  },
  tabText: {
    fontSize: 15,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#059669',
  },
  salesHistoryContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  salesList: {
    padding: 16,
  },
  salesListEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  saleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  saleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saleCardLeft: {
    flex: 1,
  },
  saleVoucher: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 4,
  },
  saleDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  saleCardRight: {
    alignItems: 'flex-end',
  },
  saleTotal: {
    fontSize: 18,
    color: '#059669',
    marginBottom: 4,
  },
  paymentBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  paymentBadgeText: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptySales: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptySalesTitle: {
    fontSize: 20,
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySalesText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
