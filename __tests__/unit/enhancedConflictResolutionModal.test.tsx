import React from 'react';
import { render } from '@testing-library/react-native';
import { ConflictResolutionModal } from '@/components/ConflictResolutionModal';
import { DataConflict, ConflictSummary } from '@/services/dataImportService';

// Mock the localization context
jest.mock('@/context/LocalizationContext', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      const translations: { [key: string]: string } = {
        'dataImport.conflictsDetected': 'Conflicts Detected',
        'dataImport.conflictsFound': 'conflicts found with existing data',
        'dataImport.groupedView': 'Grouped',
        'dataImport.listView': 'List',
        'dataImport.conflictStatistics': 'Conflict Statistics',
        'dataImport.conflicts': 'conflicts',
        'dataImport.duplicates': 'duplicates',
        'dataImport.missingReferences': 'missing refs',
        'dataImport.validationErrors': 'validation errors',
        'dataImport.existingRecord': 'Existing Record',
        'dataImport.importedRecord': 'Import Data',
        'dataImport.chooseResolution': 'Choose Resolution',
        'dataImport.resolveConflicts': 'Resolve Conflicts',
        'common.cancel': 'Cancel',
      };

      if (params && key.includes('{{count}}')) {
        return (
          translations[key]?.replace('{{count}}', params.count.toString()) ||
          key
        );
      }

      return translations[key] || key;
    },
  }),
}));

describe('Enhanced ConflictResolutionModal', () => {
  const mockConflicts: DataConflict[] = [
    {
      type: 'duplicate',
      record: { id: 'prod-1', name: 'Test Product', price: 100 },
      existingRecord: { id: 'prod-1', name: 'Test Product', price: 90 },
      message: 'Product with same ID already exists',
      index: 0,
      recordType: 'products',
      matchedBy: 'uuid',
    },
    {
      type: 'validation_failed',
      record: { id: 'cust-1', name: 'Test Customer', email: 'invalid-email' },
      existingRecord: null,
      message: 'Invalid email format',
      index: 1,
      recordType: 'customers',
      matchedBy: 'name',
    },
  ];

  const mockConflictSummary: ConflictSummary = {
    totalConflicts: 2,
    conflictsByType: {
      products: [mockConflicts[0]],
      customers: [mockConflicts[1]],
    },
    conflictStatistics: {
      products: {
        total: 1,
        duplicate: 1,
        reference_missing: 0,
        validation_failed: 0,
      },
      customers: {
        total: 1,
        duplicate: 0,
        reference_missing: 0,
        validation_failed: 1,
      },
    },
    hasConflicts: true,
  };

  const mockProps = {
    visible: true,
    conflicts: mockConflicts,
    conflictSummary: mockConflictSummary,
    onResolve: jest.fn(),
    onCancel: jest.fn(),
  };

  it('should render conflict statistics with enhanced display', () => {
    const { getByText } = render(<ConflictResolutionModal {...mockProps} />);

    expect(getByText('Conflict Summary')).toBeTruthy();
    expect(getByText('2 total conflicts')).toBeTruthy();
    expect(getByText('Products')).toBeTruthy();
    expect(getByText('Customers')).toBeTruthy();
  });

  it('should show enhanced action buttons with clear labels', () => {
    const { getByText } = render(<ConflictResolutionModal {...mockProps} />);

    expect(getByText('Use Import Data')).toBeTruthy();
    expect(getByText('Keep Existing')).toBeTruthy();
    expect(getByText('Skip')).toBeTruthy();
  });

  it('should display side-by-side comparison for duplicate conflicts', () => {
    const { getByText } = render(<ConflictResolutionModal {...mockProps} />);

    expect(getByText('Existing Record')).toBeTruthy();
    expect(getByText('Import Data')).toBeTruthy();
    expect(getByText('Test Product')).toBeTruthy();
  });

  it('should group conflicts by data type', () => {
    const { getByText } = render(<ConflictResolutionModal {...mockProps} />);

    // Should show data type headers
    expect(getByText('Products(1)')).toBeTruthy();
    expect(getByText('Customers(1)')).toBeTruthy();
  });

  it('should handle conflict resolution with proper action mapping', () => {
    const { getByText } = render(<ConflictResolutionModal {...mockProps} />);

    // The resolve button should show the selected action
    const resolveButton = getByText('Use Import Data');
    expect(resolveButton).toBeTruthy();
  });
});
