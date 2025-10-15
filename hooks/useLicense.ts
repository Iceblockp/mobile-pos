import { useState, useEffect } from 'react';
import {
  Challenge,
  LicenseStatus,
  generateChallenge,
  verifyResponse,
  isLicenseExpired,
  parseChallenge,
} from '@/utils/crypto';
import {
  saveChallenge,
  getChallenge,
  saveLicenseStatus,
  getLicenseStatus,
} from '@/utils/storage';
import { LICENSE_PACKAGES } from '@/utils/admin';

export const useLicense = () => {
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    initializeLicense();
  }, []);

  // Generate a 7-day trial challenge for first-time users
  const generateTrialChallenge = (): Challenge => {
    const deviceId = `TRIAL_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}`;
    const expiryDate = new Date();
    // expiryDate.setMinutes(expiryDate.getMinutes() + 5); // 5 minutes validity for testing
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 day validity

    // For testing with minutes, we need to include time information
    const expiryString = expiryDate
      .toISOString()
      .replace(/[-:T]/g, '')
      .substring(0, 14); // YYYYMMDDHHMMSS format
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();

    const fullChallenge = `${deviceId}|${expiryString}|${random}`;

    return {
      deviceId,
      expiryDate: expiryString,
      random,
      fullChallenge,
    };
  };

  const initializeLicense = async () => {
    try {
      setLoading(true);

      // Check existing license status
      const existingStatus = await getLicenseStatus();
      const existingChallenge = await getChallenge();

      if (existingStatus && existingChallenge) {
        // Check if license is expired
        const challengeComponents = parseChallenge(
          existingChallenge.fullChallenge
        );
        if (
          challengeComponents &&
          !isLicenseExpired(challengeComponents.expiryDate)
        ) {
          setLicenseStatus(existingStatus);
          setLoading(false);
          return;
        }
      }

      // First time app start - no existing status
      if (!existingStatus) {
        // Generate challenge with 7 day validity for testing
        const trialChallenge = generateTrialChallenge();
        await saveChallenge(trialChallenge);

        const trialStatus: LicenseStatus = {
          isLicensed: true, // Set as licensed for 7-day trial
          challenge: trialChallenge,
          expiryDate: trialChallenge.expiryDate,
          lastVerified: new Date().toISOString(),
        };

        await saveLicenseStatus(trialStatus);
        setLicenseStatus(trialStatus);
        return;
      }

      // Generate new challenge if no valid license exists
      const newChallenge = generateChallenge(
        LICENSE_PACKAGES.trial.validityMonths
      ); // Default trial validity
      await saveChallenge(newChallenge);

      const newStatus: LicenseStatus = {
        isLicensed: false,
        challenge: newChallenge,
        expiryDate: null,
        lastVerified: null,
      };

      await saveLicenseStatus(newStatus);
      setLicenseStatus(newStatus);
    } catch (error) {
      console.error('Failed to initialize license:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyLicense = async (responseCode: string): Promise<boolean> => {
    if (!licenseStatus?.challenge) return false;

    try {
      setVerifying(true);

      const isValid = await verifyResponse(
        licenseStatus.challenge.fullChallenge,
        responseCode
      );

      if (isValid) {
        const challengeComponents = parseChallenge(
          licenseStatus.challenge.fullChallenge
        );
        if (
          challengeComponents &&
          !isLicenseExpired(challengeComponents.expiryDate)
        ) {
          const updatedStatus: LicenseStatus = {
            ...licenseStatus,
            isLicensed: true,
            expiryDate: challengeComponents.expiryDate,
            lastVerified: new Date().toISOString(),
          };

          await saveLicenseStatus(updatedStatus);
          setLicenseStatus(updatedStatus);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('License verification failed:', error);
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const regenerateChallenge = async (validityMonths?: number) => {
    try {
      setLoading(true);

      const months = validityMonths || LICENSE_PACKAGES.trial.validityMonths;
      const newChallenge = generateChallenge(months);
      await saveChallenge(newChallenge);

      const newStatus: LicenseStatus = {
        isLicensed: false,
        challenge: newChallenge,
        expiryDate: null,
        lastVerified: null,
      };

      await saveLicenseStatus(newStatus);
      setLicenseStatus(newStatus);
    } catch (error) {
      console.error('Failed to regenerate challenge:', error);
    } finally {
      setLoading(false);
    }
  };

  const isLicenseValid = (): boolean => {
    if (!licenseStatus?.isLicensed || !licenseStatus.expiryDate) return false;
    return !isLicenseExpired(licenseStatus.expiryDate);
  };

  const extendLicense = async (
    validityMonths: number,
    responseCode: string
  ): Promise<boolean> => {
    if (!licenseStatus?.challenge || !licenseStatus.expiryDate) return false;

    try {
      setVerifying(true);

      const isValid = await verifyResponse(
        licenseStatus.challenge.fullChallenge,
        responseCode
      );

      if (isValid) {
        // Parse current expiry date
        const currentExpiryString = licenseStatus.expiryDate;
        const year = parseInt(currentExpiryString.substring(0, 4));
        const month = parseInt(currentExpiryString.substring(4, 6));
        const day = parseInt(currentExpiryString.substring(6, 8));

        let currentExpiry: Date;
        if (currentExpiryString.length === 14) {
          // Include time for detailed format
          const hour = parseInt(currentExpiryString.substring(8, 10));
          const minute = parseInt(currentExpiryString.substring(10, 12));
          const second = parseInt(currentExpiryString.substring(12, 14));
          currentExpiry = new Date(year, month - 1, day, hour, minute, second);
        } else {
          currentExpiry = new Date(year, month - 1, day);
        }

        // Calculate new expiry date by adding extension months
        const newExpiry = new Date(currentExpiry);
        newExpiry.setMonth(newExpiry.getMonth() + validityMonths);

        // Format new expiry date
        const newExpiryString = newExpiry
          .toISOString()
          .replace(/[-:T]/g, '')
          .substring(0, 14); // YYYYMMDDHHMMSS format

        const updatedStatus: LicenseStatus = {
          ...licenseStatus,
          isLicensed: true,
          expiryDate: newExpiryString,
          lastVerified: new Date().toISOString(),
        };

        await saveLicenseStatus(updatedStatus);
        setLicenseStatus(updatedStatus);
        return true;
      }

      return false;
    } catch (error) {
      console.error('License extension failed:', error);
      return false;
    } finally {
      setVerifying(false);
    }
  };

  const generateExtensionChallenge = async (validityMonths: number) => {
    try {
      setLoading(true);

      const newChallenge = generateChallenge(validityMonths);
      await saveChallenge(newChallenge);

      if (licenseStatus) {
        const updatedStatus: LicenseStatus = {
          ...licenseStatus,
          challenge: newChallenge,
        };

        await saveLicenseStatus(updatedStatus);
        setLicenseStatus(updatedStatus);
      }
    } catch (error) {
      console.error('Failed to generate extension challenge:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRemainingDays = (): number => {
    if (!licenseStatus?.expiryDate) return 0;

    const dateString = licenseStatus.expiryDate;
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6));
    const day = parseInt(dateString.substring(6, 8));

    let expiryDate: Date;
    if (dateString.length === 14) {
      const hour = parseInt(dateString.substring(8, 10));
      const minute = parseInt(dateString.substring(10, 12));
      const second = parseInt(dateString.substring(12, 14));
      expiryDate = new Date(year, month - 1, day, hour, minute, second);
    } else {
      expiryDate = new Date(year, month - 1, day);
    }

    const currentDate = new Date();
    const timeDifference = expiryDate.getTime() - currentDate.getTime();
    const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));

    return Math.max(0, daysDifference);
  };

  const getExpiryDate = (): string | null => {
    if (!licenseStatus?.expiryDate) return null;

    const dateString = licenseStatus.expiryDate;
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6));
    const day = parseInt(dateString.substring(6, 8));

    if (dateString.length === 14) {
      // Include time for detailed format
      const hour = parseInt(dateString.substring(8, 10));
      const minute = parseInt(dateString.substring(10, 12));
      const second = parseInt(dateString.substring(12, 14));

      return new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second
      ).toLocaleString();
    }

    return new Date(year, month - 1, day).toLocaleDateString();
  };

  return {
    licenseStatus,
    loading,
    verifying,
    verifyLicense,
    regenerateChallenge,
    extendLicense,
    generateExtensionChallenge,
    isLicenseValid,
    getExpiryDate,
    getRemainingDays,
  };
};
