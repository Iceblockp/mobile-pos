/**
 * Test script for UUID migration validation
 * Runs comprehensive tests for migration validation functionality
 */

import { execSync } from 'child_process';
import * as path from 'path';

interface TestResult {
  testFile: string;
  passed: boolean;
  output: string;
  error?: string;
}

class MigrationValidationTester {
  private testFiles = [
    '__tests__/unit/migrationValidation.test.ts',
    '__tests__/unit/uuidMigrationService.test.ts',
    '__tests__/integration/migrationValidation.integration.test.ts',
    '__tests__/e2e/migrationValidation.e2e.test.ts',
  ];

  async runAllTests(): Promise<void> {
    console.log('🧪 Running UUID Migration Validation Tests...\n');

    const results: TestResult[] = [];

    for (const testFile of this.testFiles) {
      console.log(`📋 Running ${testFile}...`);
      const result = await this.runSingleTest(testFile);
      results.push(result);

      if (result.passed) {
        console.log(`✅ ${testFile} - PASSED\n`);
      } else {
        console.log(`❌ ${testFile} - FAILED`);
        console.log(`Error: ${result.error}\n`);
      }
    }

    this.printSummary(results);
  }

  private async runSingleTest(testFile: string): Promise<TestResult> {
    try {
      const output = execSync(`npm test -- ${testFile} --verbose`, {
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 30000, // 30 second timeout
      });

      return {
        testFile,
        passed: true,
        output,
      };
    } catch (error: any) {
      return {
        testFile,
        passed: false,
        output: error.stdout || '',
        error: error.message,
      };
    }
  }

  private printSummary(results: TestResult[]): void {
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => r.passed === false).length;

    console.log('📊 Test Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📁 Total: ${results.length}\n`);

    if (failed > 0) {
      console.log('❌ Failed Tests:');
      results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.log(`  - ${r.testFile}`);
          if (r.error) {
            console.log(`    Error: ${r.error.substring(0, 200)}...`);
          }
        });
      console.log();
    }

    if (passed === results.length) {
      console.log('🎉 All migration validation tests passed!');
    } else {
      console.log('⚠️  Some tests failed. Please review the errors above.');
      process.exit(1);
    }
  }

  async validateMigrationReadiness(): Promise<void> {
    console.log('🔍 Validating Migration Readiness...\n');

    const checks = [
      this.checkUUIDServiceExists(),
      this.checkMigrationServiceExists(),
      this.checkTestFilesExist(),
      this.checkDependencies(),
    ];

    const results = await Promise.all(checks);
    const allPassed = results.every((r) => r.passed);

    console.log('📋 Readiness Check Results:');
    results.forEach((r) => {
      console.log(`${r.passed ? '✅' : '❌'} ${r.description}`);
      if (!r.passed && r.details) {
        console.log(`   ${r.details}`);
      }
    });

    if (allPassed) {
      console.log('\n✅ Migration validation is ready to run!');
    } else {
      console.log('\n❌ Migration validation setup is incomplete.');
      process.exit(1);
    }
  }

  private async checkUUIDServiceExists(): Promise<{
    passed: boolean;
    description: string;
    details?: string;
  }> {
    try {
      const fs = require('fs');
      const exists = fs.existsSync(path.join(process.cwd(), 'utils/uuid.ts'));
      return {
        passed: exists,
        description: 'UUID Service exists',
        details: exists ? undefined : 'utils/uuid.ts not found',
      };
    } catch (error) {
      return {
        passed: false,
        description: 'UUID Service exists',
        details: `Error checking file: ${error}`,
      };
    }
  }

  private async checkMigrationServiceExists(): Promise<{
    passed: boolean;
    description: string;
    details?: string;
  }> {
    try {
      const fs = require('fs');
      const exists = fs.existsSync(
        path.join(process.cwd(), 'services/uuidMigrationService.ts')
      );
      return {
        passed: exists,
        description: 'UUID Migration Service exists',
        details: exists
          ? undefined
          : 'services/uuidMigrationService.ts not found',
      };
    } catch (error) {
      return {
        passed: false,
        description: 'UUID Migration Service exists',
        details: `Error checking file: ${error}`,
      };
    }
  }

  private async checkTestFilesExist(): Promise<{
    passed: boolean;
    description: string;
    details?: string;
  }> {
    try {
      const fs = require('fs');
      const missingFiles = this.testFiles.filter(
        (file) => !fs.existsSync(path.join(process.cwd(), file))
      );

      return {
        passed: missingFiles.length === 0,
        description: 'All test files exist',
        details:
          missingFiles.length > 0
            ? `Missing: ${missingFiles.join(', ')}`
            : undefined,
      };
    } catch (error) {
      return {
        passed: false,
        description: 'All test files exist',
        details: `Error checking files: ${error}`,
      };
    }
  }

  private async checkDependencies(): Promise<{
    passed: boolean;
    description: string;
    details?: string;
  }> {
    try {
      const packageJson = require(path.join(process.cwd(), 'package.json'));
      const hasJest =
        packageJson.devDependencies?.jest || packageJson.dependencies?.jest;
      const hasExpoSqlite = packageJson.dependencies?.['expo-sqlite'];

      const missing = [];
      if (!hasJest) missing.push('jest');
      if (!hasExpoSqlite) missing.push('expo-sqlite');

      return {
        passed: missing.length === 0,
        description: 'Required dependencies available',
        details:
          missing.length > 0 ? `Missing: ${missing.join(', ')}` : undefined,
      };
    } catch (error) {
      return {
        passed: false,
        description: 'Required dependencies available',
        details: `Error checking package.json: ${error}`,
      };
    }
  }
}

// Main execution
async function main() {
  const tester = new MigrationValidationTester();

  const command = process.argv[2];

  switch (command) {
    case 'check':
      await tester.validateMigrationReadiness();
      break;
    case 'test':
    default:
      await tester.validateMigrationReadiness();
      await tester.runAllTests();
      break;
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

export { MigrationValidationTester };
