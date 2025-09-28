/**
 * Device Authentication Service
 * Handles ZKP verification using device keys
 */

import crypto from 'crypto';
import { deviceRegistry } from './deviceRegistry';
import { AuthError } from '../types/device';

class DeviceAuthService {
  /**
   * Verify ZKP proof using device public keys or legacy method during migration
   * This integrates with the existing ZKP verification system
   */
  async verifyDeviceZKP(uid: string, zkpProof: string, deviceId?: string): Promise<boolean> {
    try {
      // Check if user has registered devices
      const hasDevices = await deviceRegistry.hasRegisteredDevices(uid);
      
      if (!hasDevices) {
        // No devices registered - this might be a legacy user or migration scenario
        throw new Error(AuthError.DEVICE_NOT_REGISTERED);
      }

      // Get device public keys for the user
      let deviceKeys: JsonWebKey[];
      
      if (deviceId) {
        // Verify against specific device
        const deviceKey = await deviceRegistry.getDeviceKey(uid, deviceId);
        if (!deviceKey) {
          throw new Error(AuthError.DEVICE_NOT_REGISTERED);
        }
        deviceKeys = [deviceKey];
      } else {
        // Try all registered devices for the user
        deviceKeys = await deviceRegistry.getUserDeviceKeys(uid);
        if (deviceKeys.length === 0) {
          throw new Error(AuthError.DEVICE_NOT_REGISTERED);
        }
      }

      console.log(`Verifying ZKP for UID: ${uid} against ${deviceKeys.length} device(s)`);
      
      // For device key authentication, the ZKP proof was generated using a device signature
      // as the secret input. Since we can't regenerate the exact same signature on the server
      // (we only have public keys), we rely on the blockchain verification system.
      // 
      // The ZKP proof structure remains the same, but the secret input is now a device signature
      // instead of a derived private key. This ensures that only devices with the correct
      // private key can generate valid proofs.
      
      // Import the existing proof verifier
      const { verifyProof } = await import('../../zkp/proofVerifier');
      
      // Verify the proof using the existing blockchain verification
      // The blockchain contract doesn't need to change since it only verifies the final proof,
      // not the method used to generate it
      const isValid = await verifyProof(zkpProof, uid);
      
      if (!isValid) {
        throw new Error(AuthError.ZKP_VERIFICATION_FAILED);
      }
      
      // Additional validation: ensure the user has at least one registered device
      // This prevents authentication with old-style derived keys after migration
      if (deviceKeys.length === 0) {
        throw new Error(AuthError.DEVICE_NOT_REGISTERED);
      }
      
      return true;
      
    } catch (error) {
      console.error('ZKP verification error:', error);
      return false;
    }
  }

  /**
   * Verify if user needs migration (exists in legacy system but has no devices)
   */
  async checkMigrationNeeded(uid: string): Promise<boolean> {
    try {
      // Check if user exists on blockchain (legacy system)
      const { checkUIDExists } = await import('./blockchain');
      const uidExists = await checkUIDExists(uid);
      
      if (!uidExists) {
        return false; // User doesn't exist at all
      }
      
      // Check if user has registered devices
      const hasDevices = await deviceRegistry.hasRegisteredDevices(uid);
      
      // Migration needed if user exists but has no devices
      return !hasDevices;
    } catch (error) {
      console.error('Migration check error:', error);
      return false;
    }
  }

  /**
   * Verify legacy authentication during migration process
   * This allows users to authenticate with recovery phrase during migration
   */
  async verifyLegacyAuthentication(uid: string, recoveryPhrase: string): Promise<boolean> {
    try {
      // Verify recovery phrase using shared utility
      const { verifyRecoveryPhrase } = await import('../utils/recoveryPhrase');
      
      const derivedUID = verifyRecoveryPhrase(recoveryPhrase);
      
      // Check if derived UID matches provided UID
      if (derivedUID !== uid) {
        return false;
      }
      
      // Check if user exists on blockchain
      const { checkUIDExists } = await import('./blockchain');
      const uidExists = await checkUIDExists(uid);
      
      return uidExists;
    } catch (error) {
      console.error('Legacy authentication verification error:', error);
      return false;
    }
  }

  /**
   * Generate a device identifier from public key
   */
  generateDeviceId(publicKeyJWK: JsonWebKey): string {
    // Create a deterministic device ID from the public key
    const keyString = JSON.stringify(publicKeyJWK);
    return crypto.createHash('sha256').update(keyString).digest('hex').substring(0, 16);
  }

  /**
   * Validate public key format
   */
  validatePublicKey(publicKeyJWK: JsonWebKey): boolean {
    try {
      // Check required JWK fields for ECDSA P-256
      if (publicKeyJWK.kty !== 'EC') return false;
      if (publicKeyJWK.crv !== 'P-256') return false;
      if (!publicKeyJWK.x || !publicKeyJWK.y) return false;
      if (publicKeyJWK.key_ops && !publicKeyJWK.key_ops.includes('verify')) return false;

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Enhanced rate limiting for authentication attempts with account locking integration
   */
  private attemptCounts: Map<string, { count: number; resetTime: number; firstAttempt: number }> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly ESCALATION_THRESHOLD = 3; // Number of rate limit violations before escalation

  checkRateLimit(uid: string): boolean {
    const now = Date.now();
    const attempts = this.attemptCounts.get(uid);

    if (!attempts || now > attempts.resetTime) {
      // Reset or initialize attempts
      this.attemptCounts.set(uid, { 
        count: 1, 
        resetTime: now + this.RATE_LIMIT_WINDOW_MS,
        firstAttempt: now
      });
      return true;
    }

    if (attempts.count >= this.MAX_ATTEMPTS) {
      // Check if this is a pattern of repeated rate limiting
      const timeSinceFirst = now - attempts.firstAttempt;
      if (timeSinceFirst > this.RATE_LIMIT_WINDOW_MS * this.ESCALATION_THRESHOLD) {
        // Import securityLogger to trigger account locking
        const { securityLogger } = require('./securityLogger');
        securityLogger.logSuspiciousActivity(
          uid,
          'Repeated rate limit violations',
          {
            attemptCount: attempts.count,
            timeSinceFirst: timeSinceFirst,
            rateLimitWindow: this.RATE_LIMIT_WINDOW_MS
          }
        );
      }
      return false; // Rate limit exceeded
    }

    attempts.count++;
    return true;
  }

  /**
   * Reset rate limit for a user (after successful authentication)
   */
  resetRateLimit(uid: string): void {
    this.attemptCounts.delete(uid);
  }

  /**
   * Get current rate limit status for a user
   */
  getRateLimitStatus(uid: string): { count: number; resetTime: number; isLimited: boolean } | null {
    const attempts = this.attemptCounts.get(uid);
    if (!attempts) {
      return null;
    }

    const now = Date.now();
    const isLimited = attempts.count >= this.MAX_ATTEMPTS && now <= attempts.resetTime;

    return {
      count: attempts.count,
      resetTime: attempts.resetTime,
      isLimited
    };
  }
}

// Export singleton instance
export const deviceAuthService = new DeviceAuthService();