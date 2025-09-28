import { deviceKeyManager } from '../services/deviceKeyManager';
import { DeviceKeyError } from '../types/deviceKey';

/**
 * Utility functions for device key operations
 */

/**
 * Check if the current browser supports the required Web Crypto API features
 */
export function isBrowserSupported(): boolean {
  return !!(
    window.crypto &&
    window.crypto.subtle &&
    window.indexedDB &&
    typeof window.crypto.subtle.generateKey === 'function' &&
    typeof window.crypto.subtle.sign === 'function' &&
    typeof window.crypto.subtle.exportKey === 'function'
  );
}

/**
 * Generate and store a new device key for the given UID
 * Returns the device ID and public key JWK for backend registration
 */
export async function setupDeviceKey(uid: string): Promise<{
  deviceId: string;
  publicKeyJWK: JsonWebKey;
}> {
  if (!isBrowserSupported()) {
    throw new Error(DeviceKeyError.BROWSER_NOT_SUPPORTED);
  }

  try {
    // Generate new device key pair
    const keyPair = await deviceKeyManager.generateDeviceKeyPair();
    
    // Store the private key securely
    const deviceId = await deviceKeyManager.storeDeviceKey(uid, keyPair.privateKey);
    
    return {
      deviceId,
      publicKeyJWK: keyPair.publicKeyJWK
    };
  } catch (error) {
    console.error('Device key setup failed:', error);
    throw error;
  }
}

/**
 * Get device private key for ZKP generation
 * This is the main function used by the ZKP system to get the secret input
 */
export async function getDeviceKeyForZKP(uid: string): Promise<CryptoKey | null> {
  try {
    return await deviceKeyManager.getDeviceKey(uid);
  } catch (error) {
    console.error('Failed to get device key for ZKP:', error);
    return null;
  }
}

/**
 * Check if user has a device key registered on this device
 */
export async function hasRegisteredDevice(uid: string): Promise<boolean> {
  try {
    return await deviceKeyManager.hasDeviceKey(uid);
  } catch (error) {
    console.error('Failed to check device registration:', error);
    return false;
  }
}

/**
 * Remove device key from local storage (for logout or device deregistration)
 */
export async function removeDeviceKey(uid: string): Promise<void> {
  try {
    await deviceKeyManager.removeDeviceKey(uid);
  } catch (error) {
    console.error('Failed to remove device key:', error);
    throw error;
  }
}

/**
 * Generate a signature for authentication challenges
 * This can be used for device-based authentication flows
 */
export async function signAuthChallenge(
  uid: string, 
  challenge: string
): Promise<string> {
  try {
    const privateKey = await deviceKeyManager.getDeviceKey(uid);
    if (!privateKey) {
      throw new Error(DeviceKeyError.KEY_NOT_FOUND);
    }
    
    return await deviceKeyManager.signChallenge(challenge, privateKey);
  } catch (error) {
    console.error('Failed to sign auth challenge:', error);
    throw error;
  }
}

/**
 * Get device information for the current device
 */
export async function getDeviceInfo(uid: string): Promise<{
  deviceId: string | null;
  hasKey: boolean;
}> {
  try {
    const [deviceId, hasKey] = await Promise.all([
      deviceKeyManager.getDeviceId(uid),
      deviceKeyManager.hasDeviceKey(uid)
    ]);
    
    return { deviceId, hasKey };
  } catch (error) {
    console.error('Failed to get device info:', error);
    return { deviceId: null, hasKey: false };
  }
}

/**
 * Convert CryptoKey to a format suitable for ZKP input
 * This function extracts the raw key material for use in ZKP generation
 */
export async function extractKeyForZKP(privateKey: CryptoKey): Promise<Uint8Array> {
  try {
    // Export the private key in raw format for ZKP usage
    const keyData = await window.crypto.subtle.exportKey('pkcs8', privateKey);
    return new Uint8Array(keyData);
  } catch (error) {
    console.error('Failed to extract key for ZKP:', error);
    throw new Error(DeviceKeyError.KEY_NOT_FOUND);
  }
}

/**
 * Validate that a device key is properly formatted and usable
 */
export async function validateDeviceKey(privateKey: CryptoKey): Promise<boolean> {
  try {
    // Test signing capability with a dummy challenge
    const testChallenge = 'test_challenge_' + Date.now();
    await deviceKeyManager.signChallenge(testChallenge, privateKey);
    return true;
  } catch (error) {
    console.error('Device key validation failed:', error);
    return false;
  }
}