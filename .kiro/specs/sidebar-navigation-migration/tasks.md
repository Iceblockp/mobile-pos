# Implementation Plan: Sidebar Navigation Migration

## Overview

This implementation plan outlines the step-by-step approach to migrate from tab-based navigation to sidebar navigation in a React Native Expo mobile POS application. The migration will be done incrementally, maintaining backward compatibility with the existing tab navigation during the transition.

## Tasks

- [x] 1. Create drawer context and state management
  - Create `context/DrawerContext.tsx` with drawer state management
  - Implement `useDrawer` hook for accessing drawer state
  - Export `DrawerProvider` component
  - _Requirements: 1.2, 1.4_

- [ ]\* 1.1 Write property test for drawer state consistency
  - **Property 1: Drawer State Consistency**
  - **Validates: Requirements 1.2, 1.4**

- [x] 2. Implement core sidebar component
  - [x] 2.1 Create `components/Sidebar.tsx` with basic structure
    - Implement animated slide-in/out from left
    - Add overlay with fade animation
    - Use React Native Animated API
    - _Requirements: 1.2, 1.3, 1.4, 6.1, 6.2, 6.3, 6.4_

  - [x] 2.2 Add menu items configuration with 18 flat items
    - Define menu items array with icons and routes
    - Include all navigation items: Dashboard, Sale, Sale History, Product Management, Category Management, Movement History, Low Stock, Overview, Customer Analytics, AI Analytics, Customers, Suppliers, Expenses, Shop Settings, License Management, Language Settings, Data Export, Data Import
    - _Requirements: 1.6, 5.1, 5.4_

  - [ ]\* 2.3 Write property test for animation completion
    - **Property 3: Animation Completion**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

  - [ ]\* 2.4 Write property test for menu item uniqueness
    - **Property 4: Menu Item Uniqueness**
    - **Validates: Requirements 1.6**

- [x] 3. Create drawer menu item component
  - [x] 3.1 Implement `components/DrawerMenuItem.tsx` for flat menu structure
    - Support regular menu items without nesting
    - Add active state highlighting
    - Remove submenu expansion logic
    - _Requirements: 1.5, 1.7, 5.1_

  - [x] 3.2 Add navigation handling
    - Integrate with Expo Router
    - Close drawer after navigation
    - _Requirements: 1.5, 5.3_

  - [ ]\* 3.3 Write property test for active state accuracy
    - **Property 6: Active State Accuracy**
    - **Validates: Requirements 1.7**

  - [ ]\* 3.4 Write property test for menu item count
    - **Property 10: Menu Item Count**
    - **Validates: Requirements 1.6, 5.1, 5.4**

- [x] 4. Implement menu button component
  - Create `components/MenuButton.tsx` with hamburger icon
  - Add accessibility labels and touch target sizing
  - Style consistently with app design
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]\* 4.1 Write property test for touch target accessibility
  - **Property 8: Touch Target Accessibility**
  - **Validates: Requirements 2.4, 9.3**

- [x] 5. Create drawer layout wrapper
  - [x] 5.1 Create `app/(drawer)/_layout.tsx`
    - Wrap screens with DrawerProvider
    - Render Sidebar component
    - Use Slot for screen content
    - _Requirements: 1.1, 7.1, 7.2_

  - [x] 5.2 Add route tracking
    - Use usePathname to track current route
    - Pass current route to Sidebar for active state
    - _Requirements: 1.7_

- [x] 6. Add localization support
  - [x] 6.1 Update `locales/en.ts` with new navigation keys
    - Add keys for: saleHistory, productManagement, categoryManagement, movementHistory, lowStock, overview, customerAnalytics, aiAnalytics, customers, suppliers, expenses, shopSettings, licenseManagement, language, dataExport, dataImport
    - Ensure all 18 menu items have translations
    - _Requirements: 1.8, 9.1, 9.2_

  - [x] 6.2 Update `locales/my.ts` with Myanmar translations
    - Add Myanmar translations for all new navigation keys
    - Verify Myanmar Unicode rendering
    - _Requirements: 1.8, 9.2, 9.5_

  - [ ]\* 6.3 Write property test for localization completeness
    - **Property 7: Localization Completeness**
    - **Validates: Requirements 1.8, 9.1, 9.2**

- [x] 7. Extract sale history to dedicated page
  - [x] 7.1 Create `app/(drawer)/sale-history.tsx`
    - Extract sale history logic from sales tab modal
    - Implement as full page with header
    - Add MenuButton to header
    - _Requirements: 3.1, 3.2_

  - [x] 7.2 Add filtering and search functionality
    - Implement date range filter
    - Add search by customer or product
    - Display sale details on item tap
    - _Requirements: 3.3, 3.4, 3.5, 3.6_

  - [ ]\* 7.3 Write integration tests for sale history page
    - Test data loading and display
    - Test filtering functionality
    - Test search functionality
    - _Requirements: 3.2, 3.3, 3.4_

- [x] 8. Create separated inventory pages
  - [x] 8.1 Create `app/(drawer)/product-management.tsx`
    - Extract products list from inventory tab
    - Reuse existing ProductsManager component
    - Add MenuButton to header
    - _Requirements: 4.1, 4.4_

  - [x] 8.2 Create `app/(drawer)/category-management.tsx`
    - Extract category management from product management modal
    - Create dedicated page for category CRUD operations
    - Display categories with product counts
    - Add MenuButton to header
    - _Requirements: 4.1, 4.4_

  - [x] 8.3 Create `app/(drawer)/movement-history.tsx`
    - Extract stock movements from inventory tab
    - Reuse existing EnhancedMovementHistory component
    - Add MenuButton to header
    - _Requirements: 4.2, 4.5_

  - [x] 8.4 Create `app/(drawer)/low-stock.tsx`
    - Extract low stock overview from inventory tab
    - Display products below minimum stock
    - Add quick action buttons
    - Add MenuButton to header
    - _Requirements: 4.3, 4.6_

  - [ ]\* 8.5 Write integration tests for inventory pages
    - Test each page loads independently
    - Test data consistency across pages
    - Test navigation between pages
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Create main navigation pages
  - [x] 9.1 Create `app/(drawer)/dashboard.tsx`
    - Copy existing dashboard content
    - Add MenuButton to header
    - Set as default page
    - _Requirements: 1.1, 2.1_

  - [x] 9.2 Create `app/(drawer)/sale.tsx`
    - Copy existing sales tab content
    - Add MenuButton to header
    - Remove sale history modal (now separate page)
    - _Requirements: 2.1_

  - [x] 9.3 Create `app/(drawer)/overview.tsx`
    - Extract analytics overview from reports tab
    - Add MenuButton to header
    - _Requirements: 2.1_

  - [x] 9.4 Create `app/(drawer)/customer-analytics.tsx`
    - Extract customer analytics from reports tab
    - Add MenuButton to header
    - _Requirements: 2.1_

  - [x] 9.5 Create `app/(drawer)/ai-analytics.tsx`
    - Extract AI analytics from reports tab
    - Add MenuButton to header
    - _Requirements: 2.1_

- [x] 10. Create management and settings pages
  - [x] 10.1 Create `app/(drawer)/customer-management.tsx`
    - Copy existing customer management page
    - Add MenuButton to header
    - _Requirements: 2.1, 5.2_

  - [x] 10.2 Create `app/(drawer)/supplier-management.tsx`
    - Copy existing supplier management page
    - Add MenuButton to header
    - _Requirements: 2.1, 5.2_

  - [x] 10.3 Create `app/(drawer)/expenses.tsx`
    - Copy existing expenses page
    - Add MenuButton to header
    - _Requirements: 2.1, 5.2_

  - [x] 10.4 Create `app/(drawer)/shop-settings.tsx`
    - Copy existing shop settings page
    - Add MenuButton to header
    - _Requirements: 2.1, 5.2_

  - [x] 10.5 Create `app/(drawer)/license-management.tsx`
    - Copy existing license management page
    - Add MenuButton to header
    - _Requirements: 2.1, 5.2_

  - [x] 10.6 Create `app/(drawer)/language-settings.tsx`
    - Copy existing language settings page
    - Add MenuButton to header
    - _Requirements: 2.1, 5.2_

  - [x] 10.7 Create `app/(drawer)/data-export.tsx`
    - Copy existing data export page
    - Add MenuButton to header
    - _Requirements: 2.1, 5.2_

  - [x] 10.8 Create `app/(drawer)/data-import.tsx`
    - Copy existing data import page
    - Add MenuButton to header
    - _Requirements: 2.1, 5.2_

- [x] 11. Add styling and visual design
  - [x] 11.1 Apply color scheme to sidebar
    - Use primary green (#059669) for active items
    - Use gray (#6B7280) for inactive items
    - Use white background (#FFFFFF)
    - _Requirements: 10.1_

  - [x] 11.2 Style active state indicator
    - Light green background (#F0FDF4)
    - Green border (#059669)
    - _Requirements: 10.2_

  - [x] 11.3 Apply typography and icons
    - Use NotoSansMyanmar font family
    - Use lucide-react-native icons
    - Ensure minimum font sizes
    - _Requirements: 10.3, 10.4, 9.4_

  - [x] 11.4 Add shadows and rounded corners
    - Add shadow to sidebar
    - Round corners on menu items
    - Style overlay
    - _Requirements: 10.5, 10.6_

- [x] 12. Implement performance optimizations
  - [x] 12.1 Add lazy loading for page components
    - Use React.lazy for route components
    - Implement loading states
    - _Requirements: 8.2_

  - [x] 12.2 Optimize animation performance
    - Use native driver for animations
    - Minimize re-renders during animation
    - _Requirements: 8.4_

  - [x] 12.3 Add cleanup for animations
    - Stop animations on component unmount
    - Reset animation values properly
    - _Requirements: 8.3_

  - [ ]\* 12.4 Write performance tests
    - Test animation frame rate
    - Test memory usage during repeated operations
    - Test initial load time
    - _Requirements: 8.1, 8.3, 8.4, 8.5_

- [ ] 13. Add error handling
  - [ ] 13.1 Implement navigation error handling
    - Catch navigation errors
    - Show toast notifications
    - Redirect to dashboard as fallback
    - _Requirements: 1.5_

  - [ ] 13.2 Add context error handling
    - Throw descriptive error in useDrawer hook
    - Guide developers to wrap with provider
    - _Requirements: 1.2_

  - [ ] 13.3 Implement animation cleanup
    - Add cleanup in useEffect
    - Handle component unmounting during animation
    - _Requirements: 6.6_

  - [ ]\* 13.4 Write unit tests for error handling
    - Test navigation error scenarios
    - Test context access errors
    - Test animation cleanup
    - _Requirements: 1.5, 6.6_

- [ ] 14. Checkpoint - Test drawer navigation functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Update routing configuration
  - [x] 15.1 Create route migration map
    - Map old tab routes to new drawer routes
    - Create helper function for route migration
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 15.2 Update deep linking configuration
    - Ensure deep links work with new routes
    - Test navigation from external links
    - _Requirements: 7.4_

  - [ ]\* 15.3 Write property test for route resolution
    - **Property 5: Route Resolution**
    - **Validates: Requirements 1.5, 5.5**

- [ ] 16. Implement overlay interaction
  - Add touch handler to overlay
  - Close drawer on overlay tap
  - Prevent touch events from passing through
  - _Requirements: 1.4_

- [ ]\* 16.1 Write property test for overlay interaction
  - **Property 9: Overlay Interaction**
  - **Validates: Requirements 1.4**

- [ ] 17. Add accessibility improvements
  - [ ] 17.1 Add accessibility labels
    - Label menu button for screen readers
    - Add role attributes to menu items
    - _Requirements: 9.3_

  - [ ] 17.2 Ensure minimum touch targets
    - Verify all interactive elements are 44x44px minimum
    - Add hitSlop where needed
    - _Requirements: 2.4, 9.3_

  - [ ] 17.3 Test with screen reader
    - Test navigation with TalkBack/VoiceOver
    - Verify all elements are accessible
    - _Requirements: 9.3_

- [ ] 18. Integration testing
  - [ ]\* 18.1 Write integration tests for drawer navigation flow
    - Test complete navigation workflow
    - Test drawer open/close with navigation
    - Test navigation to all 17 pages
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

  - [ ]\* 18.2 Write integration tests for animation
    - Test slide and overlay animations
    - Test rapid open/close sequences
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]\* 18.3 Write integration tests for localization
    - Test language switching
    - Verify all labels update correctly
    - _Requirements: 1.8, 9.1, 9.2_

- [ ] 19. End-to-end testing
  - [ ]\* 19.1 Write E2E test for complete navigation workflow
    - Test app launch to dashboard
    - Test navigation to all pages
    - Test backward navigation
    - _Requirements: 1.1, 1.5, 2.1_

  - [ ]\* 19.2 Write E2E test for sale history extraction
    - Test sale history page functionality
    - Compare with old modal behavior
    - Test filtering and searching
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]\* 19.3 Write E2E test for inventory feature separation
    - Test each inventory page independently
    - Verify data consistency
    - Test navigation between inventory pages
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ] 20. Final checkpoint - Comprehensive testing and validation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The migration maintains backward compatibility with tab navigation
- All existing components are reused where possible to minimize changes
- Localization support is built-in from the start
- Performance optimizations are included to maintain app responsiveness
- All 17 menu items are in a flat structure with no submenus or nesting
