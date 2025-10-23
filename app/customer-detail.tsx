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
} from 'lucide-react-native';
import { Card } from '@/components/Card';
import { CustomerForm } from '@/components/CustomerForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useCustomer, useCustomerMutations } from '@/hooks/useQueries';
import { useTranslation } from '@/context/LocalizationContext';
import { useCurrencyFormatter } from '@/context/CurrencyContext';
import { useToast } from '@/context/ToastContext';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CustomerDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { deleteCustomer } = useCustomerMutations();

  const [showEditForm, setShowEditForm] = useState(false);

  const { data: customer, isLoading, error, refetch } = useCustomer(id!);
  const { formatPrice } = useCurrencyFormatter();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleEdit = () => {
    setShowEditForm(true);
  };

  const handleDelete = () => {
    if (!customer) return;

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
      ]
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
          <Text style={styles.headerSubtitle}>Customer Details</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerAction} onPress={handleEdit}>
            <Edit size={20} color="#059669" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerAction} onPress={handleDelete}>
            <Trash2 size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
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
                    Math.round(customer.total_spent / customer.visit_count)
                  )
                : formatPrice(0)}
            </Text>
            <Text style={styles.statLabel} weight="medium">
              {t('customers.avgOrder')}
            </Text>
          </Card>
        </View>

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
              <TouchableOpacity style={styles.viewHistoryButton}>
                <Text style={styles.viewHistoryButtonText} weight="medium">
                  View Full History
                </Text>
              </TouchableOpacity>
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

      {/* Edit Customer Form */}
      <CustomerForm
        visible={showEditForm}
        onClose={() => setShowEditForm(false)}
        customer={customer}
        onSuccess={() => {
          refetch();
        }}
      />
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
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAction: {
    padding: 8,
    marginLeft: 4,
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
});
