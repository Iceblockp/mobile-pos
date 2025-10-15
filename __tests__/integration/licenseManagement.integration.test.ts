import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LicenseManagement from '@/app/license-management';
import More from '@/app/(tabs)/more';
import { useLicense } from '@/hooks/useLicense';
import { useTranslation } from '@/context/LocalizationContext';

// Mock dependencies
jest.mock('@/hooks/useLicense');
jest.mock('@/context/LocalizationContext');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

const mockUseLicense = useLicense as jest.MockedFunction<typeof useLicense>;
const mockUseTranslation = useTranslation as jest.MockedFunction<
  typeof useTranslation
>;

// Mock translation function
const mockT = (key: string) => key;

const Stack = createStackNavigator();

const TestNavigator = ({ initialRouteName = 'More' }) => (
  <NavigationContainer>
    <Stack.Navigator initialRouteName={initialRouteName}>
      <Stack.Screen name="More" component={More} />
      <Stack.Screen name="LicenseManagement" component={LicenseManagement} />
    </Stack.Navigator>
  </NavigationContainer>
);

describe('License Management Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTranslation.mockReturnValue({
      t: mockT,
      currentLanguage: 'en',
      setLanguage: jest.fn(),
    });
  });

  describe('Navigation from More tab', () => {
    it('should navigate to license management page from More tab', async () => {
      const mockPush = jest.fn();

      // Mock expo-router
      jest.doMock('expo-router', () => ({
        useRouter: () => ({
          push: mockPush,
          back: jest.fn(),
        }),
      }));

      const { getByText } = render(<TestNavigator />);

      // Find and tap the License Management menu item
      const licenseManagementItem = getByText('more.licenseManagement');
      fireEvent.press(licenseManagementItem);

      expect(mockPush).toHaveBeenCalledWith('/license-management');
    });
  });

  describe('License Management Page Display', () => {
    it('should display current license status for valid license', async () => {
      mockUseLicense.mockReturnValue({
        licenseStatus: {
          isLicensed: true,
          expiryDate: '20241215120000',
          challenge: null,
          lastVerified: '2024-10-15T10:00:00.000Z',
        },
        loading: false,
        verifying: false,
        verifyLicense: jest.fn(),
        regenerateChallenge: jest.fn(),
        extendLicense: jest.fn(),
        generateExtensionChallenge: jest.fn(),
        isLicenseValid: jest.fn().mockReturnValue(true),
        getExpiryDate: jest.fn().mockReturnValue('12/15/2024, 12:00:00 PM'),
        getRemainingDays: jest.fn().mockReturnValue(45),
      });

      const { getByText } = render(
        <TestNavigator initialRouteName="LicenseManagement" />
      );

      await waitFor(() => {
        expect(getByText('license.currentLicenseStatus')).toBeTruthy();
        expect(getByText('license.licenseActive')).toBeTruthy();
        expect(getByText('12/15/2024, 12:00:00 PM')).toBeTruthy();
        expect(getByText('45 license.daysRemaining')).toBeTruthy();
      });
    });

    it('should display expired license status', async () => {
      mockUseLicense.mockReturnValue({
        licenseStatus: {
          isLicensed: false,
          expiryDate: '20241015120000',
          challenge: null,
          lastVerified: '2024-10-15T10:00:00.000Z',
        },
        loading: false,
        verifying: false,
        verifyLicense: jest.fn(),
        regenerateChallenge: jest.fn(),
        extendLicense: jest.fn(),
        generateExtensionChallenge: jest.fn(),
        isLicenseValid: jest.fn().mockReturnValue(false),
        getExpiryDate: jest.fn().mockReturnValue('10/15/2024, 12:00:00 PM'),
        getRemainingDays: jest.fn().mockReturnValue(0),
      });

      const { getByText } = render(
        <TestNavigator initialRouteName="LicenseManagement" />
      );

      await waitFor(() => {
        expect(getByText('license.licenseExpired')).toBeTruthy();
      });
    });

    it('should display expiring soon warning for licenses expiring within 30 days', async () => {
      mockUseLicense.mkReturnValue({
        licenseStatus: {
          isLicensed: true,
          expiryDate: '20241115120000',
          challenge: null,
          lastVerified: '2024-10-15T10:00:00.000Z',
        },
        loading: false,
        verifying: false,
        verifyLicense: jest.fn(),
        regenerateChallenge: jest.fn(),
        extendLicense: jest.fn(),
        generateExtensionChallenge: jest.fn(),
        isLicenseValid: jest.fn().mockReturnValue(true),
        getExpiryDate: jest.fn().mockReturnValue('11/15/2024, 12:00:00 PM'),
        getRemainingDays: jest.fn().mockReturnValue(15),
      });

      const { getByText } = render(
        <TestNavigator initialRouteName="LicenseManagement" />
      );

      await waitFor(() => {
        expect(getByText('license.licenseExpiring')).toBeTruthy();
        expect(getByText('license.licenseExpiringSoon')).toBeTruthy();
      });
    });

    it('should show loading state', async () => {
      mockUseLicense.mockReturnValue({
        licenseStatus: null,
        loading: true,
        verifying: false,
        verifyLicense: jest.fn(),
        regenerateChallenge: jest.fn(),
        extendLicense: jest.fn(),
        generateExtensionChallenge: jest.fn(),
        isLicenseValid: jest.fn().mockReturnValue(false),
        getExpiryDate: jest.fn().mockReturnValue(null),
        getRemainingDays: jest.fn().mockReturnValue(0),
      });

      const { getByText } = render(
        <TestNavigator initialRouteName="LicenseManagement" />
      );

      expect(getByText('license.initializingLicense')).toBeTruthy();
    });
  });

  describe('License Extension Flow', () => {
    it('should open extension modal when extend button is pressed', async () => {
      mockUseLicense.mockReturnValue({
        licenseStatus: {
          isLicensed: true,
          expiryDate: '20241215120000',
          challenge: null,
          lastVerified: '2024-10-15T10:00:00.000Z',
        },
        loading: false,
        verifying: false,
        verifyLicense: jest.fn(),
        regenerateChallenge: jest.fn(),
        extendLicense: jest.fn(),
        generateExtensionChallenge: jest.fn(),
        isLicenseValid: jest.fn().mockReturnValue(true),
        getExpiryDate: jest.fn().mockReturnValue('12/15/2024, 12:00:00 PM'),
        getRemainingDays: jest.fn().mockReturnValue(45),
      });

      const { getByText } = render(
        <TestNavigator initialRouteName="LicenseManagement" />
      );

      const extendButton = getByText('license.extendLicense');
      fireEvent.press(extendButton);

      await waitFor(() => {
        expect(getByText('license.licenseExtension')).toBeTruthy();
      });
    });

    it('should generate extension challenge when duration is selected', async () => {
      const mockGenerateExtensionChallenge = jest.fn();

      mockUseLicense.mockReturnValue({
        licenseStatus: {
          isLicensed: true,
          expiryDate: '20241215120000',
          challenge: {
            deviceId: 'TEST_DEVICE',
            expiryDate: '20250315120000',
            random: 'RANDOM123',
            fullChallenge: 'TEST_DEVICE|20250315120000|RANDOM123',
          },
          lastVerified: '2024-10-15T10:00:00.000Z',
        },
        loading: false,
        verifying: false,
        verifyLicense: jest.fn(),
        regenerateChallenge: jest.fn(),
        extendLicense: jest.fn(),
        generateExtensionChallenge: mockGenerateExtensionChallenge,
        isLicenseValid: jest.fn().mockReturnValue(true),
        getExpiryDate: jest.fn().mockReturnValue('12/15/2024, 12:00:00 PM'),
        getRemainingDays: jest.fn().mockReturnValue(45),
      });

      const { getByText } = render(
        <TestNavigator initialRouteName="LicenseManagement" />
      );

      // Open extension modal
      const extendButton = getByText('license.extendLicense');
      fireEvent.press(extendButton);

      await waitFor(() => {
        const generateButton = getByText('license.generateExtensionChallenge');
        fireEvent.press(generateButton);
      });

      expect(mockGenerateExtensionChallenge).toHaveBeenCalledWith(1); // Default trial duration
    });

    it('should handle successful license extension', async () => {
      const mockExtendLicense = jest.fn().mockResolvedValue(true);

      mockUseLicense.mockReturnValue({
        licenseStatus: {
          isLicensed: true,
          expiryDate: '20241215120000',
          challenge: {
            deviceId: 'TEST_DEVICE',
            expiryDate: '20250315120000',
            random: 'RANDOM123',
            fullChallenge: 'TEST_DEVICE|20250315120000|RANDOM123',
          },
          lastVerified: '2024-10-15T10:00:00.000Z',
        },
        loading: false,
        verifying: false,
        verifyLicense: jest.fn(),
        regenerateChallenge: jest.fn(),
        extendLicense: mockExtendLicense,
        generateExtensionChallenge: jest.fn(),
        isLicenseValid: jest.fn().mockReturnValue(true),
        getExpiryDate: jest.fn().mockReturnValue('12/15/2024, 12:00:00 PM'),
        getRemainingDays: jest.fn().mockReturnValue(45),
      });

      const { getByText, getByPlaceholderText } = render(
        <TestNavigator initialRouteName="LicenseManagement" />
      );

      // Open extension modal and generate challenge
      const extendButton = getByText('license.extendLicense');
      fireEvent.press(extendButton);

      await waitFor(() => {
        const generateButton = getByText('license.generateExtensionChallenge');
        fireEvent.press(generateButton);
      });

      // Enter response code
      await waitFor(() => {
        const responseInput = getByPlaceholderText(
          'license.enterResponsePlaceholder'
        );
        fireEvent.changeText(responseInput, 'VALID_RESPONSE_CODE');

        const verifyButton = getByText('license.verifyLicense');
        fireEvent.press(verifyButton);
      });

      expect(mockExtendLicense).toHaveBeenCalledWith(1, 'VALID_RESPONSE_CODE');
    });

    it('should handle failed license extension', async () => {
      const mockExtendLicense = jest.fn().mockResolvedValue(false);

      mockUseLicense.mockReturnValue({
        licenseStatus: {
          isLicensed: true,
          expiryDate: '20241215120000',
          challenge: {
            deviceId: 'TEST_DEVICE',
            expiryDate: '20250315120000',
            random: 'RANDOM123',
            fullChallenge: 'TEST_DEVICE|20250315120000|RANDOM123',
          },
          lastVerified: '2024-10-15T10:00:00.000Z',
        },
        loading: false,
        verifying: false,
        verifyLicense: jest.fn(),
        regenerateChallenge: jest.fn(),
        extendLicense: mockExtendLicense,
        generateExtensionChallenge: jest.fn(),
        isLicenseValid: jest.fn().mockReturnValue(true),
        getExpiryDate: jest.fn().mockReturnValue('12/15/2024, 12:00:00 PM'),
        getRemainingDays: jest.fn().mockReturnValue(45),
      });

      const { getByText, getByPlaceholderText } = render(
        <TestNavigator initialRouteName="LicenseManagement" />
      );

      // Open extension modal and generate challenge
      const extendButton = getByText('license.extendLicense');
      fireEvent.press(extendButton);

      await waitFor(() => {
        const generateButton = getByText('license.generateExtensionChallenge');
        fireEvent.press(generateButton);
      });

      // Enter invalid response code
      await waitFor(() => {
        const responseInput = getByPlaceholderText(
          'license.enterResponsePlaceholder'
        );
        fireEvent.changeText(responseInput, 'INVALID_RESPONSE_CODE');

        const verifyButton = getByText('license.verifyLicense');
        fireEvent.press(verifyButton);
      });

      expect(mockExtendLicense).toHaveBeenCalledWith(
        1,
        'INVALID_RESPONSE_CODE'
      );
    });
  });

  describe('UI State Updates', () => {
    it('should update license information after successful extension', async () => {
      const mockExtendLicense = jest.fn().mockResolvedValue(true);
      let mockGetExpiryDate = jest
        .fn()
        .mockReturnValue('12/15/2024, 12:00:00 PM');
      let mockGetRemainingDays = jest.fn().mockReturnValue(45);

      const { rerender } = render(
        <TestNavigator initialRouteName="LicenseManagement" />
      );

      // Simulate license extension success by updating mock return values
      mockGetExpiryDate = jest.fn().mockReturnValue('3/15/2025, 12:00:00 PM');
      mockGetRemainingDays = jest.fn().mockReturnValue(135);

      mockUseLicense.mockReturnValue({
        licenseStatus: {
          isLicensed: true,
          expiryDate: '20250315120000', // Extended date
          challenge: null,
          lastVerified: '2024-10-15T10:00:00.000Z',
        },
        loading: false,
        verifying: false,
        verifyLicense: jest.fn(),
        regenerateChallenge: jest.fn(),
        extendLicense: mockExtendLicense,
        generateExtensionChallenge: jest.fn(),
        isLicenseValid: jest.fn().mockReturnValue(true),
        getExpiryDate: mockGetExpiryDate,
        getRemainingDays: mockGetRemainingDays,
      });

      rerender(<TestNavigator initialRouteName="LicenseManagement" />);

      await waitFor(() => {
        expect(mockGetExpiryDate).toHaveBeenCalled();
        expect(mockGetRemainingDays).toHaveBeenCalled();
      });
    });
  });
});
