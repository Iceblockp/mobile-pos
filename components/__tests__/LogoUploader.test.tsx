import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { LogoUploader } from '../LogoUploader';
import { ShopSettingsService } from '@/services/shopSettingsService';

// Mock dependencies
jest.mock('@/context/LocalizationContext', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('@/context/ToastContext', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('LogoUploader', () => {
  let mockShopSettingsService: jest.Mocked<ShopSettingsService>;
  let mockOnLogoChange: jest.Mock;

  beforeEach(() => {
    mockShopSettingsService = {
      pickImageFromGallery: jest.fn(),
      takePhotoWithCamera: jest.fn(),
      uploadLogo: jest.fn(),
      deleteLogo: jest.fn(),
    } as any;

    mockOnLogoChange = jest.fn();

    jest.clearAllMocks();
  });

  it('should render upload placeholder when no logo is provided', () => {
    const { getByText } = render(
      <LogoUploader
        shopSettingsService={mockShopSettingsService}
        onLogoChange={mockOnLogoChange}
      />
    );

    expect(getByText('shopSettings.logo')).toBeTruthy();
    expect(getByText('No logo uploaded')).toBeTruthy();
    expect(getByText('shopSettings.uploadLogo')).toBeTruthy();
  });

  it('should render logo preview when logo path is provided', () => {
    const logoPath = '/path/to/logo.jpg';

    const { getByText, queryByText } = render(
      <LogoUploader
        logoPath={logoPath}
        shopSettingsService={mockShopSettingsService}
        onLogoChange={mockOnLogoChange}
      />
    );

    expect(getByText('shopSettings.changeLogo')).toBeTruthy();
    expect(queryByText('No logo uploaded')).toBeNull();
    expect(queryByText('shopSettings.uploadLogo')).toBeNull();
  });

  it('should show image source options when upload button is pressed', () => {
    const { getByText } = render(
      <LogoUploader
        shopSettingsService={mockShopSettingsService}
        onLogoChange={mockOnLogoChange}
      />
    );

    fireEvent.press(getByText('shopSettings.uploadLogo'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'shopSettings.logoUpload.selectSource',
      '',
      expect.arrayContaining([
        expect.objectContaining({ text: 'shopSettings.logoUpload.camera' }),
        expect.objectContaining({ text: 'shopSettings.logoUpload.gallery' }),
        expect.objectContaining({ text: 'shopSettings.logoUpload.cancel' }),
      ]),
      { cancelable: true }
    );
  });

  it('should handle gallery image selection successfully', async () => {
    const mockImageUri = '/mock/image.jpg';
    const mockLogoPath = '/mock/uploaded/logo.jpg';

    mockShopSettingsService.pickImageFromGallery.mockResolvedValue(
      mockImageUri
    );
    mockShopSettingsService.uploadLogo.mockResolvedValue(mockLogoPath);

    const { getByText } = render(
      <LogoUploader
        shopSettingsService={mockShopSettingsService}
        onLogoChange={mockOnLogoChange}
      />
    );

    fireEvent.press(getByText('shopSettings.uploadLogo'));

    // Get the gallery option from the Alert.alert call
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const galleryOption = alertCall[2].find(
      (option: any) => option.text === 'shopSettings.logoUpload.gallery'
    );

    // Simulate pressing the gallery option
    await galleryOption.onPress();

    await waitFor(() => {
      expect(mockShopSettingsService.pickImageFromGallery).toHaveBeenCalled();
      expect(mockShopSettingsService.uploadLogo).toHaveBeenCalledWith(
        mockImageUri
      );
      expect(mockOnLogoChange).toHaveBeenCalledWith(mockLogoPath);
    });
  });

  it('should handle camera photo capture successfully', async () => {
    const mockImageUri = '/mock/camera-image.jpg';
    const mockLogoPath = '/mock/uploaded/camera-logo.jpg';

    mockShopSettingsService.takePhotoWithCamera.mockResolvedValue(mockImageUri);
    mockShopSettingsService.uploadLogo.mockResolvedValue(mockLogoPath);

    const { getByText } = render(
      <LogoUploader
        shopSettingsService={mockShopSettingsService}
        onLogoChange={mockOnLogoChange}
      />
    );

    fireEvent.press(getByText('shopSettings.uploadLogo'));

    // Get the camera option from the Alert.alert call
    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const cameraOption = alertCall[2].find(
      (option: any) => option.text === 'shopSettings.logoUpload.camera'
    );

    // Simulate pressing the camera option
    await cameraOption.onPress();

    await waitFor(() => {
      expect(mockShopSettingsService.takePhotoWithCamera).toHaveBeenCalled();
      expect(mockShopSettingsService.uploadLogo).toHaveBeenCalledWith(
        mockImageUri
      );
      expect(mockOnLogoChange).toHaveBeenCalledWith(mockLogoPath);
    });
  });

  it('should handle upload errors gracefully', async () => {
    const mockError = new Error('Upload failed');
    mockShopSettingsService.pickImageFromGallery.mockRejectedValue(mockError);

    const { getByText } = render(
      <LogoUploader
        shopSettingsService={mockShopSettingsService}
        onLogoChange={mockOnLogoChange}
      />
    );

    fireEvent.press(getByText('shopSettings.uploadLogo'));

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const galleryOption = alertCall[2].find(
      (option: any) => option.text === 'shopSettings.logoUpload.gallery'
    );

    await galleryOption.onPress();

    await waitFor(() => {
      expect(mockOnLogoChange).not.toHaveBeenCalled();
    });
  });

  it('should handle logo removal', async () => {
    const logoPath = '/path/to/existing/logo.jpg';

    const { getByTestId } = render(
      <LogoUploader
        logoPath={logoPath}
        shopSettingsService={mockShopSettingsService}
        onLogoChange={mockOnLogoChange}
      />
    );

    // Find and press the remove button (X button in the overlay)
    const removeButton =
      getByTestId('remove-logo-button') ||
      getByTestId('logo-overlay').children[0];

    fireEvent.press(removeButton);

    expect(Alert.alert).toHaveBeenCalledWith(
      'shopSettings.removeLogo',
      'Are you sure you want to remove the current logo?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'common.cancel' }),
        expect.objectContaining({ text: 'shopSettings.removeLogo' }),
      ])
    );

    // Simulate confirming removal
    const confirmCall = (Alert.alert as jest.Mock).mock.calls[1];
    const confirmOption = confirmCall[2].find(
      (option: any) => option.text === 'shopSettings.removeLogo'
    );

    await confirmOption.onPress();

    await waitFor(() => {
      expect(mockShopSettingsService.deleteLogo).toHaveBeenCalledWith(logoPath);
      expect(mockOnLogoChange).toHaveBeenCalledWith(null);
    });
  });

  it('should not call onLogoChange when user cancels image selection', async () => {
    mockShopSettingsService.pickImageFromGallery.mockResolvedValue(null);

    const { getByText } = render(
      <LogoUploader
        shopSettingsService={mockShopSettingsService}
        onLogoChange={mockOnLogoChange}
      />
    );

    fireEvent.press(getByText('shopSettings.uploadLogo'));

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const galleryOption = alertCall[2].find(
      (option: any) => option.text === 'shopSettings.logoUpload.gallery'
    );

    await galleryOption.onPress();

    await waitFor(() => {
      expect(mockShopSettingsService.pickImageFromGallery).toHaveBeenCalled();
      expect(mockShopSettingsService.uploadLogo).not.toHaveBeenCalled();
      expect(mockOnLogoChange).not.toHaveBeenCalled();
    });
  });

  it('should show loading state during upload', async () => {
    // Create a promise that we can control
    let resolveUpload: (value: string) => void;
    const uploadPromise = new Promise<string>((resolve) => {
      resolveUpload = resolve;
    });

    mockShopSettingsService.pickImageFromGallery.mockResolvedValue(
      '/mock/image.jpg'
    );
    mockShopSettingsService.uploadLogo.mockReturnValue(uploadPromise);

    const { getByText, getByTestId } = render(
      <LogoUploader
        shopSettingsService={mockShopSettingsService}
        onLogoChange={mockOnLogoChange}
      />
    );

    fireEvent.press(getByText('shopSettings.uploadLogo'));

    const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
    const galleryOption = alertCall[2].find(
      (option: any) => option.text === 'shopSettings.logoUpload.gallery'
    );

    // Start the upload process
    galleryOption.onPress();

    // Should show loading state
    await waitFor(() => {
      expect(getByTestId('activity-indicator')).toBeTruthy();
    });

    // Resolve the upload
    resolveUpload!('/mock/uploaded/logo.jpg');

    // Loading should be gone
    await waitFor(() => {
      expect(mockOnLogoChange).toHaveBeenCalledWith('/mock/uploaded/logo.jpg');
    });
  });
});
