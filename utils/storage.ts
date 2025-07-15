import AsyncStorage from '@react-native-async-storage/async-storage';
import { Challenge, LicenseStatus } from './crypto';

const STORAGE_KEYS = {
  CHALLENGE: 'license_challenge',
  LICENSE_STATUS: 'license_status',
};

export const saveChallenge = async (challenge: Challenge): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.CHALLENGE,
      JSON.stringify(challenge)
    );
  } catch (error) {
    console.error('Failed to save challenge:', error);
  }
};

export const getChallenge = async (): Promise<Challenge | null> => {
  try {
    const challengeStr = await AsyncStorage.getItem(STORAGE_KEYS.CHALLENGE);
    return challengeStr ? JSON.parse(challengeStr) : null;
  } catch (error) {
    console.error('Failed to get challenge:', error);
    return null;
  }
};

export const saveLicenseStatus = async (
  status: LicenseStatus
): Promise<void> => {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.LICENSE_STATUS,
      JSON.stringify(status)
    );
  } catch (error) {
    console.error('Failed to save license status:', error);
  }
};

export const getLicenseStatus = async (): Promise<LicenseStatus | null> => {
  try {
    const statusStr = await AsyncStorage.getItem(STORAGE_KEYS.LICENSE_STATUS);
    console.log('getLicenseStatus - raw data:', statusStr);
    return statusStr ? JSON.parse(statusStr) : null;
  } catch (error) {
    console.error('Failed to get license status:', error);
    return null;
  }
};

export const clearLicenseData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.CHALLENGE,
      STORAGE_KEYS.LICENSE_STATUS,
    ]);
  } catch (error) {
    console.error('Failed to clear license data:', error);
  }
};
