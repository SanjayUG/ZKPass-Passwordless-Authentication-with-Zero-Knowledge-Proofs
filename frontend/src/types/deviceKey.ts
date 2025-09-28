/**
 * Types for device key authentication
 */

/**
 * Device key pair interface
 */
export interface DeviceKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  publicKeyJWK: JsonWebKey;
}

/**
 * Device information interface
 */
export interface DeviceInfo {
  deviceId: string;
  uid: string;
  publicKeyJWK: JsonWebKey;
  createdAt: Date;
  lastUsed: Date;
  deviceName?: string;
  userAgent?: string;
}

/**
 * Device key storage interface for IndexedDB
 */
export interface StoredDeviceKey {
  deviceId: string;
  uid: string;
  privateKey: CryptoKey;
  createdAt: Date;
  lastUsed: Date;
}

/**
 * Device key error types
 */
export enum DeviceKeyError {
  KEY_GENERATION_FAILED = 'DEVICE_KEY_GENERATION_FAILED',
  KEY_STORAGE_FAILED = 'DEVICE_KEY_STORAGE_FAILED',
  KEY_NOT_FOUND = 'DEVICE_KEY_NOT_FOUND',
  SIGNATURE_FAILED = 'SIGNATURE_GENERATION_FAILED',
  BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
  INDEXEDDB_NOT_AVAILABLE = 'INDEXEDDB_NOT_AVAILABLE'
}

/**
 * Device key manager interface
 */
export interface IDeviceKeyManager {
  generateDeviceKeyPair(): Promise<DeviceKeyPair>;
  storeDeviceKey(uid: string, privateKey: CryptoKey): Promise<string>;
  getDeviceKey(uid: string): Promise<CryptoKey | null>;
  hasDeviceKey(uid: string): Promise<boolean>;
  removeDeviceKey(uid: string): Promise<void>;
  signChallenge(challenge: string, privateKey: CryptoKey): Promise<string>;
  getDeviceId(uid: string): Promise<string | null>;
}