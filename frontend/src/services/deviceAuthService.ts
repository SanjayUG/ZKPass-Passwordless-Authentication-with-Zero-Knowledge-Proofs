/**
 * DeviceAuthService handles API communication for device-based authentication
 * Implements ZKP submission, device authorization, and device management operations
 */

import { deviceKeyManager } from './deviceKeyManager';
import { DeviceInfo } from '../types';
import { securityNotificationService } from './SecurityNotificationService';

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Device ZKP login request interface
 */
interface DeviceZKPLoginRequest {
  uid: string;
  zkpProof: string;
  deviceId?: string;
}

/**
 * Device authorization request interface
 */
interface DeviceAuthorizationRequest {
  uid: string;
  recoveryPhrase: string;
  publicKeyJWK: JsonWebKey;
  deviceInfo?: Partial<DeviceInfo>;
}

/**
 * Authentication result interface
 */
interface AuthResult {
  success: boolean;
  message: string;
  uid?: string;
  deviceId?: string;
}

/**
 * Device registration request interface
 */
interface DeviceRegistrationRequest {
  uid: string;
  publicKeyJWK: JsonWebKey;
  deviceInfo?: Partial<DeviceInfo>;
}

/**
 * Device list response interface
 */
interface DeviceListResponse {
  success: boolean;
  devices: Array<{
    deviceId: string;
    createdAt: string;
    lastUsed: string;
    deviceName?: string;
    userAgent?: string;
  }>;
}

/**
 * DeviceAuthService class implementing device-based authentication API communication
 */
export class DeviceAuthService {
  /**
   * Login with device key using ZKP authentication
   * Requirements: 2.1, 2.4
   */
  async loginWithDeviceKey(uid: string, zkpProof: string): Promise<AuthResult> {
    try {
      // Get device ID for the current device
      const deviceId = await deviceKeyManager.getDeviceId(uid);
      
      const request: DeviceZKPLoginRequest = {
        uid,
        zkpProof,
        deviceId: deviceId || undefined
      };

      const response = await fetch(`${API_BASE_URL}/device-auth/verify-zkp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data: AuthResult & { errorCode?: string; requiresRecovery?: boolean } = await response.json();

      if (!response.ok) {
        // Handle specific error cases with appropriate notifications
        if (response.status === 423) {
          // Account locked
          securityNotificationService.notifyAccountLocked(data.message || 'Account locked');
        } else if (response.status === 429) {
          // Rate limited
          securityNotificationService.notifyRateLimited();
        } else if (data.errorCode === 'DEVICE_NOT_AUTHORIZED' && data.requiresRecovery) {
          // Device was revoked - throw specific error to trigger recovery flow
          const error = new Error(data.message || 'Device not authorized') as Error & { requiresRecovery: boolean; errorCode: string };
          error.requiresRecovery = true;
          error.errorCode = 'DEVICE_NOT_AUTHORIZED';
          throw error;
        } else if (data.errorCode === 'NO_DEVICES_REGISTERED') {
          // No devices registered - throw specific error
          const error = new Error(data.message || 'No devices registered') as Error & { errorCode: string };
          error.errorCode = 'NO_DEVICES_REGISTERED';
          throw error;
        } else {
          // General authentication failure
          securityNotificationService.notifyAuthenticationFailure(data.message || 'Device authentication failed');
        }
        throw new Error(data.message || 'Device authentication failed');
      }

      // Successful authentication
      securityNotificationService.notifySecurityEvent('ZKP_VERIFICATION', true, { deviceId });

      return data;
    } catch (error) {
      console.error('Device ZKP login failed:', error);
      
      // Preserve special error properties for device revocation handling
      const originalError = error as Error & { requiresRecovery?: boolean; errorCode?: string };
      if (originalError.requiresRecovery || originalError.errorCode) {
        // Re-throw the original error with its special properties intact
        throw error;
      }
      
      // For other errors, throw a generic error
      throw new Error(error instanceof Error ? error.message : 'Device authentication failed');
    }
  }

  /**
   * Register a new device with its public key
   * Used during initial registration or when adding a new device
   */
  async registerDevice(uid: string, publicKeyJWK: JsonWebKey, deviceInfo?: Partial<DeviceInfo>): Promise<AuthResult> {
    try {
      const request: DeviceRegistrationRequest = {
        uid,
        publicKeyJWK,
        deviceInfo: {
          ...deviceInfo,
          userAgent: navigator.userAgent,
        }
      };

      const response = await fetch(`${API_BASE_URL}/device-auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data: AuthResult = await response.json();

      if (!response.ok) {
        securityNotificationService.notifySecurityEvent('DEVICE_REGISTRATION', false, { error: data.message });
        throw new Error(data.message || 'Device registration failed');
      }

      // Successful device registration
      securityNotificationService.notifySecurityEvent('DEVICE_REGISTRATION', true, { deviceId: data.deviceId });

      return data;
    } catch (error) {
      console.error('Device registration failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Device registration failed');
    }
  }

  /**
   * Authorize a new device using recovery phrase
   * Requirements: 3.1, 3.5
   */
  async authorizeNewDevice(uid: string, recoveryPhrase: string): Promise<AuthResult> {
    try {
      // Generate new device key pair for this device
      const deviceKeyPair = await deviceKeyManager.generateDeviceKeyPair();
      
      // Store the device private key locally
      const deviceId = await deviceKeyManager.storeDeviceKey(uid, deviceKeyPair.privateKey);

      const request: DeviceAuthorizationRequest = {
        uid,
        recoveryPhrase,
        publicKeyJWK: deviceKeyPair.publicKeyJWK,
        deviceInfo: {
          deviceName: this.getDeviceName(),
          userAgent: navigator.userAgent,
        }
      };

      const response = await fetch(`${API_BASE_URL}/device-auth/authorize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const data: AuthResult = await response.json();

      if (!response.ok) {
        // If authorization failed, clean up the stored device key
        await deviceKeyManager.removeDeviceKey(uid);
        
        // Handle specific error cases
        if (response.status === 423) {
          securityNotificationService.notifyAccountLocked(data.message || 'Account locked');
        } else if (response.status === 429) {
          securityNotificationService.notifyRateLimited();
        } else {
          securityNotificationService.notifySecurityEvent('DEVICE_AUTHORIZATION', false, { error: data.message });
        }
        
        throw new Error(data.message || 'Device authorization failed');
      }

      // Successful device authorization - this triggers a security notification
      securityNotificationService.notifyDeviceAuthorization(deviceId, true);

      return {
        ...data,
        deviceId
      };
    } catch (error) {
      console.error('Device authorization failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Device authorization failed');
    }
  }

  /**
   * List all authorized devices for a user
   * Requirements: 4.2
   */
  async listAuthorizedDevices(uid: string): Promise<DeviceInfo[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/device-auth/devices/${encodeURIComponent(uid)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: DeviceListResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.devices ? 'Failed to list devices' : 'Failed to list devices');
      }

      // Convert the response to DeviceInfo format
      return data.devices.map(device => ({
        deviceId: device.deviceId,
        uid,
        publicKeyJWK: {} as JsonWebKey, // Not returned by API for security
        createdAt: new Date(device.createdAt),
        lastUsed: new Date(device.lastUsed),
        deviceName: device.deviceName,
        userAgent: device.userAgent,
      }));
    } catch (error) {
      console.error('Failed to list devices:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to list devices');
    }
  }

  /**
   * Revoke a specific device
   * Requirements: 4.2
   */
  async revokeDevice(uid: string, deviceId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/device-auth/devices/${encodeURIComponent(uid)}/${encodeURIComponent(deviceId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        securityNotificationService.notifySecurityEvent('DEVICE_REVOCATION', false, { deviceId, error: data.message });
        throw new Error(data.message || 'Device revocation failed');
      }

      // Successful device revocation
      securityNotificationService.notifyDeviceRevoked(deviceId);

      // If this is the current device being revoked, remove the local key
      const currentDeviceId = await deviceKeyManager.getDeviceId(uid);
      if (currentDeviceId === deviceId) {
        await deviceKeyManager.removeDeviceKey(uid);
      }
    } catch (error) {
      console.error('Device revocation failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Device revocation failed');
    }
  }

  /**
   * Check if the current device has a stored device key
   * Used to determine authentication flow
   */
  async hasDeviceKey(uid: string): Promise<boolean> {
    try {
      return await deviceKeyManager.hasDeviceKey(uid);
    } catch (error) {
      console.error('Failed to check device key:', error);
      return false;
    }
  }

  /**
   * Generate ZKP proof using device key as secret input
   * Requirements: 2.1, 2.4
   */
  async generateZKPWithDeviceKey(uid: string, challenge?: string): Promise<string> {
    try {
      // Get the device private key
      const devicePrivateKey = await deviceKeyManager.getDeviceKey(uid);
      if (!devicePrivateKey) {
        throw new Error('No device key found for this device');
      }

      // Use challenge or generate one if not provided
      const zkpChallenge = challenge || this.generateChallenge();

      // Sign the challenge using the device private key
      // This signature will be used as the secret input for ZKP generation
      const deviceSignature = await deviceKeyManager.signChallenge(zkpChallenge, devicePrivateKey);

      // Generate ZKP proof using the device signature as the secret
      // We need to call the backend to generate the actual ZKP proof
      const zkpProof = await this.generateZKPProofOnBackend(uid, deviceSignature);

      return zkpProof;
    } catch (error) {
      console.error('ZKP generation with device key failed:', error);
      throw new Error(error instanceof Error ? error.message : 'ZKP generation failed');
    }
  }

  /**
   * Generate ZKP proof on backend using device signature
   */
  private async generateZKPProofOnBackend(uid: string, deviceSignature: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/device-auth/generate-zkp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid, deviceSignature }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'ZKP generation failed');
      }

      return data.zkpProof;
    } catch (error) {
      console.error('Backend ZKP generation failed:', error);
      throw new Error(error instanceof Error ? error.message : 'ZKP generation failed');
    }
  }

  /**
   * Complete device-based authentication flow
   * Combines device key check, ZKP generation, and authentication
   * Requirements: 2.1, 2.4
   */
  async authenticateWithDevice(uid: string): Promise<AuthResult> {
    try {
      // Check if device has a stored key
      const hasKey = await this.hasDeviceKey(uid);
      if (!hasKey) {
        throw new Error('No device key found. Please authorize this device first.');
      }

      // Generate ZKP proof using device key
      const zkpProof = await this.generateZKPWithDeviceKey(uid);

      // Submit ZKP for authentication
      return await this.loginWithDeviceKey(uid, zkpProof);
    } catch (error) {
      console.error('Device authentication failed:', error);
      
      // Preserve special error properties for device revocation handling
      const originalError = error as Error & { requiresRecovery?: boolean; errorCode?: string };
      if (originalError.requiresRecovery || originalError.errorCode) {
        // Re-throw the original error with its special properties intact
        throw error;
      }
      
      // For other errors, throw a generic error
      throw new Error(error instanceof Error ? error.message : 'Device authentication failed');
    }
  }

  /**
   * Complete new device authorization and authentication flow
   * Requirements: 3.1, 3.5
   */
  async authorizeAndAuthenticate(uid: string, recoveryPhrase: string): Promise<AuthResult> {
    try {
      // Authorize the new device
      const authResult = await this.authorizeNewDevice(uid, recoveryPhrase);
      
      if (!authResult.success) {
        throw new Error(authResult.message);
      }

      // Generate ZKP proof using the newly created device key
      const zkpProof = await this.generateZKPWithDeviceKey(uid);

      // Authenticate with the new device key
      return await this.loginWithDeviceKey(uid, zkpProof);
    } catch (error) {
      console.error('Device authorization and authentication failed:', error);
      throw new Error(error instanceof Error ? error.message : 'Device authorization failed');
    }
  }

  /**
   * Generate a cryptographically secure challenge for ZKP
   */
  private generateChallenge(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Get a user-friendly device name
   */
  private getDeviceName(): string {
    const userAgent = navigator.userAgent;
    
    // Simple device detection
    if (userAgent.includes('Mobile')) {
      return 'Mobile Device';
    } else if (userAgent.includes('Tablet')) {
      return 'Tablet';
    } else {
      return 'Desktop Computer';
    }
  }
}

// Export singleton instance
export const deviceAuthService = new DeviceAuthService();