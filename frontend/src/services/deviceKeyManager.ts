import { 
  DeviceKeyPair, 
  StoredDeviceKey, 
  DeviceKeyError, 
  IDeviceKeyManager 
} from '../types/deviceKey';

/**
 * DeviceKeyManager handles device key generation, storage, and cryptographic operations
 * using Web Crypto API and IndexedDB for secure local storage
 */
export class DeviceKeyManager implements IDeviceKeyManager {
  private static readonly DB_NAME = 'ZKPassDeviceKeys';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'deviceKeys';
  private static readonly KEY_ALGORITHM = 'ECDSA';
  private static readonly NAMED_CURVE = 'P-256';
  private static readonly HASH_ALGORITHM = 'SHA-256';

  private db: IDBDatabase | null = null;

  /**
   * Initialize the IndexedDB database
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (!window.indexedDB) {
      throw new Error(DeviceKeyError.INDEXEDDB_NOT_AVAILABLE);
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DeviceKeyManager.DB_NAME, DeviceKeyManager.DB_VERSION);

      request.onerror = () => {
        reject(new Error(DeviceKeyError.KEY_STORAGE_FAILED));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store for device keys
        if (!db.objectStoreNames.contains(DeviceKeyManager.STORE_NAME)) {
          const store = db.createObjectStore(DeviceKeyManager.STORE_NAME, { 
            keyPath: 'uid' 
          });
          store.createIndex('deviceId', 'deviceId', { unique: false });
        }
      };
    });
  }

  /**
   * Generate a new ECDSA P-256 device key pair
   */
  async generateDeviceKeyPair(): Promise<DeviceKeyPair> {
    try {
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error(DeviceKeyError.BROWSER_NOT_SUPPORTED);
      }

      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: DeviceKeyManager.KEY_ALGORITHM,
          namedCurve: DeviceKeyManager.NAMED_CURVE,
        },
        true, // extractable
        ['sign', 'verify']
      );

      // Export public key to JWK format for backend storage
      const publicKeyJWK = await window.crypto.subtle.exportKey(
        'jwk',
        keyPair.publicKey
      );

      return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        publicKeyJWK
      };
    } catch (error) {
      console.error('Device key generation failed:', error);
      throw new Error(DeviceKeyError.KEY_GENERATION_FAILED);
    }
  }

  /**
   * Store device private key securely in IndexedDB
   */
  async storeDeviceKey(uid: string, privateKey: CryptoKey): Promise<string> {
    try {
      const db = await this.initDB();
      const deviceId = this.generateDeviceId();
      
      const storedKey: StoredDeviceKey = {
        deviceId,
        uid,
        privateKey,
        createdAt: new Date(),
        lastUsed: new Date()
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([DeviceKeyManager.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(DeviceKeyManager.STORE_NAME);
        
        const request = store.put(storedKey);
        
        request.onsuccess = () => {
          resolve(deviceId);
        };
        
        request.onerror = () => {
          reject(new Error(DeviceKeyError.KEY_STORAGE_FAILED));
        };
      });
    } catch (error) {
      console.error('Device key storage failed:', error);
      throw new Error(DeviceKeyError.KEY_STORAGE_FAILED);
    }
  }

  /**
   * Retrieve device private key from IndexedDB
   */
  async getDeviceKey(uid: string): Promise<CryptoKey | null> {
    try {
      const db = await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([DeviceKeyManager.STORE_NAME], 'readonly');
        const store = transaction.objectStore(DeviceKeyManager.STORE_NAME);
        
        const request = store.get(uid);
        
        request.onsuccess = () => {
          const result = request.result as StoredDeviceKey | undefined;
          if (result) {
            // Update last used timestamp
            this.updateLastUsed(uid).catch(console.error);
            resolve(result.privateKey);
          } else {
            resolve(null);
          }
        };
        
        request.onerror = () => {
          reject(new Error(DeviceKeyError.KEY_NOT_FOUND));
        };
      });
    } catch (error) {
      console.error('Device key retrieval failed:', error);
      return null;
    }
  }

  /**
   * Check if device key exists for the given UID
   */
  async hasDeviceKey(uid: string): Promise<boolean> {
    try {
      const key = await this.getDeviceKey(uid);
      return key !== null;
    } catch (error) {
      console.error('Device key check failed:', error);
      return false;
    }
  }

  /**
   * Remove device key from IndexedDB
   */
  async removeDeviceKey(uid: string): Promise<void> {
    try {
      const db = await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([DeviceKeyManager.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(DeviceKeyManager.STORE_NAME);
        
        const request = store.delete(uid);
        
        request.onsuccess = () => {
          resolve();
        };
        
        request.onerror = () => {
          reject(new Error(DeviceKeyError.KEY_STORAGE_FAILED));
        };
      });
    } catch (error) {
      console.error('Device key removal failed:', error);
      throw new Error(DeviceKeyError.KEY_STORAGE_FAILED);
    }
  }

  /**
   * Sign a challenge using the device private key
   * This is used for ZKP generation where the device key serves as the secret input
   */
  async signChallenge(challenge: string, privateKey: CryptoKey): Promise<string> {
    try {
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error(DeviceKeyError.BROWSER_NOT_SUPPORTED);
      }

      // Convert challenge string to ArrayBuffer
      const encoder = new TextEncoder();
      const challengeBuffer = encoder.encode(challenge);

      // Sign the challenge
      const signature = await window.crypto.subtle.sign(
        {
          name: DeviceKeyManager.KEY_ALGORITHM,
          hash: DeviceKeyManager.HASH_ALGORITHM,
        },
        privateKey,
        challengeBuffer
      );

      // Convert signature to base64 string
      const signatureArray = new Uint8Array(signature);
      const binaryString = Array.from(signatureArray, byte => String.fromCharCode(byte)).join('');
      return btoa(binaryString);
    } catch (error) {
      console.error('Challenge signing failed:', error);
      throw new Error(DeviceKeyError.SIGNATURE_FAILED);
    }
  }

  /**
   * Get device ID for the given UID
   */
  async getDeviceId(uid: string): Promise<string | null> {
    try {
      const db = await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([DeviceKeyManager.STORE_NAME], 'readonly');
        const store = transaction.objectStore(DeviceKeyManager.STORE_NAME);
        
        const request = store.get(uid);
        
        request.onsuccess = () => {
          const result = request.result as StoredDeviceKey | undefined;
          resolve(result ? result.deviceId : null);
        };
        
        request.onerror = () => {
          reject(new Error(DeviceKeyError.KEY_NOT_FOUND));
        };
      });
    } catch (error) {
      console.error('Device ID retrieval failed:', error);
      return null;
    }
  }

  /**
   * Update the last used timestamp for a device key
   */
  private async updateLastUsed(uid: string): Promise<void> {
    try {
      const db = await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([DeviceKeyManager.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(DeviceKeyManager.STORE_NAME);
        
        const getRequest = store.get(uid);
        
        getRequest.onsuccess = () => {
          const result = getRequest.result as StoredDeviceKey | undefined;
          if (result) {
            result.lastUsed = new Date();
            const putRequest = store.put(result);
            
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(new Error(DeviceKeyError.KEY_STORAGE_FAILED));
          } else {
            resolve();
          }
        };
        
        getRequest.onerror = () => {
          reject(new Error(DeviceKeyError.KEY_NOT_FOUND));
        };
      });
    } catch (error) {
      console.error('Last used update failed:', error);
    }
  }

  /**
   * Generate a unique device identifier
   */
  private generateDeviceId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2);
    return `device_${timestamp}_${randomPart}`;
  }

  /**
   * Update device ID for an existing stored key
   */
  async updateDeviceId(uid: string, newDeviceId: string): Promise<void> {
    try {
      const db = await this.initDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([DeviceKeyManager.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(DeviceKeyManager.STORE_NAME);
        
        // Get the existing key
        const getRequest = store.get(uid);
        
        getRequest.onsuccess = () => {
          const existingKey = getRequest.result;
          if (existingKey) {
            // Update the device ID
            existingKey.deviceId = newDeviceId;
            
            // Store the updated key
            const putRequest = store.put(existingKey);
            
            putRequest.onsuccess = () => {
              console.log('Device ID updated successfully:', newDeviceId);
              resolve();
            };
            
            putRequest.onerror = () => {
              reject(new Error('Failed to update device ID'));
            };
          } else {
            reject(new Error('Device key not found for UID'));
          }
        };
        
        getRequest.onerror = () => {
          reject(new Error('Failed to retrieve device key'));
        };
      });
    } catch (error) {
      console.error('Device ID update failed:', error);
      throw new Error(DeviceKeyError.KEY_STORAGE_FAILED);
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const deviceKeyManager = new DeviceKeyManager();