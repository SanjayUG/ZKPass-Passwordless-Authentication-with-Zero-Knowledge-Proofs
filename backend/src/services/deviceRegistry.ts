/**
 * Device Registry Service
 * Manages device public keys and authentication challenges with persistent storage
 */

import crypto from 'crypto';
import { DeviceInfo } from '../types/device';
import { 
  registerDeviceOnBlockchain, 
  revokeDeviceOnBlockchain, 
  isDeviceActiveOnBlockchain, 
  getActiveDevicesFromBlockchain 
} from './blockchain';

class DeviceRegistryService {
  // No local storage - using blockchain for persistence
  


  /**
   * Store a device public key for a user on blockchain
   */
  async storeDeviceKey(uid: string, deviceId: string, publicKeyJWK: JsonWebKey, deviceInfo?: Partial<DeviceInfo>): Promise<void> {
    try {
      // Create a hash of the public key for blockchain storage
      const publicKeyHash = this.createPublicKeyHash(publicKeyJWK);
      
      // Store device on blockchain
      await registerDeviceOnBlockchain(uid, deviceId, publicKeyHash);
      
      // Note: We don't store the full DeviceInfo on blockchain for privacy
      // Only the device ID and public key hash are stored
      // Additional metadata like deviceName, userAgent are not stored
    } catch (error) {
      console.error('Failed to store device key on blockchain:', error);
      throw new Error('Failed to register device');
    }
  }

  /**
   * Create a hash of the public key for blockchain storage
   */
  private createPublicKeyHash(publicKeyJWK: JsonWebKey): string {
    // Create a deterministic hash of the public key
    const keyString = JSON.stringify({
      kty: publicKeyJWK.kty,
      crv: publicKeyJWK.crv,
      x: publicKeyJWK.x,
      y: publicKeyJWK.y
    });
    
    return crypto.createHash('sha256').update(keyString).digest('hex');
  }

  /**
   * Check if a device is active (blockchain doesn't store full public keys for privacy)
   * Note: This method is deprecated in blockchain-based storage
   */
  async getDeviceKey(uid: string, deviceId: string): Promise<JsonWebKey | null> {
    // In blockchain storage, we don't store full public keys for privacy
    // ZKP verification works without needing to retrieve the full public key
    // This method is kept for backward compatibility but returns null
    console.warn('getDeviceKey is deprecated with blockchain storage. Use isDeviceRegistered instead.');
    return null;
  }

  /**
   * List all active device IDs for a user from blockchain
   */
  async listUserDevices(uid: string): Promise<DeviceInfo[]> {
    try {
      const deviceIds = await getActiveDevicesFromBlockchain(uid);
      
      // Convert device IDs to minimal DeviceInfo objects
      // Note: Blockchain doesn't store full metadata for privacy
      return deviceIds.map(deviceId => ({
        deviceId,
        uid,
        publicKeyJWK: {} as JsonWebKey, // Not stored on blockchain for privacy
        createdAt: new Date(), // Not available from blockchain
        lastUsed: new Date(), // Not available from blockchain
        deviceName: undefined,
        userAgent: undefined
      }));
    } catch (error) {
      console.error('Failed to list devices from blockchain:', error);
      return [];
    }
  }

  /**
   * Remove a device from the blockchain registry
   */
  async removeDevice(uid: string, deviceId: string): Promise<boolean> {
    try {
      // Check if device exists first
      const exists = await isDeviceActiveOnBlockchain(uid, deviceId);
      if (!exists) {
        return false; // Device not found
      }

      // Revoke device on blockchain
      await revokeDeviceOnBlockchain(uid, deviceId);
      return true;
    } catch (error) {
      console.error('Failed to remove device from blockchain:', error);
      return false;
    }
  }

  /**
   * Check if a user has any registered devices on blockchain
   */
  async hasRegisteredDevices(uid: string): Promise<boolean> {
    try {
      const devices = await getActiveDevicesFromBlockchain(uid);
      return devices.length > 0;
    } catch (error) {
      console.error('Failed to check devices on blockchain:', error);
      return false;
    }
  }

  /**
   * Revoke a device on blockchain
   */
  async revokeDevice(uid: string, deviceId: string): Promise<void> {
    try {
      await revokeDeviceOnBlockchain(uid, deviceId);
    } catch (error) {
      console.error('Failed to revoke device on blockchain:', error);
      throw new Error('Failed to revoke device');
    }
  }

  /**
   * Check if a specific device exists for a user on blockchain
   */
  async isDeviceRegistered(uid: string, deviceId: string): Promise<boolean> {
    try {
      return await isDeviceActiveOnBlockchain(uid, deviceId);
    } catch (error) {
      console.error('Failed to check device on blockchain:', error);
      return false;
    }
  }

  /**
   * Get all device public keys for a user (for ZKP verification)
   * Note: With blockchain storage, we don't store full public keys for privacy
   */
  async getUserDeviceKeys(uid: string): Promise<JsonWebKey[]> {
    // In blockchain-based storage, we don't store full public keys for privacy reasons
    // ZKP verification works by checking device hashes instead
    console.warn('getUserDeviceKeys is deprecated with blockchain storage. ZKP verification uses device hashes.');
    return [];
  }

  /**
   * Get registry statistics (for monitoring)
   * Note: With blockchain storage, detailed stats are not easily available
   */
  getStats(): { totalUsers: number; totalDevices: number } {
    // With blockchain storage, getting comprehensive stats requires scanning the blockchain
    // This is expensive, so we return placeholder values
    console.warn('getStats with blockchain storage requires blockchain scanning - returning placeholder values');
    
    return {
      totalUsers: 0, // Would require blockchain scanning
      totalDevices: 0 // Would require blockchain scanning
    };
  }
}

// Export singleton instance
export const deviceRegistry = new DeviceRegistryService();