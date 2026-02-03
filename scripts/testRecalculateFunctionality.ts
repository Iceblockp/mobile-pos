/**
 * Test script to validate the recalculate functionality implementation
 *
 * This script validates:
 * 1. handleRecalculate function exists in sales page
 * 2. onRecalculate callback is passed to CompleteSaleModal
 * 3. Calculator icon is only shown for cash payments
 * 4. Calculator reopens with previous values when recalculate is triggered
 */

import * as fs from 'fs';
import * as path from 'path';

const SALES_PAGE_PATH = path.join(__dirname, '../app/(tabs)/sales.tsx');
const COMPLETE_SALE_MODAL_PATH = path.join(
  __dirname,
  '../components/CompleteSaleModal.tsx',
);
const CALCULATOR_MODAL_PATH = path.join(
  __dirname,
  '../components/CashCalculatorModal.tsx',
);

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function addResult(test: string, passed: boolean, message: string) {
  results.push({ test, passed, message });
  console.log(`${passed ? '✓' : '✗'} ${test}: ${message}`);
}

function testRecalculateFunctionality() {
  console.log('Testing Recalculate Functionality Implementation...\n');

  // Test 1: Check if handleRecalculate function exists in sales page
  const salesPageContent = fs.readFileSync(SALES_PAGE_PATH, 'utf-8');
  const hasHandleRecalculate = salesPageContent.includes(
    'const handleRecalculate = () =>',
  );
  addResult(
    'handleRecalculate function exists',
    hasHandleRecalculate,
    hasHandleRecalculate
      ? 'Function is defined in sales page'
      : 'Function is missing from sales page',
  );

  // Test 2: Check if handleRecalculate closes complete sale modal
  const closesModal =
    salesPageContent.includes('setShowPaymentModal(false)') &&
    salesPageContent.match(
      /const handleRecalculate[\s\S]*?setShowPaymentModal\(false\)/,
    );
  addResult(
    'handleRecalculate closes complete sale modal',
    !!closesModal,
    closesModal
      ? 'Complete sale modal is closed in handleRecalculate'
      : 'Complete sale modal is not closed properly',
  );

  // Test 3: Check if handleRecalculate reopens calculator
  const reopensCalculator =
    salesPageContent.includes('setShowCalculator(true)') &&
    salesPageContent.match(
      /const handleRecalculate[\s\S]*?setShowCalculator\(true\)/,
    );
  addResult(
    'handleRecalculate reopens calculator',
    !!reopensCalculator,
    reopensCalculator
      ? 'Calculator modal is reopened in handleRecalculate'
      : 'Calculator modal is not reopened properly',
  );

  // Test 4: Check if onRecalculate is passed to CompleteSaleModal
  const passesOnRecalculate =
    salesPageContent.includes('onRecalculate={') ||
    salesPageContent.includes('onRecalculate:');
  addResult(
    'onRecalculate callback passed to CompleteSaleModal',
    passesOnRecalculate,
    passesOnRecalculate
      ? 'onRecalculate prop is passed to CompleteSaleModal'
      : 'onRecalculate prop is missing',
  );

  // Test 5: Check if onRecalculate is only passed for cash payments
  const conditionalOnRecalculate = salesPageContent.match(
    /onRecalculate=\{[\s\S]*?selectedPaymentMethod\?\.id === ['"]cash['"]/,
  );
  addResult(
    'onRecalculate only for cash payments',
    !!conditionalOnRecalculate,
    conditionalOnRecalculate
      ? 'onRecalculate is conditionally passed only for cash payments'
      : 'onRecalculate condition may not be correct',
  );

  // Test 6: Check if paymentMethod prop is passed to CompleteSaleModal
  const passesPaymentMethod = salesPageContent.includes(
    'paymentMethod={selectedPaymentMethod',
  );
  addResult(
    'paymentMethod prop passed to CompleteSaleModal',
    passesPaymentMethod,
    passesPaymentMethod
      ? 'paymentMethod prop is passed to CompleteSaleModal'
      : 'paymentMethod prop is missing',
  );

  // Test 7: Check if CompleteSaleModal shows calculator icon for cash
  const modalContent = fs.readFileSync(COMPLETE_SALE_MODAL_PATH, 'utf-8');
  const hasCalculatorIcon =
    modalContent.includes('isCashPayment') &&
    modalContent.includes('onRecalculate') &&
    modalContent.includes('<Calculator');
  addResult(
    'CompleteSaleModal shows calculator icon for cash',
    hasCalculatorIcon,
    hasCalculatorIcon
      ? 'Calculator icon is conditionally shown for cash payments'
      : 'Calculator icon implementation may be missing',
  );

  // Test 8: Check if CashCalculatorModal accepts initialAmountGiven
  const calculatorContent = fs.readFileSync(CALCULATOR_MODAL_PATH, 'utf-8');
  const hasInitialAmountGiven =
    calculatorContent.includes('initialAmountGiven?:') ||
    calculatorContent.includes('initialAmountGiven :');
  addResult(
    'CashCalculatorModal accepts initialAmountGiven',
    hasInitialAmountGiven,
    hasInitialAmountGiven
      ? 'initialAmountGiven prop is defined in CashCalculatorModal'
      : 'initialAmountGiven prop is missing',
  );

  // Test 9: Check if initialAmountGiven is used to set initial state
  const usesInitialAmount = calculatorContent.match(
    /if \(initialAmountGiven[\s\S]*?setAmountGiven\(initialAmountGiven/,
  );
  addResult(
    'CashCalculatorModal uses initialAmountGiven',
    !!usesInitialAmount,
    usesInitialAmount
      ? 'initialAmountGiven is used to set initial calculator state'
      : 'initialAmountGiven may not be used properly',
  );

  // Test 10: Check if initialAmountGiven is passed from sales page
  const passesInitialAmount = salesPageContent.includes(
    'initialAmountGiven={calculatorData?.amountGiven}',
  );
  addResult(
    'initialAmountGiven passed to CashCalculatorModal',
    passesInitialAmount,
    passesInitialAmount
      ? 'initialAmountGiven is passed from sales page'
      : 'initialAmountGiven is not passed properly',
  );

  // Summary
  console.log('\n' + '='.repeat(60));
  const passedTests = results.filter((r) => r.passed).length;
  const totalTests = results.length;
  console.log(`Summary: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log(
      '✓ All tests passed! Recalculate functionality is properly implemented.',
    );
  } else {
    console.log('✗ Some tests failed. Please review the implementation.');
  }
  console.log('='.repeat(60));

  return passedTests === totalTests;
}

// Run the tests
const success = testRecalculateFunctionality();
process.exit(success ? 0 : 1);
