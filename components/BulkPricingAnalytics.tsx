// import React, { useState } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   TouchableOpacity,
//   Dimensions,
//   Alert,
// } from 'react-native';
// import {
//   useBulkPricingInsights,
//   useBulkPricingOptimization,
//   useBulkPricingPerformance,
// } from '@/hooks/useQueries';
// import { formatMMK } from '@/utils/formatters';
// import { Ionicons } from '@expo/vector-icons';
// import { useTranslation } from '@/context/LocalizationContext';

// const { width } = Dimensions.get('window');

// export const BulkPricingAnalytics: React.FC = () => {
//   const { t } = useTranslation();
//   const [activeTab, setActiveTab] = useState<
//     'insights' | 'performance' | 'optimization'
//   >('insights');
//   const [dateRange, setDateRange] = useState<'30d' | '90d' | '180d'>('30d');

//   const getDateRange = () => {
//     const endDate = new Date();
//     const startDate = new Date();

//     switch (dateRange) {
//       case '30d':
//         startDate.setDate(endDate.getDate() - 30);
//         break;
//       case '90d':
//         startDate.setDate(endDate.getDate() - 90);
//         break;
//       case '180d':
//         startDate.setDate(endDate.getDate() - 180);
//         break;
//     }

//     return { startDate, endDate };
//   };

//   const { startDate, endDate } = getDateRange();
//   const { data: insights } = useBulkPricingInsights();
//   const { data: optimization } = useBulkPricingOptimization();
//   const { data: performance } = useBulkPricingPerformance(startDate, endDate);

//   const renderDateRangeSelector = () => (
//     <View style={styles.dateRangeSelector}>
//       {(['30d', '90d', '180d'] as const).map((range) => (
//         <TouchableOpacity
//           key={range}
//           style={[
//             styles.dateRangeButton,
//             dateRange === range && styles.dateRangeButtonActive,
//           ]}
//           onPress={() => setDateRange(range)}
//         >
//           <Text
//             style={[
//               styles.dateRangeButtonText,
//               dateRange === range && styles.dateRangeButtonTextActive,
//             ]}
//           >
//             {range === '30d'
//               ? t('analytics.last30Days')
//               : range === '90d'
//               ? t('analytics.last90Days')
//               : t('analytics.last180Days')}
//           </Text>
//         </TouchableOpacity>
//       ))}
//     </View>
//   );

//   const renderTabBar = () => (
//     <View style={styles.tabBar}>
//       <TouchableOpacity
//         style={[styles.tab, activeTab === 'insights' && styles.activeTab]}
//         onPress={() => setActiveTab('insights')}
//       >
//         <Text
//           style={[
//             styles.tabText,
//             activeTab === 'insights' && styles.activeTabText,
//           ]}
//         >
//           {t('analytics.insights')}
//         </Text>
//       </TouchableOpacity>
//       <TouchableOpacity
//         style={[styles.tab, activeTab === 'performance' && styles.activeTab]}
//         onPress={() => setActiveTab('performance')}
//       >
//         <Text
//           style={[
//             styles.tabText,
//             activeTab === 'performance' && styles.activeTabText,
//           ]}
//         >
//           {t('analytics.performance')}
//         </Text>
//       </TouchableOpacity>
//       <TouchableOpacity
//         style={[styles.tab, activeTab === 'optimization' && styles.activeTab]}
//         onPress={() => setActiveTab('optimization')}
//       >
//         <Text
//           style={[
//             styles.tabText,
//             activeTab === 'optimization' && styles.activeTabText,
//           ]}
//         >
//           {t('analytics.optimization')}
//         </Text>
//       </TouchableOpacity>
//     </View>
//   );

//   const renderInsightsTab = () => {
//     if (!insights) {
//       return (
//         <View style={styles.emptyState}>
//           <Ionicons name="analytics-outline" size={48} color="#9CA3AF" />
//           <Text style={styles.emptyStateText}>
//             {t('analytics.noInsightsData')}
//           </Text>
//         </View>
//       );
//     }

//     const { discountImpact, bulkPricingEffectiveness, revenueAnalysis } =
//       insights;

//     return (
//       <ScrollView style={styles.tabContent}>
//         <Text style={styles.sectionTitle}>{t('analytics.discountImpact')}</Text>
//         <View style={styles.impactGrid}>
//           <View style={styles.impactCard}>
//             <Text style={styles.impactLabel}>
//               {t('analytics.totalBulkDiscounts')}
//             </Text>
//             <Text style={[styles.impactValue, { color: '#3B82F6' }]}>
//               {formatMMK(discountImpact.totalBulkDiscounts)}
//             </Text>
//           </View>
//           <View style={styles.impactCard}>
//             <Text style={styles.impactLabel}>
//               {t('analytics.totalManualDiscounts')}
//             </Text>
//             <Text style={[styles.impactValue, { color: '#F59E0B' }]}>
//               {formatMMK(discountImpact.totalManualDiscounts)}
//             </Text>
//           </View>
//           <View style={styles.impactCard}>
//             <Text style={styles.impactLabel}>
//               {t('analytics.discountPenetration')}
//             </Text>
//             <Text style={[styles.impactValue, { color: '#10B981' }]}>
//               {discountImpact.discountPenetration.toFixed(1)}%
//             </Text>
//           </View>
//           <View style={styles.impactCard}>
//             <Text style={styles.impactLabel}>
//               {t('analytics.avgDiscountPerSale')}
//             </Text>
//             <Text style={styles.impactValue}>
//               {formatMMK(discountImpact.avgDiscountPerSale)}
//             </Text>
//           </View>
//         </View>

//         <Text style={styles.sectionTitle}>
//           {t('analytics.revenueAnalysis')}
//         </Text>
//         <View style={styles.revenueCard}>
//           <View style={styles.revenueItem}>
//             <Text style={styles.revenueLabel}>
//               {t('analytics.actualRevenue')}
//             </Text>
//             <Text style={styles.revenueValue}>
//               {formatMMK(revenueAnalysis.totalRevenue)}
//             </Text>
//           </View>
//           <View style={styles.revenueItem}>
//             <Text style={styles.revenueLabel}>
//               {t('analytics.revenueWithoutDiscounts')}
//             </Text>
//             <Text style={styles.revenueValue}>
//               {formatMMK(revenueAnalysis.revenueWithoutDiscounts)}
//             </Text>
//           </View>
//           <View style={styles.revenueItem}>
//             <Text style={styles.revenueLabel}>
//               {t('analytics.discountImpact')}
//             </Text>
//             <Text style={[styles.revenueValue, { color: '#EF4444' }]}>
//               -{formatMMK(revenueAnalysis.discountImpactOnRevenue)}
//             </Text>
//           </View>
//           <View style={styles.revenueComparison}>
//             <View style={styles.comparisonItem}>
//               <Text style={styles.comparisonLabel}>
//                 {t('analytics.avgOrderWithBulk')}
//               </Text>
//               <Text style={styles.comparisonValue}>
//                 {formatMMK(revenueAnalysis.avgOrderValueWithBulk)}
//               </Text>
//             </View>
//             <View style={styles.comparisonItem}>
//               <Text style={styles.comparisonLabel}>
//                 {t('analytics.avgOrderWithoutBulk')}
//               </Text>
//               <Text style={styles.comparisonValue}>
//                 {formatMMK(revenueAnalysis.avgOrderValueWithoutBulk)}
//               </Text>
//             </View>
//           </View>
//         </View>

//         <Text style={styles.sectionTitle}>
//           {t('analytics.topBulkProducts')}
//         </Text>
//         <View style={styles.effectivenessContainer}>
//           {bulkPricingEffectiveness.slice(0, 10).map((product, index) => (
//             <View key={index} style={styles.effectivenessItem}>
//               <View style={styles.effectivenessHeader}>
//                 <Text style={styles.effectivenessProductName}>
//                   {product.productName}
//                 </Text>
//                 <Text style={styles.effectivenessBulkPercentage}>
//                   {product.bulkSalesPercentage.toFixed(1)}% bulk
//                 </Text>
//               </View>
//               <View style={styles.effectivenessMetrics}>
//                 <View style={styles.effectivenessMetric}>
//                   <Text style={styles.effectivenessMetricLabel}>
//                     {t('analytics.bulkSales')}
//                   </Text>
//                   <Text style={styles.effectivenessMetricValue}>
//                     {formatMMK(product.totalBulkSales)}
//                   </Text>
//                 </View>
//                 <View style={styles.effectivenessMetric}>
//                   <Text style={styles.effectivenessMetricLabel}>
//                     {t('analytics.totalDiscount')}
//                   </Text>
//                   <Text style={styles.effectivenessMetricValue}>
//                     {formatMMK(product.totalBulkDiscount)}
//                   </Text>
//                 </View>
//                 <View style={styles.effectivenessMetric}>
//                   <Text style={styles.effectivenessMetricLabel}>
//                     {t('analytics.bulkCount')}
//                   </Text>
//                   <Text style={styles.effectivenessMetricValue}>
//                     {product.bulkSalesCount}
//                   </Text>
//                 </View>
//               </View>
//             </View>
//           ))}
//         </View>
//       </ScrollView>
//     );
//   };

//   const renderPerformanceTab = () => {
//     if (!performance) {
//       return (
//         <View style={styles.emptyState}>
//           <Ionicons name="trending-up-outline" size={48} color="#9CA3AF" />
//           <Text style={styles.emptyStateText}>
//             {t('analytics.noPerformanceData')}
//           </Text>
//         </View>
//       );
//     }

//     const { periodComparison, topPerformingTiers } = performance;
//     const { currentPeriod, previousPeriod, growth } = periodComparison;

//     const getGrowthColor = (value: number) => {
//       if (value > 0) return '#10B981';
//       if (value < 0) return '#EF4444';
//       return '#6B7280';
//     };

//     const getGrowthIcon = (value: number) => {
//       if (value > 0) return 'trending-up';
//       if (value < 0) return 'trending-down';
//       return 'remove';
//     };

//     return (
//       <ScrollView style={styles.tabContent}>
//         <Text style={styles.sectionTitle}>
//           {t('analytics.periodComparison')}
//         </Text>
//         <View style={styles.comparisonGrid}>
//           <View style={styles.comparisonCard}>
//             <Text style={styles.comparisonCardTitle}>
//               {t('analytics.totalSales')}
//             </Text>
//             <View style={styles.comparisonCardContent}>
//               <Text style={styles.comparisonCurrentValue}>
//                 {currentPeriod.totalSales}
//               </Text>
//               <View style={styles.comparisonGrowth}>
//                 <Ionicons
//                   name={getGrowthIcon(growth.salesGrowth)}
//                   size={16}
//                   color={getGrowthColor(growth.salesGrowth)}
//                 />
//                 <Text
//                   style={[
//                     styles.comparisonGrowthText,
//                     { color: getGrowthColor(growth.salesGrowth) },
//                   ]}
//                 >
//                   {growth.salesGrowth.toFixed(1)}%
//                 </Text>
//               </View>
//             </View>
//             <Text style={styles.comparisonPreviousValue}>
//               {t('analytics.previous')}: {previousPeriod.totalSales}
//             </Text>
//           </View>

//           <View style={styles.comparisonCard}>
//             <Text style={styles.comparisonCardTitle}>
//               {t('analytics.bulkSales')}
//             </Text>
//             <View style={styles.comparisonCardContent}>
//               <Text style={styles.comparisonCurrentValue}>
//                 {currentPeriod.bulkSales}
//               </Text>
//               <View style={styles.comparisonGrowth}>
//                 <Ionicons
//                   name={getGrowthIcon(growth.bulkSalesGrowth)}
//                   size={16}
//                   color={getGrowthColor(growth.bulkSalesGrowth)}
//                 />
//                 <Text
//                   style={[
//                     styles.comparisonGrowthText,
//                     { color: getGrowthColor(growth.bulkSalesGrowth) },
//                   ]}
//                 >
//                   {growth.bulkSalesGrowth.toFixed(1)}%
//                 </Text>
//               </View>
//             </View>
//             <Text style={styles.comparisonPreviousValue}>
//               {t('analytics.previous')}: {previousPeriod.bulkSales}
//             </Text>
//           </View>

//           <View style={styles.comparisonCard}>
//             <Text style={styles.comparisonCardTitle}>
//               {t('analytics.discountsGiven')}
//             </Text>
//             <View style={styles.comparisonCardContent}>
//               <Text style={styles.comparisonCurrentValue}>
//                 {formatMMK(currentPeriod.bulkDiscountGiven)}
//               </Text>
//               <View style={styles.comparisonGrowth}>
//                 <Ionicons
//                   name={getGrowthIcon(growth.discountGrowth)}
//                   size={16}
//                   color={getGrowthColor(growth.discountGrowth)}
//                 />
//                 <Text
//                   style={[
//                     styles.comparisonGrowthText,
//                     { color: getGrowthColor(growth.discountGrowth) },
//                   ]}
//                 >
//                   {growth.discountGrowth.toFixed(1)}%
//                 </Text>
//               </View>
//             </View>
//             <Text style={styles.comparisonPreviousValue}>
//               {t('analytics.previous')}:{' '}
//               {formatMMK(previousPeriod.bulkDiscountGiven)}
//             </Text>
//           </View>

//           <View style={styles.comparisonCard}>
//             <Text style={styles.comparisonCardTitle}>
//               {t('analytics.avgBulkOrderValue')}
//             </Text>
//             <View style={styles.comparisonCardContent}>
//               <Text style={styles.comparisonCurrentValue}>
//                 {formatMMK(currentPeriod.avgBulkOrderValue)}
//               </Text>
//               <View style={styles.comparisonGrowth}>
//                 <Ionicons
//                   name={getGrowthIcon(growth.orderValueGrowth)}
//                   size={16}
//                   color={getGrowthColor(growth.orderValueGrowth)}
//                 />
//                 <Text
//                   style={[
//                     styles.comparisonGrowthText,
//                     { color: getGrowthColor(growth.orderValueGrowth) },
//                   ]}
//                 >
//                   {growth.orderValueGrowth.toFixed(1)}%
//                 </Text>
//               </View>
//             </View>
//             <Text style={styles.comparisonPreviousValue}>
//               {t('analytics.previous')}:{' '}
//               {formatMMK(previousPeriod.avgBulkOrderValue)}
//             </Text>
//           </View>
//         </View>

//         <Text style={styles.sectionTitle}>
//           {t('analytics.topPerformingTiers')}
//         </Text>
//         <View style={styles.tiersContainer}>
//           {topPerformingTiers.map((tier, index) => (
//             <View key={index} style={styles.tierItem}>
//               <View style={styles.tierHeader}>
//                 <Text style={styles.tierProductName}>{tier.productName}</Text>
//                 <View style={styles.tierBadge}>
//                   <Text style={styles.tierBadgeText}>
//                     {tier.tierMinQuantity}+ qty
//                   </Text>
//                 </View>
//               </View>
//               <View style={styles.tierMetrics}>
//                 <View style={styles.tierMetric}>
//                   <Text style={styles.tierMetricLabel}>
//                     {t('analytics.timesUsed')}
//                   </Text>
//                   <Text style={styles.tierMetricValue}>{tier.timesUsed}</Text>
//                 </View>
//                 <View style={styles.tierMetric}>
//                   <Text style={styles.tierMetricLabel}>
//                     {t('analytics.totalRevenue')}
//                   </Text>
//                   <Text style={styles.tierMetricValue}>
//                     {formatMMK(tier.totalRevenue)}
//                   </Text>
//                 </View>
//                 <View style={styles.tierMetric}>
//                   <Text style={styles.tierMetricLabel}>
//                     {t('analytics.discount')}
//                   </Text>
//                   <Text style={styles.tierMetricValue}>
//                     {tier.tierDiscount}%
//                   </Text>
//                 </View>
//               </View>
//             </View>
//           ))}
//         </View>
//       </ScrollView>
//     );
//   };

//   const renderOptimizationTab = () => {
//     if (!optimization) {
//       return (
//         <View style={styles.emptyState}>
//           <Ionicons name="bulb-outline" size={48} color="#9CA3AF" />
//           <Text style={styles.emptyStateText}>
//             {t('analytics.noOptimizationData')}
//           </Text>
//         </View>
//       );
//     }

//     const {
//       underperformingProducts,
//       overDiscountedProducts,
//       opportunityProducts,
//     } = optimization;

//     return (
//       <ScrollView style={styles.tabContent}>
//         {opportunityProducts.length > 0 && (
//           <>
//             <Text style={styles.sectionTitle}>
//               <Ionicons name="trending-up" size={20} color="#10B981" />{' '}
//               {t('analytics.opportunities')} ({opportunityProducts.length})
//             </Text>
//             <View style={styles.suggestionContainer}>
//               {opportunityProducts.map((product, index) => (
//                 <View
//                   key={index}
//                   style={[styles.suggestionItem, styles.opportunityItem]}
//                 >
//                   <View style={styles.suggestionHeader}>
//                     <Text style={styles.suggestionProductName}>
//                       {product.productName}
//                     </Text>
//                     <View style={styles.opportunityBadge}>
//                       <Text style={styles.opportunityBadgeText}>
//                         {t('analytics.opportunity')}
//                       </Text>
//                     </View>
//                   </View>
//                   <View style={styles.suggestionMetrics}>
//                     <Text style={styles.suggestionMetric}>
//                       {t('analytics.highVolumeSales')}:{' '}
//                       {product.highVolumeSales}
//                     </Text>
//                     <Text style={styles.suggestionMetric}>
//                       {t('analytics.avgQuantity')}:{' '}
//                       {product.avgQuantityPerSale.toFixed(1)}
//                     </Text>
//                   </View>
//                   <Text style={styles.suggestionAction}>
//                     {product.suggestedAction}
//                   </Text>
//                 </View>
//               ))}
//             </View>
//           </>
//         )}

//         {underperformingProducts.length > 0 && (
//           <>
//             <Text style={styles.sectionTitle}>
//               <Ionicons name="warning" size={20} color="#F59E0B" />{' '}
//               {t('analytics.underperforming')} ({underperformingProducts.length}
//               )
//             </Text>
//             <View style={styles.suggestionContainer}>
//               {underperformingProducts.map((product, index) => (
//                 <View
//                   key={index}
//                   style={[styles.suggestionItem, styles.warningItem]}
//                 >
//                   <View style={styles.suggestionHeader}>
//                     <Text style={styles.suggestionProductName}>
//                       {product.productName}
//                     </Text>
//                     <View style={styles.warningBadge}>
//                       <Text style={styles.warningBadgeText}>
//                         {t('analytics.lowAdoption')}
//                       </Text>
//                     </View>
//                   </View>
//                   <View style={styles.suggestionMetrics}>
//                     <Text style={styles.suggestionMetric}>
//                       {t('analytics.salesWithoutBulk')}:{' '}
//                       {product.salesWithoutBulk}
//                     </Text>
//                     <Text style={styles.suggestionMetric}>
//                       {t('analytics.bulkTiers')}: {product.currentBulkTiers}
//                     </Text>
//                   </View>
//                   <Text style={styles.suggestionAction}>
//                     {product.suggestedAction}
//                   </Text>
//                 </View>
//               ))}
//             </View>
//           </>
//         )}

//         {overDiscountedProducts.length > 0 && (
//           <>
//             <Text style={styles.sectionTitle}>
//               <Ionicons name="alert-circle" size={20} color="#EF4444" />{' '}
//               {t('analytics.overDiscounted')} ({overDiscountedProducts.length})
//             </Text>
//             <View style={styles.suggestionContainer}>
//               {overDiscountedProducts.map((product, index) => (
//                 <View
//                   key={index}
//                   style={[styles.suggestionItem, styles.criticalItem]}
//                 >
//                   <View style={styles.suggestionHeader}>
//                     <Text style={styles.suggestionProductName}>
//                       {product.productName}
//                     </Text>
//                     <View style={styles.criticalBadge}>
//                       <Text style={styles.criticalBadgeText}>
//                         {t('analytics.highDiscount')}
//                       </Text>
//                     </View>
//                   </View>
//                   <View style={styles.suggestionMetrics}>
//                     <Text style={styles.suggestionMetric}>
//                       {t('analytics.avgDiscount')}:{' '}
//                       {formatMMK(product.avgDiscountGiven)}
//                     </Text>
//                     <Text style={styles.suggestionMetric}>
//                       {t('analytics.profitMargin')}:{' '}
//                       {product.profitMargin.toFixed(1)}%
//                     </Text>
//                     <Text style={styles.suggestionMetric}>
//                       {t('analytics.suggestedMaxDiscount')}:{' '}
//                       {formatMMK(product.suggestedMaxDiscount)}
//                     </Text>
//                   </View>
//                   <Text style={styles.suggestionAction}>
//                     {product.suggestedAction}
//                   </Text>
//                 </View>
//               ))}
//             </View>
//           </>
//         )}

//         {opportunityProducts.length === 0 &&
//           underperformingProducts.length === 0 &&
//           overDiscountedProducts.length === 0 && (
//             <View style={styles.emptyState}>
//               <Ionicons
//                 name="checkmark-circle-outline"
//                 size={48}
//                 color="#10B981"
//               />
//               <Text style={[styles.emptyStateText, { color: '#10B981' }]}>
//                 {t('analytics.allOptimized')}
//               </Text>
//             </View>
//           )}
//       </ScrollView>
//     );
//   };

//   return (
//     <View style={styles.container}>
//       {renderDateRangeSelector()}
//       {renderTabBar()}
//       {activeTab === 'insights' && renderInsightsTab()}
//       {activeTab === 'performance' && renderPerformanceTab()}
//       {activeTab === 'optimization' && renderOptimizationTab()}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F9FAFB',
//   },
//   dateRangeSelector: {
//     flexDirection: 'row',
//     padding: 16,
//     backgroundColor: '#FFFFFF',
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E7EB',
//   },
//   dateRangeButton: {
//     flex: 1,
//     paddingVertical: 8,
//     paddingHorizontal: 12,
//     backgroundColor: '#F3F4F6',
//     borderRadius: 6,
//     marginHorizontal: 4,
//     alignItems: 'center',
//   },
//   dateRangeButtonActive: {
//     backgroundColor: '#3B82F6',
//   },
//   dateRangeButtonText: {
//     fontSize: 12,
//     fontFamily: 'Inter-Medium',
//     color: '#6B7280',
//   },
//   dateRangeButtonTextActive: {
//     color: '#FFFFFF',
//   },
//   tabBar: {
//     flexDirection: 'row',
//     backgroundColor: '#FFFFFF',
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E7EB',
//   },
//   tab: {
//     flex: 1,
//     paddingVertical: 12,
//     alignItems: 'center',
//   },
//   activeTab: {
//     borderBottomWidth: 2,
//     borderBottomColor: '#3B82F6',
//   },
//   tabText: {
//     fontSize: 12,
//     fontFamily: 'Inter-Medium',
//     color: '#6B7280',
//   },
//   activeTabText: {
//     color: '#3B82F6',
//   },
//   tabContent: {
//     flex: 1,
//   },
//   emptyState: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 32,
//   },
//   emptyStateText: {
//     fontSize: 16,
//     fontFamily: 'Inter-Regular',
//     color: '#6B7280',
//     textAlign: 'center',
//     marginTop: 16,
//   },
//   sectionTitle: {
//     fontSize: 18,
//     fontFamily: 'Inter-SemiBold',
//     color: '#111827',
//     margin: 16,
//     marginBottom: 12,
//   },
//   impactGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     padding: 16,
//     paddingTop: 0,
//     gap: 12,
//   },
//   impactCard: {
//     width: (width - 44) / 2,
//     backgroundColor: '#FFFFFF',
//     padding: 16,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//     alignItems: 'center',
//   },
//   impactLabel: {
//     fontSize: 12,
//     fontFamily: 'Inter-Regular',
//     color: '#6B7280',
//     textAlign: 'center',
//     marginBottom: 8,
//   },
//   impactValue: {
//     fontSize: 18,
//     fontFamily: 'Inter-SemiBold',
//     color: '#111827',
//   },
//   revenueCard: {
//     backgroundColor: '#FFFFFF',
//     margin: 16,
//     marginTop: 0,
//     padding: 16,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//   },
//   revenueItem: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: '#F3F4F6',
//   },
//   revenueLabel: {
//     fontSize: 14,
//     fontFamily: 'Inter-Regular',
//     color: '#6B7280',
//   },
//   revenueValue: {
//     fontSize: 16,
//     fontFamily: 'Inter-SemiBold',
//     color: '#111827',
//   },
//   revenueComparison: {
//     flexDirection: 'row',
//     marginTop: 12,
//     paddingTop: 12,
//     borderTopWidth: 1,
//     borderTopColor: '#E5E7EB',
//   },
//   comparisonItem: {
//     flex: 1,
//     alignItems: 'center',
//   },
//   comparisonLabel: {
//     fontSize: 12,
//     fontFamily: 'Inter-Regular',
//     color: '#6B7280',
//     textAlign: 'center',
//     marginBottom: 4,
//   },
//   comparisonValue: {
//     fontSize: 14,
//     fontFamily: 'Inter-SemiBold',
//     color: '#111827',
//   },
//   effectivenessContainer: {
//     backgroundColor: '#FFFFFF',
//     margin: 16,
//     marginTop: 0,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//   },
//   effectivenessItem: {
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#F3F4F6',
//   },
//   effectivenessHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   effectivenessProductName: {
//     fontSize: 16,
//     fontFamily: 'Inter-SemiBold',
//     color: '#111827',
//     flex: 1,
//   },
//   effectivenessBulkPercentage: {
//     fontSize: 12,
//     fontFamily: 'Inter-Medium',
//     color: '#3B82F6',
//     backgroundColor: '#EBF8FF',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   effectivenessMetrics: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   effectivenessMetric: {
//     alignItems: 'center',
//   },
//   effectivenessMetricLabel: {
//     fontSize: 10,
//     fontFamily: 'Inter-Regular',
//     color: '#6B7280',
//     marginBottom: 2,
//   },
//   effectivenessMetricValue: {
//     fontSize: 12,
//     fontFamily: 'Inter-SemiBold',
//     color: '#111827',
//   },
//   comparisonGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     padding: 16,
//     paddingTop: 0,
//     gap: 12,
//   },
//   comparisonCard: {
//     width: (width - 44) / 2,
//     backgroundColor: '#FFFFFF',
//     padding: 16,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//   },
//   comparisonCardTitle: {
//     fontSize: 12,
//     fontFamily: 'Inter-Regular',
//     color: '#6B7280',
//     marginBottom: 8,
//   },
//   comparisonCardContent: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 4,
//   },
//   comparisonCurrentValue: {
//     fontSize: 18,
//     fontFamily: 'Inter-SemiBold',
//     color: '#111827',
//   },
//   comparisonGrowth: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   comparisonGrowthText: {
//     fontSize: 12,
//     fontFamily: 'Inter-Medium',
//     marginLeft: 2,
//   },
//   comparisonPreviousValue: {
//     fontSize: 10,
//     fontFamily: 'Inter-Regular',
//     color: '#9CA3AF',
//   },
//   tiersContainer: {
//     backgroundColor: '#FFFFFF',
//     margin: 16,
//     marginTop: 0,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#E5E7EB',
//   },
//   tierItem: {
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#F3F4F6',
//   },
//   tierHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   tierProductName: {
//     fontSize: 14,
//     fontFamily: 'Inter-Medium',
//     color: '#111827',
//     flex: 1,
//   },
//   tierBadge: {
//     backgroundColor: '#F3F4F6',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   tierBadgeText: {
//     fontSize: 10,
//     fontFamily: 'Inter-Medium',
//     color: '#6B7280',
//   },
//   tierMetrics: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//   },
//   tierMetric: {
//     alignItems: 'center',
//   },
//   tierMetricLabel: {
//     fontSize: 10,
//     fontFamily: 'Inter-Regular',
//     color: '#6B7280',
//     marginBottom: 2,
//   },
//   tierMetricValue: {
//     fontSize: 12,
//     fontFamily: 'Inter-SemiBold',
//     color: '#111827',
//   },
//   suggestionContainer: {
//     margin: 16,
//     marginTop: 0,
//   },
//   suggestionItem: {
//     backgroundColor: '#FFFFFF',
//     padding: 16,
//     borderRadius: 8,
//     borderWidth: 1,
//     marginBottom: 8,
//   },
//   opportunityItem: {
//     borderColor: '#A7F3D0',
//     backgroundColor: '#ECFDF5',
//   },
//   warningItem: {
//     borderColor: '#FCD34D',
//     backgroundColor: '#FFFBEB',
//   },
//   criticalItem: {
//     borderColor: '#FCA5A5',
//     backgroundColor: '#FEF2F2',
//   },
//   suggestionHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   suggestionProductName: {
//     fontSize: 16,
//     fontFamily: 'Inter-SemiBold',
//     color: '#111827',
//     flex: 1,
//   },
//   opportunityBadge: {
//     backgroundColor: '#10B981',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   opportunityBadgeText: {
//     fontSize: 10,
//     fontFamily: 'Inter-Medium',
//     color: '#FFFFFF',
//   },
//   warningBadge: {
//     backgroundColor: '#F59E0B',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   warningBadgeText: {
//     fontSize: 10,
//     fontFamily: 'Inter-Medium',
//     color: '#FFFFFF',
//   },
//   criticalBadge: {
//     backgroundColor: '#EF4444',
//     paddingHorizontal: 8,
//     paddingVertical: 4,
//     borderRadius: 12,
//   },
//   criticalBadgeText: {
//     fontSize: 10,
//     fontFamily: 'Inter-Medium',
//     color: '#FFFFFF',
//   },
//   suggestionMetrics: {
//     marginBottom: 8,
//   },
//   suggestionMetric: {
//     fontSize: 12,
//     fontFamily: 'Inter-Regular',
//     color: '#6B7280',
//     marginBottom: 2,
//   },
//   suggestionAction: {
//     fontSize: 12,
//     fontFamily: 'Inter-Medium',
//     color: '#374151',
//     fontStyle: 'italic',
//   },
// });
