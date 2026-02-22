// import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
// import { useRouter } from 'expo-router';
// import {
//   DollarSign,
//   HelpCircle,
//   Globe,
//   Info,
//   Store,
//   Truck,
//   Users,
//   FileUp,
//   FileDown,
//   ShieldCheck,
//   Printer,
// } from 'lucide-react-native';
// import { useTranslation } from '@/context/LocalizationContext';
// import { MyanmarText as Text } from '@/components/MyanmarText';
// import { SafeAreaView } from 'react-native-safe-area-context';

// export default function More() {
//   const router = useRouter();
//   const { t } = useTranslation();

//   const menuItems = [
//     {
//       id: 'customers',
//       title: t('more.customers'),
//       icon: Users,
//       color: '#059669',
//       backgroundColor: '#ECFDF5',
//       route: '/customer-management',
//     },
//     {
//       id: 'suppliers',
//       title: t('more.suppliers'),
//       icon: Truck,
//       color: '#7C3AED',
//       backgroundColor: '#F5F3FF',
//       route: '/supplier-management',
//     },
//     {
//       id: 'expenses',
//       title: t('more.expenses'),
//       icon: DollarSign,
//       color: '#EF4444',
//       backgroundColor: '#FEF2F2',
//       route: '/expenses',
//     },
//     // {
//     //   id: 'help',
//     //   title: t('more.help'),
//     //   icon: HelpCircle,
//     //   color: '#3B82F6',
//     //   backgroundColor: '#EFF6FF',
//     //   route: '/help',
//     // },
//     {
//       id: 'shopSettings',
//       title: t('more.shopSettings'),
//       icon: Store,
//       color: '#059669',
//       backgroundColor: '#ECFDF5',
//       route: '/shop-settings',
//     },
//     // {
//     //   id: 'printerSettings',
//     //   title: t('more.printerSettings'),
//     //   icon: Printer,
//     //   color: '#8B5CF6',
//     //   backgroundColor: '#F5F3FF',
//     //   route: '/printer-settings',
//     // },
//     {
//       id: 'licenseManagement',
//       title: t('more.licenseManagement'),
//       icon: ShieldCheck,
//       color: '#2563EB',
//       backgroundColor: '#EFF6FF',
//       route: '/license-management',
//     },
//     {
//       id: 'language',
//       title: t('more.language'),
//       icon: Globe,
//       color: '#10B981',
//       backgroundColor: '#ECFDF5',
//       route: '/language-settings',
//     },
//     {
//       id: 'export',
//       title: t('more.dataExport'),
//       icon: FileUp,
//       color: '#F59E0B',
//       backgroundColor: '#FFFBEB',
//       route: '/data-export',
//     },
//     {
//       id: 'import',
//       title: t('more.dataImport'),
//       icon: FileDown,
//       color: '#06B6D4',
//       backgroundColor: '#ECFEFF',
//       route: '/data-import',
//     },
//     // {
//     //   id: 'about',
//     //   title: t('more.about'),
//     //   icon: Info,
//     //   color: '#8B5CF6',
//     //   backgroundColor: '#F5F3FF',
//     //   route: '/about',
//     // },
//   ];

//   const handleItemPress = (route: string) => {
//     router.push(route as any);
//   };

//   return (
//     <SafeAreaView style={styles.container} edges={['top']}>
//       <View style={styles.header}>
//         <Text style={[styles.title]} weight="bold">
//           {t('more.title')}
//         </Text>
//         <Text style={styles.subtitle}>{t('more.subtitle')}</Text>
//       </View>

//       <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
//         <View style={styles.menuGrid}>
//           {menuItems.map((item) => {
//             const IconComponent = item.icon;
//             return (
//               <TouchableOpacity
//                 key={item.id}
//                 style={styles.menuItem}
//                 onPress={() => handleItemPress(item.route)}
//                 activeOpacity={0.7}
//               >
//                 <View
//                   style={[
//                     styles.iconContainer,
//                     { backgroundColor: item.backgroundColor },
//                   ]}
//                 >
//                   <IconComponent size={20} color={item.color} />
//                 </View>
//                 <Text style={styles.menuItemTitle} weight="bold">
//                   {item.title}
//                 </Text>
//               </TouchableOpacity>
//             );
//           })}
//         </View>

//         {/* App Info Section */}
//         {/* <View style={styles.appInfoSection}>
//           <Text style={styles.appInfoTitle} weight="medium">
//             {t('more.appInfo')}
//           </Text>
//           <View style={styles.appInfoCard}>
//             <Text style={styles.appName} weight="bold">
//               Mobile POS
//             </Text>
//             <Text style={styles.appVersion} weight="medium">
//               Version 1.0.0
//             </Text>
//             <Text style={styles.appDescription}>
//               {t('more.appDescription')}
//             </Text>
//           </View>
//         </View> */}
//       </ScrollView>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F9FAFB',
//   },
//   header: {
//     paddingHorizontal: 20,
//     paddingVertical: 16,
//     backgroundColor: '#FFFFFF',
//     borderBottomWidth: 1,
//     borderBottomColor: '#E5E7EB',
//   },
//   title: {
//     fontSize: 28,
//     color: '#111827',
//     marginBottom: 4,
//   },
//   subtitle: {
//     fontSize: 16,
//     color: '#6B7280',
//   },
//   content: {
//     flex: 1,
//   },
//   menuGrid: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     padding: 16,
//     justifyContent: 'space-between',
//   },
//   menuItem: {
//     width: '48%',
//     backgroundColor: '#FFFFFF',
//     borderRadius: 12,
//     padding: 16,
//     marginBottom: 12,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 2,
//     elevation: 2,
//     minHeight: 100,
//     justifyContent: 'center',
//   },
//   iconContainer: {
//     width: 40,
//     height: 40,
//     borderRadius: 10,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 8,
//   },
//   menuItemTitle: {
//     fontSize: 14,
//     color: '#111827',
//     textAlign: 'center',
//   },
//   appInfoSection: {
//     padding: 20,
//     paddingTop: 0,
//   },
//   appInfoTitle: {
//     fontSize: 18,
//     color: '#111827',
//     marginBottom: 12,
//   },
//   appInfoCard: {
//     backgroundColor: '#FFFFFF',
//     borderRadius: 12,
//     padding: 20,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   appName: {
//     fontSize: 20,
//     color: '#111827',
//     marginBottom: 4,
//   },
//   appVersion: {
//     fontSize: 14,
//     color: '#6B7280',
//     marginBottom: 8,
//   },
//   appDescription: {
//     fontSize: 14,
//     color: '#6B7280',
//     textAlign: 'center',
//   },
// });
