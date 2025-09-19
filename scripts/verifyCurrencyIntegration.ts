#!/usr/bin/env ts-node

/**
 * Currency Integration Verification Script
 *
 * This script verifies that all main app pages are using the standardized
 * currency system instead of custom formatMMK functions.
 */

import * as fs from 'fs';
import * as path from 'path';

interface ValidationIssue {
  file: string;
  line: number;
  issue: string;
  content: string;
}

class CurrencyIntegrationVerifier {
  private issues: ValidationIssue[] = [];
  private checkedFiles: string[] = [];

  async verify(): Promise<void> {
    console.log('🔍 Verifying Currency Integration Across App Pages...\n');

    // Check main app pages
    await this.checkFile('app/(tabs)/dashboard.tsx');
    await this.checkFile('app/(tabs)/sales.tsx');
    await this.checkFile('app/(tabs)/inventory.tsx');
    await this.checkFile('app/expenses.tsx');
    await this.checkFile('components/ExpensesManager.tsx');
    await this.checkFile('app/supplier-detail.tsx');

    // Check for any remaining formatMMK usage
    await this.checkForLegacyCurrencyUsage();

    // Check for proper currency context imports
    await this.checkForProperImports();

    this.printResults();
  }

  private async checkFile(filePath: string): Promise<void> {
    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      this.issues.push({
        file: filePath,
        line: 0,
        issue: 'File not found',
        content: '',
      });
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const lines = content.split('\n');
    this.checkedFiles.push(filePath);

    // Check for legacy formatMMK usage
    lines.forEach((line, index) => {
      if (
        line.includes('formatMMK') &&
        !line.includes('// Removed formatMMK')
      ) {
        this.issues.push({
          file: filePath,
          line: index + 1,
          issue: 'Legacy formatMMK function usage found',
          content: line.trim(),
        });
      }

      if (line.includes("+ ' MMK'") || line.includes('+ " MMK"')) {
        this.issues.push({
          file: filePath,
          line: index + 1,
          issue: 'Hardcoded MMK currency found',
          content: line.trim(),
        });
      }
    });

    // Check for proper currency context import
    const hasOldImport =
      content.includes('useCurrencyFormatter') &&
      content.includes('@/hooks/useCurrency');
    const hasNewImport =
      content.includes('useCurrencyFormatter') &&
      content.includes('@/context/CurrencyContext');

    if (hasOldImport) {
      this.issues.push({
        file: filePath,
        line: 0,
        issue: 'Using old currency hook import',
        content: "import { useCurrencyFormatter } from '@/hooks/useCurrency'",
      });
    }

    if (
      content.includes('useCurrencyFormatter') &&
      !hasNewImport &&
      !hasOldImport
    ) {
      this.issues.push({
        file: filePath,
        line: 0,
        issue: 'Missing currency context import',
        content: 'useCurrencyFormatter used but not imported from context',
      });
    }

    console.log(`✅ Checked ${filePath}`);
  }

  private async checkForLegacyCurrencyUsage(): Promise<void> {
    const appDir = path.join(process.cwd(), 'app');
    const componentsDir = path.join(process.cwd(), 'components');

    await this.scanDirectory(appDir, /\.(tsx?)$/);
    await this.scanDirectory(componentsDir, /\.(tsx?)$/);
  }

  private async scanDirectory(dir: string, pattern: RegExp): Promise<void> {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        await this.scanDirectory(filePath, pattern);
      } else if (pattern.test(file)) {
        const relativePath = path.relative(process.cwd(), filePath);

        // Skip files we already checked
        if (this.checkedFiles.includes(relativePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');

        // Quick check for legacy currency usage
        if (
          content.includes('formatMMK') &&
          !content.includes('// Removed formatMMK')
        ) {
          this.issues.push({
            file: relativePath,
            line: 0,
            issue: 'Unchecked file with legacy formatMMK usage',
            content: 'File contains formatMMK function',
          });
        }
      }
    }
  }

  private async checkForProperImports(): Promise<void> {
    // Check that main app files have proper currency context setup
    const layoutPath = 'app/_layout.tsx';
    const layoutContent = fs.readFileSync(
      path.join(process.cwd(), layoutPath),
      'utf-8'
    );

    if (!layoutContent.includes('CurrencyProvider')) {
      this.issues.push({
        file: layoutPath,
        line: 0,
        issue: 'Missing CurrencyProvider in app layout',
        content: 'CurrencyProvider not found in _layout.tsx',
      });
    }

    // Check that context files exist
    const contextFiles = [
      'context/CurrencyContext.tsx',
      'services/currencySettingsService.ts',
      'services/currencyManager.ts',
    ];

    for (const file of contextFiles) {
      if (!fs.existsSync(path.join(process.cwd(), file))) {
        this.issues.push({
          file: file,
          line: 0,
          issue: 'Required currency system file missing',
          content: 'File does not exist',
        });
      }
    }
  }

  private printResults(): void {
    console.log('\n📋 Currency Integration Verification Results:');

    if (this.issues.length === 0) {
      console.log('🎉 All checks passed! Currency integration is complete.');
      console.log('\n✅ Verified Features:');
      console.log('   - No legacy formatMMK functions found');
      console.log('   - All imports use new currency context');
      console.log('   - No hardcoded MMK currency references');
      console.log('   - CurrencyProvider properly integrated');
      console.log('   - All required currency files exist');
    } else {
      console.log(
        `⚠️  Found ${this.issues.length} issues that need attention:\n`
      );

      this.issues.forEach((issue, index) => {
        console.log(
          `${index + 1}. ${issue.file}${issue.line > 0 ? `:${issue.line}` : ''}`
        );
        console.log(`   Issue: ${issue.issue}`);
        if (issue.content) {
          console.log(`   Content: ${issue.content}`);
        }
        console.log('');
      });

      console.log('🔧 Recommended Actions:');
      console.log(
        '   1. Replace any remaining formatMMK functions with formatPrice from useCurrencyFormatter'
      );
      console.log(
        '   2. Update imports to use @/context/CurrencyContext instead of @/hooks/useCurrency'
      );
      console.log(
        '   3. Remove hardcoded MMK references and use dynamic currency formatting'
      );
      console.log(
        '   4. Ensure CurrencyProvider is properly set up in app layout'
      );
    }

    console.log('\n📊 Summary:');
    console.log(`   Files checked: ${this.checkedFiles.length}`);
    console.log(`   Issues found: ${this.issues.length}`);
    console.log(
      `   Status: ${this.issues.length === 0 ? 'PASSED' : 'NEEDS ATTENTION'}`
    );
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  const verifier = new CurrencyIntegrationVerifier();
  verifier.verify().catch((error) => {
    console.error('❌ Verification script failed:', error);
    process.exit(1);
  });
}

export { CurrencyIntegrationVerifier };
