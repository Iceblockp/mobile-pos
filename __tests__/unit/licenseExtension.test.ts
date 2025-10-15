import { renderHook, act } from '@testing-library/react-native';
import { useLicense } from '@/hooks/useLicense';
import * as crypto from '@/utils/crypto';
import * as storage from '@/utils/storage';

// Mock dependencies
jest.mock('@/utils/crypto');
jest.mock('@/utils/storage');
jest.mock('@/utils/admin', () => ({
  LICENSE_PACKAGES: {
    trial: { validityMonths: 1, description: '1 Month Trial' },
    quarterly: { validityMonths: 3, description: '3 Months License' },
    annual: { validityMonths: 12, description: '1 Year License' },
  },
}));

const mockCrypto = crypto as jest.Mocked<typeof crypto>;
const mockStorage = storage as jest.Mocked<typeof storage>;

describe('License Extension Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extendLicense', () => {
    it('should successfully extend license with valid response code', async () => {
      // Mock existing license status
      const mockLicenseStatus = {
        isLicensed: true,
        expiryDate: '20241215120000', // Dec 15, 2024 12:00:00
        challenge: {
          deviceId: 'TEST_DEVICE',
          expiryDate: '20241215120000',
          random: 'RANDOM123',
          fullChallenge: 'TEST_DEVICE|20241215120000|RANDOM123',
        },
        lastVerified: '2024-10-15T10:00:00.000Z',
      };

      mockStorage.getLicenseStatus.mockResolvedValue(mockLicenseStatus);
      mockStorage.getChallenge.mockResolvedValue(mockLicenseStatus.challenge);
      mockCrypto.verifyResponse.mockResolvedValue(true);
      mockCrypto.parseChallenge.mockReturnValue({
        deviceId: 'TEST_DEVICE',
        expiryDate: '20241215120000',
        random: 'RANDOM123',
      });
      mockCrypto.isLicenseExpired.mockReturnValue(false);

      const { result } = renderHook(() => useLicense());

      // Wait for initialization
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Test license extension
      await act(async () => {
        const success = await result.current.extendLicense(3, 'VALID_RESPONSE');
        expect(success).toBe(true);
      });

      // Verify that saveLicenseStatus was called with extended date
      expect(mockStorage.saveLicenseStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          isLicensed: true,
          expiryDate: expect.stringMatching(/^202503/), // Should be March 2025
        })
      );
    });

    it('should fail to extend license with invalid response code', async () => {
      const mockLicenseStatus = {
        isLicensed: true,
        expiryDate: '20241215120000',
        challenge: {
          deviceId: 'TEST_DEVICE',
          expiryDate: '20241215120000',
          random: 'RANDOM123',
          fullChallenge: 'TEST_DEVICE|20241215120000|RANDOM123',
        },
        lastVerified: '2024-10-15T10:00:00.000Z',
      };

      mockStorage.getLicenseStatus.mockResolvedValue(mockLicenseStatus);
      mockStorage.getChallenge.mockResolvedValue(mockLicenseStatus.challenge);
      mockCrypto.verifyResponse.mockResolvedValue(false);

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await act(async () => {
        const success = await result.current.extendLicense(
          3,
          'INVALID_RESPONSE'
        );
        expect(success).toBe(false);
      });

      // Verify that license status was not updated
      expect(mockStorage.saveLicenseStatus).not.toHaveBeenCalledWith(
        expect.objectContaining({
          expiryDate: expect.stringMatching(/^202503/),
        })
      );
    });

    it('should return false when no license status exists', async () => {
      mockStorage.getLicenseStatus.mockResolvedValue(null);

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await act(async () => {
        const success = await result.current.extendLicense(3, 'RESPONSE');
        expect(success).toBe(false);
      });
    });

    it('should return false when no challenge exists', async () => {
      const mockLicenseStatus = {
        isLicensed: true,
        expiryDate: '20241215120000',
        challenge: null,
        lastVerified: '2024-10-15T10:00:00.000Z',
      };

      mockStorage.getLicenseStatus.mockResolvedValue(mockLicenseStatus);

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await act(async () => {
        const success = await result.current.extendLicense(3, 'RESPONSE');
        expect(success).toBe(false);
      });
    });
  });

  describe('generateExtensionChallenge', () => {
    it('should generate new challenge for extension', async () => {
      const mockLicenseStatus = {
        isLicensed: true,
        expiryDate: '20241215120000',
        challenge: {
          deviceId: 'OLD_DEVICE',
          expiryDate: '20241215120000',
          random: 'OLD_RANDOM',
          fullChallenge: 'OLD_DEVICE|20241215120000|OLD_RANDOM',
        },
        lastVerified: '2024-10-15T10:00:00.000Z',
      };

      const mockNewChallenge = {
        deviceId: 'NEW_DEVICE',
        expiryDate: '20250315120000',
        random: 'NEW_RANDOM',
        fullChallenge: 'NEW_DEVICE|20250315120000|NEW_RANDOM',
      };

      mockStorage.getLicenseStatus.mockResolvedValue(mockLicenseStatus);
      mockCrypto.generateChallenge.mockReturnValue(mockNewChallenge);

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await act(async () => {
        await result.current.generateExtensionChallenge(3);
      });

      expect(mockCrypto.generateChallenge).toHaveBeenCalledWith(3);
      expect(mockStorage.saveChallenge).toHaveBeenCalledWith(mockNewChallenge);
      expect(mockStorage.saveLicenseStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          challenge: mockNewChallenge,
        })
      );
    });
  });

  describe('getRemainingDays', () => {
    it('should calculate remaining days correctly', async () => {
      // Create a date 10 days from now
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const futureDateString = futureDate
        .toISOString()
        .replace(/[-:T]/g, '')
        .substring(0, 14);

      const mockLicenseStatus = {
        isLicensed: true,
        expiryDate: futureDateString,
        challenge: null,
        lastVerified: '2024-10-15T10:00:00.000Z',
      };

      mockStorage.getLicenseStatus.mockResolvedValue(mockLicenseStatus);
      mockStorage.getChallenge.mockResolvedValue(null);

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const remainingDays = result.current.getRemainingDays();
      expect(remainingDays).toBeGreaterThanOrEqual(9);
      expect(remainingDays).toBeLessThanOrEqual(11);
    });

    it('should return 0 for expired license', async () => {
      // Create a date 10 days ago
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const pastDateString = pastDate
        .toISOString()
        .replace(/[-:T]/g, '')
        .substring(0, 14);

      const mockLicenseStatus = {
        isLicensed: true,
        expiryDate: pastDateString,
        challenge: null,
        lastVerified: '2024-10-15T10:00:00.000Z',
      };

      mockStorage.getLicenseStatus.mockResolvedValue(mockLicenseStatus);
      mockStorage.getChallenge.mockResolvedValue(null);

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const remainingDays = result.current.getRemainingDays();
      expect(remainingDays).toBe(0);
    });

    it('should return 0 when no expiry date exists', async () => {
      const mockLicenseStatus = {
        isLicensed: true,
        expiryDate: null,
        challenge: null,
        lastVerified: '2024-10-15T10:00:00.000Z',
      };

      mockStorage.getLicenseStatus.mockResolvedValue(mockLicenseStatus);

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const remainingDays = result.current.getRemainingDays();
      expect(remainingDays).toBe(0);
    });
  });

  describe('Date calculation logic', () => {
    it('should correctly add months to current expiry date', async () => {
      // Test date: December 15, 2024 12:00:00
      const mockLicenseStatus = {
        isLicensed: true,
        expiryDate: '20241215120000',
        challenge: {
          deviceId: 'TEST_DEVICE',
          expiryDate: '20241215120000',
          random: 'RANDOM123',
          fullChallenge: 'TEST_DEVICE|20241215120000|RANDOM123',
        },
        lastVerified: '2024-10-15T10:00:00.000Z',
      };

      mockStorage.getLicenseStatus.mockResolvedValue(mockLicenseStatus);
      mockCrypto.verifyResponse.mockResolvedValue(true);

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Extend by 3 months
      await act(async () => {
        await result.current.extendLicense(3, 'VALID_RESPONSE');
      });

      // Should be March 15, 2025 12:00:00
      expect(mockStorage.saveLicenseStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          expiryDate: expect.stringMatching(/^20250315120000/),
        })
      );
    });

    it('should handle date format without time correctly', async () => {
      const mockLicenseStatus = {
        isLicensed: true,
        expiryDate: '20241215', // Date only format
        challenge: {
          deviceId: 'TEST_DEVICE',
          expiryDate: '20241215',
          random: 'RANDOM123',
          fullChallenge: 'TEST_DEVICE|20241215|RANDOM123',
        },
        lastVerified: '2024-10-15T10:00:00.000Z',
      };

      mockStorage.getLicenseStatus.mockResolvedValue(mockLicenseStatus);
      mockCrypto.verifyResponse.mockResolvedValue(true);

      const { result } = renderHook(() => useLicense());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      await act(async () => {
        await result.current.extendLicense(1, 'VALID_RESPONSE');
      });

      // Should extend by 1 month
      expect(mockStorage.saveLicenseStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          expiryDate: expect.stringMatching(/^202501/), // January 2025
        })
      );
    });
  });
});
