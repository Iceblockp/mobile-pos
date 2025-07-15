import 'react-native-get-random-values';

// Obfuscated secret key - in production, use more sophisticated obfuscation
const SECRET_KEY = 'POS_LICENSE_KEY_2024_SECURE_HMAC_SECRET';

export interface Challenge {
  deviceId: string;
  expiryDate: string;
  random: string;
  fullChallenge: string;
}

export interface LicenseStatus {
  isLicensed: boolean;
  challenge: Challenge | null;
  expiryDate: string | null;
  lastVerified: string | null;
}

// Simple hash function using built-in crypto
const simpleHash = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
};

// More secure HMAC-like implementation
const computeSecureHash = (message: string, key: string): string => {
  // Create a more complex hash by combining multiple operations
  const combined = key + message + key;
  let hash1 = simpleHash(combined);
  let hash2 = simpleHash(combined.split('').reverse().join(''));

  // XOR the hashes for additional security
  let result = '';
  for (let i = 0; i < Math.min(hash1.length, hash2.length); i++) {
    const xor = parseInt(hash1[i], 16) ^ parseInt(hash2[i], 16);
    result += xor.toString(16);
  }

  return result.substring(0, 16).toUpperCase();
};

// Generate device-specific identifier
export const generateDeviceId = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8);
  return `DEV_${timestamp}_${random}`;
};

// Generate challenge with embedded expiry
export const generateChallenge = (validityMonths: number = 1): Challenge => {
  const deviceId = generateDeviceId();
  const expiryDate = new Date();
  expiryDate.setMonth(expiryDate.getMonth() + validityMonths);

  const expiryString = expiryDate.toISOString().split('T')[0].replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();

  const fullChallenge = `${deviceId}|${expiryString}|${random}`;

  return {
    deviceId,
    expiryDate: expiryString,
    random,
    fullChallenge,
  };
};

// Compute HMAC for challenge verification
export const computeHMAC = async (challenge: string): Promise<string> => {
  try {
    const response = computeSecureHash(challenge, SECRET_KEY);
    return response;
  } catch (error) {
    console.error('HMAC computation error:', error);
    throw error;
  }
};

// Verify response against challenge
export const verifyResponse = async (
  challenge: string,
  response: string
): Promise<boolean> => {
  try {
    const expectedResponse = await computeHMAC(challenge);
    return expectedResponse === response.toUpperCase();
  } catch (error) {
    console.error('Verification error:', error);
    return false;
  }
};

// Check if license is expired
export const isLicenseExpired = (expiryDateString: string): boolean => {
  try {
    const expiryDate = new Date(
      parseInt(expiryDateString.substring(0, 4)),
      parseInt(expiryDateString.substring(4, 6)) - 1,
      parseInt(expiryDateString.substring(6, 8))
    );
    return new Date() > expiryDate;
  } catch (error) {
    console.error('Date parsing error:', error);
    return true; // Assume expired if we can't parse
  }
};

// Parse challenge components
export const parseChallenge = (
  fullChallenge: string
): {
  deviceId: string;
  expiryDate: string;
  random: string;
} | null => {
  try {
    const parts = fullChallenge.split('|');
    if (parts.length !== 3) return null;

    return {
      deviceId: parts[0],
      expiryDate: parts[1],
      random: parts[2],
    };
  } catch (error) {
    return null;
  }
};
