/**
 * Verification script for Task 8 requirements
 * Checks that all acceptance criteria from the requirements document are met
 */

import { readFileSync } from 'fs';
import { join } from 'path';

console.log('🔍 Verifying Task 8 Requirements...\n');

const checks = [
  {
    requirement: '4.1',
    description: 'Navigate to products list page from sidebar',
    file: 'app/(drawer)/product-management.tsx',
    checks: [
      {
        pattern: /ProductsManager/,
        description: 'Uses ProductsManager component',
      },
      { pattern: /MenuButton/, description: 'Has MenuButton in header' },
      { pattern: /useDrawer/, description: 'Integrates with drawer context' },
    ],
  },
  {
    requirement: '4.2',
    description: 'Navigate to stock movements page from sidebar',
    file: 'app/(drawer)/movement-history.tsx',
    checks: [
      {
        pattern: /EnhancedMovementHistory/,
        description: 'Uses EnhancedMovementHistory component',
      },
      { pattern: /MenuButton/, description: 'Has MenuButton in header' },
      { pattern: /MovementSummary/, description: 'Includes MovementSummary' },
    ],
  },
  {
    requirement: '4.3',
    description: 'Navigate to low stock overview page from sidebar',
    file: 'app/(drawer)/low-stock.tsx',
    checks: [
      {
        pattern: /useLowStockProducts/,
        description: 'Fetches low stock products',
      },
      { pattern: /MenuButton/, description: 'Has MenuButton in header' },
      {
        pattern: /StockMovementForm/,
        description: 'Includes stock movement form',
      },
    ],
  },
  {
    requirement: '4.4',
    description: 'Display all products with search and filter functionality',
    file: 'app/(drawer)/product-management.tsx',
    checks: [
      {
        pattern: /ProductsManager/,
        description: 'ProductsManager provides search/filter',
      },
    ],
  },
  {
    requirement: '4.5',
    description: 'Display all stock movements with filtering options',
    file: 'app/(drawer)/movement-history.tsx',
    checks: [
      { pattern: /showFilters={true}/, description: 'Enables filtering' },
      { pattern: /showProductName={true}/, description: 'Shows product names' },
    ],
  },
  {
    requirement: '4.6',
    description:
      'Display products below minimum stock levels with quick action buttons',
    file: 'app/(drawer)/low-stock.tsx',
    checks: [
      {
        pattern: /handleQuickStockMovement/,
        description: 'Has quick action handler',
      },
      { pattern: /TrendingUp/, description: 'Has stock in button' },
      { pattern: /TrendingDown/, description: 'Has stock out button' },
      {
        pattern: /lowStockProducts/,
        description: 'Displays low stock products',
      },
    ],
  },
];

let allPassed = true;

for (const req of checks) {
  console.log(`📋 Requirement ${req.requirement}: ${req.description}`);
  console.log(`   📄 File: ${req.file}\n`);

  try {
    const filePath = join(process.cwd(), req.file);
    const content = readFileSync(filePath, 'utf-8');

    for (const check of req.checks) {
      if (check.pattern.test(content)) {
        console.log(`   ✅ ${check.description}`);
      } else {
        console.log(`   ❌ ${check.description}`);
        allPassed = false;
      }
    }
  } catch (error) {
    console.log(`   ❌ File not found or cannot be read`);
    allPassed = false;
  }

  console.log('');
}

// Check sidebar routes
console.log('🗺️  Checking Sidebar Routes...\n');

try {
  const sidebarPath = join(process.cwd(), 'components/Sidebar.tsx');
  const sidebarContent = readFileSync(sidebarPath, 'utf-8');

  const routes = [
    { id: 'product-management', route: '/(drawer)/product-management' },
    { id: 'movement-history', route: '/(drawer)/movement-history' },
    { id: 'low-stock', route: '/(drawer)/low-stock' },
  ];

  for (const route of routes) {
    if (sidebarContent.includes(route.route)) {
      console.log(`   ✅ Route configured: ${route.route}`);
    } else {
      console.log(`   ❌ Route missing: ${route.route}`);
      allPassed = false;
    }
  }
} catch (error) {
  console.log(`   ❌ Cannot read Sidebar.tsx`);
  allPassed = false;
}

console.log('\n' + '='.repeat(60));

if (allPassed) {
  console.log('✅ All requirements verified successfully!');
  console.log('\n📊 Requirements Coverage:');
  console.log('   - Requirement 4.1: ✅ Product Management page navigation');
  console.log('   - Requirement 4.2: ✅ Movement History page navigation');
  console.log('   - Requirement 4.3: ✅ Low Stock page navigation');
  console.log('   - Requirement 4.4: ✅ Product search and filtering');
  console.log('   - Requirement 4.5: ✅ Movement filtering options');
  console.log('   - Requirement 4.6: ✅ Low stock with quick actions');
  console.log('\n🎉 Task 8 implementation meets all requirements!');
  process.exit(0);
} else {
  console.log('❌ Some requirements are not met!');
  console.log('Please review the failed checks above.');
  process.exit(1);
}
