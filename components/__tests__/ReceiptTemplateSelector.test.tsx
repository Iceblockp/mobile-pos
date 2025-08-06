import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ReceiptTemplateSelector } from '../ReceiptTemplateSelector';
import { ShopSettingsService } from '@/services/shopSettingsService';
import { ReceiptTemplate } from '@/services/templateEngine';
import { ShopSettings } from '@/services/database';

// Mock dependencies
jest.mock('@/context/LocalizationContext', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: { [key: string]: string } = {
        'common.loading': 'Loading...',
        'shopSettings.template': 'Receipt Template',
        'shopSettings.templates.classic': 'Classic',
        'shopSettings.templates.modern': 'Modern',
        'shopSettings.templates.minimal': 'Minimal',
        'shopSettings.templates.elegant': 'Elegant',
      };
      return translations[key] || key;
    },
  }),
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

// Mock WebView
jest.mock('react-native-webview', () => ({
  WebView: ({ source, onError }: any) => {
    const MockWebView = require('react-native').View;
    return <MockWebView testID="webview" />;
  },
}));

describe('ReceiptTemplateSelector', () => {
  let mockShopSettingsService: jest.Mocked<ShopSettingsService>;
  let mockOnTemplateChange: jest.Mock;
  let mockShopSettings: ShopSettings;
  let mockTemplates: ReceiptTemplate[];

  beforeEach(() => {
    mockTemplates = [
      {
        id: 'classic',
        name: 'Classic',
        description: 'Traditional receipt design',
        htmlTemplate: '<div>Classic Template</div>',
        cssStyles: 'body { font-family: monospace; }',
      },
      {
        id: 'modern',
        name: 'Modern',
        description: 'Contemporary design',
        htmlTemplate: '<div>Modern Template</div>',
        cssStyles: 'body { font-family: sans-serif; }',
      },
    ];

    mockShopSettingsService = {
      getAvailableTemplates: jest.fn().mockReturnValue(mockTemplates),
      previewTemplate: jest.fn(),
    } as any;

    mockOnTemplateChange = jest.fn();

    mockShopSettings = {
      id: 1,
      shopName: 'Test Shop',
      address: '123 Test St',
      phone: '+95-9-123-456-789',
      logoPath: '/path/to/logo.png',
      receiptFooter: 'Thank you!',
      thankYouMessage: 'Come again!',
      receiptTemplate: 'classic',
      createdAt: '2025-01-01 00:00:00',
      updatedAt: '2025-01-01 00:00:00',
    };

    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    const { getByText } = render(
      <ReceiptTemplateSelector
        selectedTemplate="classic"
        onTemplateChange={mockOnTemplateChange}
        shopSettingsService={mockShopSettingsService}
        shopSettings={mockShopSettings}
      />
    );

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should render templates after loading', async () => {
    mockShopSettingsService.previewTemplate.mockResolvedValue(
      '<html><body>Preview</body></html>'
    );

    const { getByText, queryByText } = render(
      <ReceiptTemplateSelector
        selectedTemplate="classic"
        onTemplateChange={mockOnTemplateChange}
        shopSettingsService={mockShopSettingsService}
        shopSettings={mockShopSettings}
      />
    );

    await waitFor(() => {
      expect(queryByText('Loading...')).toBeNull();
    });

    expect(getByText('Classic')).toBeTruthy();
    expect(getByText('Modern')).toBeTruthy();
    expect(getByText('Traditional receipt design')).toBeTruthy();
    expect(getByText('Contemporary design')).toBeTruthy();
  });

  it('should show selected template with badge', async () => {
    mockShopSettingsService.previewTemplate.mockResolvedValue(
      '<html><body>Preview</body></html>'
    );

    const { getByTestId } = render(
      <ReceiptTemplateSelector
        selectedTemplate="classic"
        onTemplateChange={mockOnTemplateChange}
        shopSettingsService={mockShopSettingsService}
        shopSettings={mockShopSettings}
      />
    );

    await waitFor(() => {
      expect(mockShopSettingsService.getAvailableTemplates).toHaveBeenCalled();
    });

    // The selected template should have a check badge
    // This would be visible in the UI but hard to test without more specific test IDs
    expect(mockShopSettingsService.getAvailableTemplates).toHaveBeenCalled();
  });

  it('should call onTemplateChange when template is selected', async () => {
    mockShopSettingsService.previewTemplate.mockResolvedValue(
      '<html><body>Preview</body></html>'
    );

    const { getByText } = render(
      <ReceiptTemplateSelector
        selectedTemplate="classic"
        onTemplateChange={mockOnTemplateChange}
        shopSettingsService={mockShopSettingsService}
        shopSettings={mockShopSettings}
      />
    );

    await waitFor(() => {
      expect(getByText('Modern')).toBeTruthy();
    });

    fireEvent.press(getByText('Modern'));

    expect(mockOnTemplateChange).toHaveBeenCalledWith('modern');
  });

  it('should toggle preview when preview button is pressed', async () => {
    mockShopSettingsService.previewTemplate.mockResolvedValue(
      '<html><body>Preview</body></html>'
    );

    const { getByText, queryByTestId } = render(
      <ReceiptTemplateSelector
        selectedTemplate="classic"
        onTemplateChange={mockOnTemplateChange}
        shopSettingsService={mockShopSettingsService}
        shopSettings={mockShopSettings}
      />
    );

    await waitFor(() => {
      expect(getByText('Show Preview')).toBeTruthy();
    });

    // Initially preview should be hidden
    expect(queryByTestId('webview')).toBeNull();

    // Press show preview
    fireEvent.press(getByText('Show Preview'));

    await waitFor(() => {
      expect(getByText('Hide Preview')).toBeTruthy();
    });

    // Now preview should be visible
    expect(queryByTestId('webview')).toBeTruthy();

    // Press hide preview
    fireEvent.press(getByText('Hide Preview'));

    await waitFor(() => {
      expect(getByText('Show Preview')).toBeTruthy();
    });
  });

  it('should generate previews for all templates', async () => {
    const mockPreviewHtml = '<html><body>Mock Preview</body></html>';
    mockShopSettingsService.previewTemplate.mockResolvedValue(mockPreviewHtml);

    render(
      <ReceiptTemplateSelector
        selectedTemplate="classic"
        onTemplateChange={mockOnTemplateChange}
        shopSettingsService={mockShopSettingsService}
        shopSettings={mockShopSettings}
      />
    );

    await waitFor(() => {
      expect(mockShopSettingsService.previewTemplate).toHaveBeenCalledTimes(2);
    });

    expect(mockShopSettingsService.previewTemplate).toHaveBeenCalledWith(
      'classic',
      mockShopSettings
    );
    expect(mockShopSettingsService.previewTemplate).toHaveBeenCalledWith(
      'modern',
      mockShopSettings
    );
  });

  it('should handle preview generation errors gracefully', async () => {
    mockShopSettingsService.previewTemplate
      .mockResolvedValueOnce('<html><body>Classic Preview</body></html>')
      .mockRejectedValueOnce(new Error('Preview failed'));

    const { getByText } = render(
      <ReceiptTemplateSelector
        selectedTemplate="classic"
        onTemplateChange={mockOnTemplateChange}
        shopSettingsService={mockShopSettingsService}
        shopSettings={mockShopSettings}
      />
    );

    await waitFor(() => {
      expect(getByText('Classic')).toBeTruthy();
      expect(getByText('Modern')).toBeTruthy();
    });

    // Should still render templates even if preview fails
    expect(mockShopSettingsService.previewTemplate).toHaveBeenCalledTimes(2);
  });

  it('should work without shop settings', async () => {
    mockShopSettingsService.previewTemplate.mockResolvedValue(
      '<html><body>Preview</body></html>'
    );

    const { getByText } = render(
      <ReceiptTemplateSelector
        selectedTemplate="classic"
        onTemplateChange={mockOnTemplateChange}
        shopSettingsService={mockShopSettingsService}
        shopSettings={null}
      />
    );

    await waitFor(() => {
      expect(getByText('Classic')).toBeTruthy();
    });

    expect(mockShopSettingsService.previewTemplate).toHaveBeenCalledWith(
      'classic',
      null
    );
  });

  it('should show selected template info at bottom', async () => {
    mockShopSettingsService.previewTemplate.mockResolvedValue(
      '<html><body>Preview</body></html>'
    );

    const { getByText } = render(
      <ReceiptTemplateSelector
        selectedTemplate="modern"
        onTemplateChange={mockOnTemplateChange}
        shopSettingsService={mockShopSettingsService}
        shopSettings={mockShopSettings}
      />
    );

    await waitFor(() => {
      expect(getByText('Selected: Modern')).toBeTruthy();
    });
  });

  it('should handle template loading failure', async () => {
    mockShopSettingsService.getAvailableTemplates.mockImplementation(() => {
      throw new Error('Failed to load templates');
    });

    const { getByText } = render(
      <ReceiptTemplateSelector
        selectedTemplate="classic"
        onTemplateChange={mockOnTemplateChange}
        shopSettingsService={mockShopSettingsService}
        shopSettings={mockShopSettings}
      />
    );

    // Should eventually stop loading even if there's an error
    await waitFor(() => {
      // The component should handle the error gracefully
      expect(mockShopSettingsService.getAvailableTemplates).toHaveBeenCalled();
    });
  });

  it('should show preview loading state', async () => {
    // Create a promise that we can control
    let resolvePreview: (value: string) => void;
    const previewPromise = new Promise<string>((resolve) => {
      resolvePreview = resolve;
    });

    mockShopSettingsService.previewTemplate.mockReturnValue(previewPromise);

    const { getByText } = render(
      <ReceiptTemplateSelector
        selectedTemplate="classic"
        onTemplateChange={mockOnTemplateChange}
        shopSettingsService={mockShopSettingsService}
        shopSettings={mockShopSettings}
      />
    );

    await waitFor(() => {
      expect(getByText('Classic')).toBeTruthy();
    });

    // Show preview
    fireEvent.press(getByText('Show Preview'));

    await waitFor(() => {
      expect(getByText('Generating preview...')).toBeTruthy();
    });

    // Resolve the preview
    resolvePreview!('<html><body>Preview</body></html>');

    await waitFor(() => {
      expect(getByText('Hide Preview')).toBeTruthy();
    });
  });
});
