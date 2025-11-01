import React from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Check,
  Phone,
  MessageCircle,
  Clock,
} from 'lucide-react-native';
import { MyanmarText as Text } from '@/components/MyanmarText';
import { useTranslation } from '@/context/LocalizationContext';

const Pricing = () => {
  const { t } = useTranslation();

  const handleCallPress = () => {
    Linking.openURL('tel:+959425743536');
  };

  const handleViberPress = () => {
    Linking.openURL(
      'https://connect.viber.com/business/c0a79b98-7367-11f0-a346-26b09e574719'
    );
  };

  const isDiscountActive = () => {
    const discountEndDate = new Date('2025-12-01');
    const currentDate = new Date();
    return currentDate < discountEndDate;
  };

  const getDiscountedPrice = (originalPrice: number, planId: string) => {
    if (!isDiscountActive()) return originalPrice;

    // Special pricing for lifetime plan
    if (planId === 'lifetime') {
      return 48000;
    }

    // 50% discount for other plans
    return Math.floor(originalPrice * 0.5);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString() + ' MMK';
  };

  const pricingPlans = [
    {
      id: 'monthly',
      name: t('pricing.monthly'),
      duration: t('pricing.perMonth'),
      originalPrice: 3000,
      popular: false,
    },
    {
      id: 'yearly',
      name: t('pricing.yearly'),
      duration: t('pricing.perYear'),
      originalPrice: 30000,
      popular: true,
    },
    {
      id: 'lifetime',
      name: t('pricing.lifetime'),
      duration: t('pricing.oneTimePayment'),
      originalPrice: 85000,
      popular: false,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#374151" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Image
            source={require('@/assets/images/pos.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle} weight="bold">
            {t('pricing.title')}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Discount Banner */}
        {isDiscountActive() && (
          <View style={styles.discountBanner}>
            <Clock size={20} color="#DC2626" />
            <View style={styles.discountContent}>
              <Text style={styles.discountTitle} weight="bold">
                {t('pricing.limitedTimeOffer')}
              </Text>
              <Text style={styles.discountText}>
                {t('pricing.discountUntil')} December 1, 2025
              </Text>
            </View>
          </View>
        )}

        {/* Subtitle */}
        <View style={styles.subtitleContainer}>
          <Text style={styles.subtitle}>{t('pricing.subtitle')}</Text>
        </View>

        {/* Pricing Cards */}
        <View style={styles.pricingContainer}>
          {pricingPlans.map((plan) => {
            const discountedPrice = getDiscountedPrice(
              plan.originalPrice,
              plan.id
            );
            const hasDiscount =
              isDiscountActive() && discountedPrice !== plan.originalPrice;
            const discountPercentage = hasDiscount
              ? Math.round(
                  ((plan.originalPrice - discountedPrice) /
                    plan.originalPrice) *
                    100
                )
              : 0;

            return (
              <View
                key={plan.id}
                style={[styles.pricingCard, plan.popular && styles.popularCard]}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText} weight="medium">
                      {t('pricing.mostPopular')}
                    </Text>
                  </View>
                )}

                <View style={styles.cardHeader}>
                  <Text style={styles.planName} weight="bold">
                    {plan.name}
                  </Text>
                  <Text style={styles.planDuration}>{plan.duration}</Text>
                </View>

                <View style={styles.priceContainer}>
                  {hasDiscount && (
                    <Text style={styles.originalPrice}>
                      {formatPrice(plan.originalPrice)}
                    </Text>
                  )}
                  <Text style={styles.currentPrice} weight="bold">
                    {formatPrice(discountedPrice)}
                  </Text>
                  {hasDiscount && (
                    <View style={styles.discountTag}>
                      <Text style={styles.discountTagText} weight="medium">
                        {discountPercentage}% {t('pricing.off')}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.contactTitle} weight="bold">
            {t('pricing.readyToPurchase')}
          </Text>
          <Text style={styles.contactSubtitle}>
            {t('pricing.contactUsToGetStarted')}
          </Text>

          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleCallPress}
            >
              <Phone size={20} color="#FFFFFF" />
              <Text style={styles.contactButtonText} weight="medium">
                {t('pricing.callNow')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactButton, styles.viberButton]}
              onPress={handleViberPress}
            >
              <MessageCircle size={20} color="#FFFFFF" />
              <Text style={styles.contactButtonText} weight="medium">
                {t('pricing.viberChat')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.phoneContainer}>
            <Text style={styles.phoneLabel}>{t('pricing.contactPhone')}:</Text>
            <Text style={styles.phoneNumber} weight="bold">
              +959425743536
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Pricing;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  discountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    margin: 16,
  },
  discountContent: {
    marginLeft: 12,
    flex: 1,
  },
  discountTitle: {
    fontSize: 16,
    color: '#DC2626',
    marginBottom: 4,
  },
  discountText: {
    fontSize: 14,
    color: '#B91C1C',
  },
  subtitleContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  pricingContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  pricingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  popularCard: {
    borderColor: '#3B82F6',
    transform: [{ scale: 1.02 }],
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 24,
    right: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  popularBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  planName: {
    fontSize: 24,
    color: '#1F2937',
    marginBottom: 4,
  },
  planDuration: {
    fontSize: 14,
    color: '#6B7280',
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 0,
  },
  originalPrice: {
    fontSize: 18,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 32,
    color: '#1F2937',
    marginBottom: 8,
  },
  discountTag: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  discountTagText: {
    color: '#FFFFFF',
    fontSize: 12,
  },

  contactSection: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contactTitle: {
    fontSize: 20,
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
  },
  viberButton: {
    backgroundColor: '#8B5CF6',
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
  },
  phoneContainer: {
    alignItems: 'center',
  },
  phoneLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 16,
    color: '#3B82F6',
  },
  featuresOverview: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  overviewGrid: {
    gap: 16,
  },
  overviewItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  overviewItemTitle: {
    fontSize: 16,
    color: '#1F2937',
    marginBottom: 8,
  },
  overviewItemText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
