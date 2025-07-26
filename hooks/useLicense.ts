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

  // Generate a 1-day trial challenge for first-time users
  const generateTrialChallenge = (): Challenge => {
    const deviceId = `TRIAL_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 8)}`;
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 5); // 5 minutes validity for testing
    // expiryDate.setDate(expiryDate.getDate() + 1); // 1 day validity

    const expiryString = expiryDate
      .toISOString()
      .split('T')[0]
      .replace(/-/g, '');
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
        // Generate challenge with 1 day validity for testing
        const trialChallenge = generateTrialChallenge();
        await saveChallenge(trialChallenge);

        const trialStatus: LicenseStatus = {
          isLicensed: true, // Set as licensed for 1-day trial
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

  const getExpiryDate = (): string | null => {
    if (!licenseStatus?.expiryDate) return null;

    const year = parseInt(licenseStatus.expiryDate.substring(0, 4));
    const month = parseInt(licenseStatus.expiryDate.substring(4, 6));
    const day = parseInt(licenseStatus.expiryDate.substring(6, 8));

    return new Date(year, month - 1, day).toLocaleDateString();
  };

  return {
    licenseStatus,
    loading,
    verifying,
    verifyLicense,
    regenerateChallenge,
    isLicenseValid,
    getExpiryDate,
  };
};
