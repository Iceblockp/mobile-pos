import { computeHMAC } from './crypto';

// Admin utility functions for generating response codes
// This would typically be used in a separate admin tool/script with configurable expiry

export interface AdminLicenseConfig {
  validityMonths: number;
  description?: string;
}

// Predefined license packages for easy selection
export const LICENSE_PACKAGES: Record<string, AdminLicenseConfig> = {
  trial: { validityMonths: 1, description: '1 Month Trial' },
  quarterly: { validityMonths: 3, description: '3 Months License' },
  semiannual: { validityMonths: 6, description: '6 Months License' },
  annual: { validityMonths: 12, description: '1 Year License' },
  biennial: { validityMonths: 24, description: '2 Years License' },
  lifetime: { validityMonths: 120, description: '10 Years (Lifetime)' }, // 10 years as "lifetime"
};

export const generateResponseCode = async (
  challengeCode: string
): Promise<string> => {
  try {
    const response = await computeHMAC(challengeCode);
    return response;
  } catch (error) {
    console.error('Failed to generate response code:', error);
    throw error;
  }
};
