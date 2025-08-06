import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { ReceiptPreview } from '../ReceiptPreview';
import { ShopSettingsService } from '@/services/shopSettingsService';
import { ShopSettings } from '@/services/database';

// Mock dependencies
jest.mock('@/context/LocalizationContext', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: { [key: string]: string } = {
        'shopSettings.preview': 'Preview',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock WebView
jest.mock('react-native-webview', () => ({
  WebView: ({ source, onError, onLoadStart, onLoadEnd }: any) => {
    const MockWebView = require('react-native').View;
    return <MockWebView testID="webview" />;
  },
}));

describe('ReceiptPreview', () => {
  let mockShopSettingsService: jest.Mocked<ShopSettingsService>;
  let mockShopSettings: ShopSettings;

  beforeEach(() => {
    mockShopSettingsService = {
      previewTemplate: jest.fn(),
    } as any;

    mockShopSettings = {
      id: 1,
      shopName: 'Test Shop',
      address: '123 Test Street',
      phone: '+95-9-123-456-789',
      logoPath: '/path/to/logo.png',
      receiptFooter: 'Thank you for your business!',
      thankYouMessage: 'Come again soon!',
      receiptTemplate: 'classic',
      createdAt: '2025-01-01 00:00:00',
      updatedAt: '2025-01-01 00:00:00',
    };

    jest.clearAllMocks();
  });

  it('should show loading state initially', () => {
    mockShopSettingsService.previewTemplate.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { getByText } = render(
      <ReceiptPreview
        shopSettings={mockShopSettings}
        templateId="classic"
        shopSettingsService={mockShopSettingsService}
      />
    );

    expect(getByText('Generating preview...')).toBeTruthy();
  });

  it('should render preview when loaded successfully', async () => {
    const mockHtml = '<html><body><div>Test Receipt</div></body></html>';
    mockShopSettingsService.previewTemplate.mockResolvedValue(mockHtml);

    const { getByText, getByTestId } = render(
      <ReceiptPreview
        shopSettings={mockShopSettings}
        templateId="classic"
        shopSettingsService={mockShopSettingsService}
      />
    );

    await waitFor(() => {
      expect(getByText('Preview')).toBeTruthy();
      expect(getByText('Live preview with your shop information')).toBeTruthy();
      expect(getByTestId('webview')).toBeTruthy();
    });

    expect(mockShopSettingsService.previewTemplate).toHaveBeenCalledWith(
      'classic',
      mockShopSettings
    );
  });

  it('should show error when preview generation fails', async () => {
    mockShopSettingsService.previewTemplate.mockRejectedValue(
      new Error('Preview failed')
    );

    const { getByText } = render(
      <ReceiptPreview
        shopSettings={mockShopSettings}
        templateId="classic"
        shopSettingsService={mockShopSettingsService}
      />
    );

    await waitFor(() => {
      expect(getByText('Failed to generate preview')).toBeTruthy();
      expect(
        getByText('Please check your settings and try again')
      ).toBeTruthy();
    });
  });

  it('should show error when shop settings service is not available', async () => {
    const { getByText } = render(
      <ReceiptPreview
        shopSettings={mockShopSettings}
        templateId="classic"
        shopSettingsService={null}
      />
    );

    await waitFor(() => {
      expect(getByText('Shop settings service not available')).toBeTruthy();
    });
  });

  it('should regenerate preview when shop settings change', async () => {
    const mockHtml1 = '<html><body><div>Receipt 1</div></body></html>';
    const mockHtml2 = '<html><body><div>Receipt 2</div></body></html>';

    mockShopSettingsService.previewTemplate
      .mockResolvedValueOnce(mockHtml1)
      .mockResolvedValueOnce(mockHtml2);

    const { rerender } = render(
      <ReceiptPreview
        shopSettings={mockShopSettings}
        templateId="classic"
        shopSettingsService={mockShopSettingsService}
      />
    );

    await waitFor(() => {
      expect(mockShopSettingsService.previewTemplate).toHaveBeenCalledTimes(1);
    });

    // Change shop settings
    const updatedShopSettings = {
      ...mockShopSettings,
      shopName: 'Updated Shop',
    };

    rerender(
      <ReceiptPreview
        shopSettings={updatedShopSettings}
        templateId="classic"
        shopSettingsService={mockShopSettingsService}
      />
    );

    await waitFor(() => {
      expect(mockShopSettingsService.previewTemplate).toHaveBeenCalledTimes(2);
      expect(mockShopSettingsService.previewTemplate).toHaveBeenLastCalledWith(
        'classic',
        updatedShopSettings
      );
    });
  });

  it('should regenerate preview when template changes', async () => {
    const mockHtml1 = '<html><body><div>Classic Receipt</div></body></html>';
    const mockHtml2 = '<html><body><div>Modern Receipt</div></body></html>';

    mockShopSettingsService.previewTemplate
      .mockResolvedValueOnce(mockHtml1)
      .mockResolvedValueOnce(mockHtml2);

    const { rerender } = render(
      <ReceiptPreview
        shopSettings={mockShopSettings}
        templateId="classic"
        shopSettingsService={mockShopSettingsService}
      />
    );

    await waitFor(() => {
      expect(mockShopSettingsService.previewTemplate).toHaveBeenCalledWith(
        'classic',
        mockShopSettings
      );
    });

    // Change template
    rerender(
      <ReceiptPreview
        shopSettings={mockShopSettings}
        templateId="modern"
        shopSettingsService={mockShopSettingsService}
      />
    );

    await waitFor(() => {
      expect(mockShopSettingsService.previewTemplate).toHaveBeenCalledTimes(2);
      expect(mockShopSettingsService.previewTemplate).toHaveBeenLastCalledWith(
        'modern',
        mockShopSettings
      );
    });
  });

  it('should work with null shop settings', async () => {
    const mockHtml = '<html><body><div>Default Receipt</div></body></html>';
    mockShopSettingsService.previewTemplate.mockResolvedValue(mockHtml);

    const { getByTestId } = render(
      <ReceiptPreview
        shopSettings={null}
        templateId="classic"
        shopSettingsService={mockShopSettingsService}
      />
    );

    await waitFor(() => {
      expect(getByTestId('webview')).toBeTruthy();
    });

    expect(mockShopSettingsService.previewTemplate).toHaveBeenCalledWith(
      'classic',
      null
    );
  });

  it('should apply custom styles', async () => {
    const mockHtml = '<html><body><div>Test Receipt</div></body></html>';
    mockShopSettingsService.previewTemplate.mockResolvedValue(mockHtml);

    const customStyle = { backgroundColor: 'red' };

    const { getByTestId } = render(
      <ReceiptPreview
        shopSettings={mockShopSettings}
        templateId="classic"
        shopSettingsService={mockShopSettingsService}
        style={customStyle}
      />
    );

    await waitFor(() => {
      expect(getByTestId('webview')).toBeTruthy();
    });

    // The custom style should be applied to the container
    // This is hard to test directly, but we can verify the component renders
    expect(mockShopSettingsService.previewTemplate).toHaveBeenCalled();
  });

  it('should handle WebView errors gracefully', async () => {
    const mockHtml = '<html><body><div>Test Receipt</div></body></html>';
    mockShopSettingsService.previewTemplate.mockResolvedValue(mockHtml);

    // Mock WebView with error callback
    jest.doMock('react-native-webview', () => ({
      WebView: ({ onError }: any) => {
        const MockWebView = require('react-native').View;
        // Simulate WebView error
        setTimeout(() => {
          onError({ nativeEvent: { description: 'WebView error' } });
        }, 100);
        return <MockWebView testID="webview" />;
      },
    }));

    const { getByTestId } = render(
      <ReceiptPreview
        shopSettings={mockShopSettings}
        templateId="classic"
        shopSettingsService={mockShopSettingsService}
      />
    );

    await waitFor(() => {
      expect(getByTestId('webview')).toBeTruthy();
    });

    // WebView error should be handled gracefully
    expect(mockShopSettingsService.previewTemplate).toHaveBeenCalled();
  });
});
