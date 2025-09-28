/**
 * Device Registry Service
 * Manages device public keys and authentication challenges in memory
 */

import crypto from 'crypto';
import { DeviceInfo } from '../types/device';

class DeviceRegistryService {
  // In-memory storage for device public keys
  private devices: Map<string, DeviceInfo[]> = new Map(); // uid -> DeviceInfo[]
  


  /**
   * Store a device public key for a user
   */
  async storeDeviceKey(uid: string, deviceId: string, publicKeyJWK: JsonWebKey, deviceInfo?: Partial<DeviceInfo>): Promise<void> {
    const device: DeviceInfo = {
      deviceId,
      uid,
      publicKeyJWK,
      createdAt: new Date(),
      lastUsed: new Date(),
      deviceName: deviceInfo?.deviceName,
      userAgent: deviceInfo?.userAgent
    };

    if (!this.devices.has(uid)) {
      this.devices.set(uid, []);
    }

    const userDevices = this.devices.get(uid)!;
    
    // Remove existing device with same deviceId if it exists
    const existingIndex = userDevices.findIndex(d => d.deviceId === deviceId);
    if (existingIndex !== -1) {
      userDevices.splice(existingIndex, 1);
    }

    userDevices.push(device);
  }

  /**
   * Get a device public key for verification
   */
  async getDeviceKey(uid: string, deviceId: string): Promise<JsonWebKey | null> {
    const userDevices = this.devices.get(uid);
    if (!userDevices) {
      return null;
    }

    const device = userDevices.find(d => d.deviceId === deviceId);
    if (!device) {
      return null;
    }

    // Update last used timestamp
    device.lastUsed = new Date();
    
    return device.publicKeyJWK;
  }

  /**
   * List all devices for a user
   */
  async listUserDevices(uid: string): Promise<DeviceInfo[]> {
    return this.devices.get(uid) || [];
  }

  /**
   * Remove a device from the registry
   */
  async removeDevice(uid: string, deviceId: string): Promise<boolean> {
    const userDevices = this.devices.get(uid);
    if (!userDevices) {
      return false;
    }

    const initialLength = userDevices.length;
    const filteredDevices = userDevices.filter(d => d.deviceId !== deviceId);
    
    if (filteredDevices.length === initialLength) {
      return false; // Device not found
    }

    this.devices.set(uid, filteredDevices);
    return true;
  }

  /**
   * Check if a user has any registered devices
   */
  async hasRegisteredDevices(uid: string): Promise<boolean> {
    const userDevices = this.devices.get(uid);
    return userDevices ? userDevices.length > 0 : false;
  }

  /**
   * Get all device public keys for a user (for ZKP verification)
   */
  async getUserDeviceKeys(uid: string): Promise<JsonWebKey[]> {
    const userDevices = this.devices.get(uid);
    if (!userDevices) {
      return [];
    }

    return userDevices.map(device => device.publicKeyJWK);
  }

  /**
   * Get registry statistics (for monitoring)
   */
  getStats(): { totalUsers: number; totalDevices: number } {
    let totalDevices = 0;
    for (const devices of this.devices.values()) {
      totalDevices += devices.length;
    }

    return {
      totalUsers: this.devices.size,
      totalDevices
    };
  }
}

// Export singleton instance
export const deviceRegistry = new DeviceRegistryService();