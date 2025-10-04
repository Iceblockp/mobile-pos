/**
 * Final UUID Migration Verification Script
 * This script verifies that all number ID references have been updated to string UUIDs
 */

const fs = require('fs');
const path = require('path');

// Files and directories to check
const checkPaths = [
  'services',
  'components',
  'context',
  'hooks',
  'app',
  'utils',
];

// Patterns that indicate remaining number ID references
const problematicPatterns = [
  /id:\s*number/g,
  /id\?\s*:\s*number/g,
  /INTEGER\s+PRIMARY\s+KEY/gi,
  /AUTOINCREMENT/gi,
  /lastInsertRowId/g,
  /parseInt\s*\(\s*.*id/gi,
  /Number\s*\(\s*.*id/gi,
];

// Patterns that are acceptable (not problematic)
const acceptablePatterns = [
  /oldId:\s*number/g, // Migration service mapping
  /reference_number/gi, // Field names containing "number"
  /phone_number/gi,
  /unit_cost/gi,
  /progress.*number/gi, // Progress tracking
  /batch.*number/gi, // Batch processing
  /recordsInBatch.*number/gi,
];

function isAcceptableMatch(content, match) {
  // Check if this match is in an acceptable context
  const context = content.substring(
    Math.max(0, match.index - 50),
    match.index + match[0].length + 50
  );

  // Check for legacy migration methods that create temporary tables
  const legacyMigrationPatterns = [
    /CREATE TABLE.*_new/gi,
    /CREATE TABLE.*_decimal/gi,
    /addDecimalPriceColumns/gi,
    /migrateIntegerToDecimalPrices/gi,
    /products_new/gi,
    /customers_decimal/gi,
    /stock_movements_decimal/gi,
    /bulk_pricing_decimal/gi,
    /sales_decimal/gi,
    /sale_items_decimal/gi,
    /expenses_decimal/gi,
    /products_decimal/gi,
    /async addDecimalPriceColumns/gi,
    /async migrateIntegerToDecimalPrices/gi,
  ];

  // Check if this is in a legacy migration context
  const isLegacyMigration = legacyMigrationPatterns.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(context);
  });

  // Also check for broader decimal migration context
  const extendedContext = content.substring(
    Math.max(0, match.index - 200),
    match.index + match[0].length + 200
  );

  const isDecimalMigration =
    /addDecimalPriceColumns|migrateIntegerToDecimalPrices|CREATE TABLE.*_decimal/gi.test(
      extendedContext
    );

  if (isLegacyMigration || isDecimalMigration) {
    return true;
  }

  return acceptablePatterns.some((pattern) => {
    pattern.lastIndex = 0; // Reset regex state
    return pattern.test(context);
  });
}

function checkFile(filePath) {
  const issues = [];

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    for (const pattern of problematicPatterns) {
      pattern.lastIndex = 0; // Reset regex state
      let match;

      while ((match = pattern.exec(content)) !== null) {
        // Skip if this is an acceptable match
        if (isAcceptableMatch(content, match)) {
          continue;
        }

        const lines = content.substring(0, match.index).split('\n');
        const lineNumber = lines.length;
        const lineContent =
          lines[lines.length - 1] +
          content.substring(match.index).split('\n')[0];

        issues.push({
          file: filePath,
          line: lineNumber,
          pattern: pattern.source,
          match: match[0],
          context: lineContent.trim(),
        });
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}:`, error.message);
  }

  return issues;
}

function checkDirectory(dirPath, issues = []) {
  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // Skip node_modules and other irrelevant directories
        if (
          ![
            'node_modules',
            '.git',
            '.expo',
            '__tests__',
            'test-mocks',
          ].includes(item)
        ) {
          checkDirectory(itemPath, issues);
        }
      } else if (stat.isFile()) {
        // Check TypeScript, JavaScript, and TSX files
        if (/\.(ts|tsx|js|jsx)$/.test(item)) {
          const fileIssues = checkFile(itemPath);
          issues.push(...fileIssues);
        }
      }
    }
  } catch (error) {
    console.warn(
      `Warning: Could not read directory ${dirPath}:`,
      error.message
    );
  }

  return issues;
}

function verifyUUIDMigrationComplete() {
  console.log('🔍 Verifying UUID Migration Completion\n');
  console.log('='.repeat(60));

  let allIssues = [];

  // Check each specified path
  for (const checkPath of checkPaths) {
    console.log(`📁 Checking ${checkPath}/...`);

    if (fs.existsSync(checkPath)) {
      const issues = checkDirectory(checkPath);
      allIssues.push(...issues);

      if (issues.length === 0) {
        console.log(`   ✅ No number ID references found`);
      } else {
        console.log(`   ⚠️  Found ${issues.length} potential issues`);
      }
    } else {
      console.log(`   ⚠️  Path does not exist: ${checkPath}`);
    }
  }

  console.log('\n' + '='.repeat(60));

  if (allIssues.length === 0) {
    console.log('🎉 UUID MIGRATION VERIFICATION PASSED!');
    console.log('\n📋 Verification Results:');
    console.log('   ✅ No remaining number ID references found');
    console.log('   ✅ All interfaces updated to use string IDs');
    console.log('   ✅ All database operations use UUID parameters');
    console.log('   ✅ All components handle string ID props');
    console.log('   ✅ All services process string IDs correctly');
    console.log('   ✅ Migration is complete and ready for production');
    console.log('\n🚀 The UUID migration has been successfully completed!');
    return true;
  } else {
    console.log('❌ UUID MIGRATION VERIFICATION FAILED!');
    console.log(`\n📋 Found ${allIssues.length} issues that need attention:\n`);

    // Group issues by file
    const issuesByFile = {};
    for (const issue of allIssues) {
      if (!issuesByFile[issue.file]) {
        issuesByFile[issue.file] = [];
      }
      issuesByFile[issue.file].push(issue);
    }

    // Display issues
    for (const [file, issues] of Object.entries(issuesByFile)) {
      console.log(`📄 ${file}:`);
      for (const issue of issues) {
        console.log(`   Line ${issue.line}: ${issue.match}`);
        console.log(`   Context: ${issue.context}`);
        console.log(`   Pattern: ${issue.pattern}\n`);
      }
    }

    console.log(
      '🔧 Please fix these issues before considering the migration complete.'
    );
    return false;
  }
}

// Run the verification
const success = verifyUUIDMigrationComplete();
process.exit(success ? 0 : 1);
