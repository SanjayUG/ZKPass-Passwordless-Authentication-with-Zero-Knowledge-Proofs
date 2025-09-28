/**
 * Migration Service for Device Key Authentication
 * Handles migration of existing users from legacy authentication to device key system
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { deviceKeyManager } from './deviceKeyManager';
import { deviceAuthService } from './deviceAuthService';

const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Migration status interface
 */
interface MigrationStatus {
  needsMigration: boolean;
  hasDeviceKey: boolean;
  hasLegacyAuth: boolean;
  uid?: string;
}

/**
 * Migration result interface
 */
interface MigrationResult {
  success: boolean;
  message: string;
  deviceId?: string;
}

/**
 * Migration Service class
 */
export class MigrationService {
  /**
   * Check if a user needs migration to device key authentication
   * Requirements: 6.1
   */
  async checkMigrationStatus(uid: string): Promise<MigrationStatus> {
    try {
      // Check if user has device key locally
      const hasDeviceKey = await deviceKeyManager.hasDeviceKey(uid);
      
      // Check if user exists on blockchain (legacy system)
      const response = await fetch(`${API_BASE_URL}/auth/check-user/${encodeURIComponent(uid)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      const hasLegacyAuth = response.ok && data.exists;

      // User needs migration if they exist in legacy system but don't have device key
      const needsMigration = hasLegacyAuth && !hasDeviceKey;

      return {
        needsMigration,
        hasDeviceKey,
        hasLegacyAuth,
        uid: hasLegacyAuth ? uid : undefined
      };
    } catch (error) {
      console.error('Migration status check failed:', error);
      return {
        needsMigration: false,
        hasDeviceKey: false,
        hasLegacyAuth: false
      };
    }
  }

  /**
   * Perform migration for existing user using recovery phrase
   * Requirements: 6.2, 6.3
   */
  async migrateUser(uid: string, recoveryPhrase: string): Promise<MigrationResult> {
    try {
      // Verify recovery phrase first
      const verificationResponse = await fetch(`${API_BASE_URL}/auth/verify-recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recoveryPhrase }),
      });

      const verificationData = await verificationResponse.json();

      if (!verificationResponse.ok || !verificationData.success) {
        return {
          success: false,
          message: verificationData.message || 'Invalid recovery phrase'
        };
      }

      // Verify the derived UID matches the provided UID
      if (verificationData.uid !== uid) {
        return {
          success: false,
          message: 'Recovery phrase does not match the provided UID'
        };
      }

      // Generate new device key pair
      const deviceKeyPair = await deviceKeyManager.generateDeviceKeyPair();
      
      // Store device private key locally
      let deviceId = await deviceKeyManager.storeDeviceKey(uid, deviceKeyPair.privateKey);

      // Register device with backend
      const registrationResult = await deviceAuthService.registerDevice(
        uid, 
        deviceKeyPair.publicKeyJWK,
        {
          deviceName: this.getDeviceName(),
          userAgent: navigator.userAgent
        }
      );

      if (!registrationResult.success) {
        // Clean up local storage if backend registration fails
        await deviceKeyManager.removeDeviceKey(uid);
        return {
          success: false,
          message: registrationResult.message || 'Failed to register device'
        };
      }

      // Update device ID with the one returned by backend
      if (registrationResult.deviceId) {
        console.log('Migration: Updating device ID from', deviceId, 'to', registrationResult.deviceId);
        deviceId = registrationResult.deviceId;
        await deviceKeyManager.updateDeviceId(uid, registrationResult.deviceId);
        console.log('Migration: Device ID updated successfully');
      }

      // Mark migration as complete
      await this.markMigrationComplete(uid);

      return {
        success: true,
        message: 'Migration completed successfully',
        deviceId
      };
    } catch (error) {
      console.error('User migration failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Migration failed'
      };
    }
  }

  /**
   * Authenticate user with legacy system and migrate to device keys
   * This is used when user tries to login with legacy system
   * Requirements: 6.3
   */
  async authenticateAndMigrate(uid: string, recoveryPhrase: string): Promise<MigrationResult> {
    try {
      // First, perform the migration
      const migrationResult = await this.migrateUser(uid, recoveryPhrase);
      
      if (!migrationResult.success) {
        return migrationResult;
      }

      // After successful migration, authenticate with device key
      const authResult = await deviceAuthService.authenticateWithDevice(uid);
      
      if (!authResult.success) {
        return {
          success: false,
          message: 'Migration completed but authentication failed. Please try logging in again.'
        };
      }

      return {
        success: true,
        message: 'Migration and authentication completed successfully',
        deviceId: migrationResult.deviceId
      };
    } catch (error) {
      console.error('Authenticate and migrate failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Migration and authentication failed'
      };
    }
  }

  /**
   * Check if user has completed migration
   */
  async isMigrationComplete(uid: string): Promise<boolean> {
    try {
      const migrationFlag = localStorage.getItem(`zkpass_migration_${uid}`);
      const hasDeviceKey = await deviceKeyManager.hasDeviceKey(uid);
      
      return migrationFlag === 'complete' && hasDeviceKey;
    } catch (error) {
      console.error('Migration completion check failed:', error);
      return false;
    }
  }

  /**
   * Mark migration as complete for a user
   */
  private async markMigrationComplete(uid: string): Promise<void> {
    try {
      localStorage.setItem(`zkpass_migration_${uid}`, 'complete');
    } catch (error) {
      console.error('Failed to mark migration complete:', error);
    }
  }

  /**
   * Get user-friendly device name
   */
  private getDeviceName(): string {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Mobile')) {
      return 'Mobile Device';
    } else if (userAgent.includes('Tablet')) {
      return 'Tablet';
    } else {
      return 'Desktop Computer';
    }
  }

  /**
   * Clear migration data (for testing or reset purposes)
   */
  async clearMigrationData(uid: string): Promise<void> {
    try {
      localStorage.removeItem(`zkpass_migration_${uid}`);
    } catch (error) {
      console.error('Failed to clear migration data:', error);
    }
  }
}

// Export singleton instance
export const migrationService = new MigrationService();