/**
 * Device Authentication Service
 * Handles ZKP verification using device keys
 */

import crypto from 'crypto';
import { deviceRegistry } from './deviceRegistry';
import { zkpService } from '../../zkp/zkpService';
import { ZKPProofGenerator } from '../../zkp/proofGenerator';
import { ZKPProofVerifier } from '../../zkp/proofVerifier';
import { AuthError, DeviceKeyPair, AuthenticationResult, ZKPAuthenticationRequest, HybridAuthOptions } from '../types/device';

class DeviceAuthService {
    private zkpGenerator: ZKPProofGenerator;
    private zkpVerifier: ZKPProofVerifier;

    constructor() {
        this.zkpGenerator = new ZKPProofGenerator();
        this.zkpVerifier = new ZKPProofVerifier();
    }
    /**
     * Verify ZKP proof using device public keys or legacy method during migration
     */
    async verifyDeviceZKP(uid: string, zkpProof: string, deviceId?: string): Promise<boolean> {
        try {
            const hasDevices = await deviceRegistry.hasRegisteredDevices(uid);

            if (!hasDevices) {
                throw new Error(AuthError.DEVICE_NOT_REGISTERED);
            }

            // With blockchain storage, we verify device registration differently
            if (deviceId) {
                // Check if specific device is registered
                const isDeviceRegistered = await deviceRegistry.isDeviceRegistered(uid, deviceId);
                if (!isDeviceRegistered) {
                    throw new Error(AuthError.DEVICE_NOT_REGISTERED);
                }
            }
            // If no deviceId provided, we already checked hasRegisteredDevices above

            // Import secure logger
            const { SecureLogger } = await import('../utils/secureLogger');
            SecureLogger.logZKP(`Verifying ZKP for registered device`, uid);

            // With blockchain storage, ZKP verification works differently
            // The proof itself contains the cryptographic evidence
            const { verifyProof } = await import('../../zkp/proofVerifier');
            const isValid = await verifyProof(zkpProof, uid);

            if (!isValid) {
                throw new Error(AuthError.ZKP_VERIFICATION_FAILED);
            }

            return true;

        } catch (error) {
            console.error('ZKP verification error:', error);
            return false;
        }
    }

    /**
     * Check if user needs migration
     */
    async checkMigrationNeeded(uid: string): Promise<boolean> {
        try {
            const { checkUIDExists } = await import('./blockchain');
            const uidExists = await checkUIDExists(uid);

            if (!uidExists) {
                return false;
            }

            const hasDevices = await deviceRegistry.hasRegisteredDevices(uid);
            return !hasDevices;
        } catch (error) {
            console.error('Migration check error:', error);
            return false;
        }
    }

    /**
     * Verify legacy authentication during migration
     */
    async verifyLegacyAuthentication(uid: string, recoveryPhrase: string): Promise<boolean> {
        try {
            const { verifyRecoveryPhrase } = await import('../utils/recoveryPhrase');
            const derivedUID = verifyRecoveryPhrase(recoveryPhrase);

            if (derivedUID !== uid) {
                return false;
            }

            const { checkUIDExists } = await import('./blockchain');
            const uidExists = await checkUIDExists(uid);

            return uidExists;
        } catch (error) {
            console.error('Legacy authentication verification error:', error);
            return false;
        }
    }

    /**
     * Generate device identifier from public key
     */
    generateDeviceId(publicKeyJWK: JsonWebKey): string {
        const keyString = JSON.stringify(publicKeyJWK);
        return crypto.createHash('sha256').update(keyString).digest('hex').substring(0, 16);
    }

    /**
     * Validate public key format
     */
    validatePublicKey(publicKeyJWK: JsonWebKey): boolean {
        try {
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
     * Rate limiting
     */
    private attemptCounts: Map<string, { count: number; resetTime: number; firstAttempt: number }> = new Map();
    private readonly MAX_ATTEMPTS = 5;
    private readonly RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
    private readonly ESCALATION_THRESHOLD = 3;

    checkRateLimit(uid: string): boolean {
        const now = Date.now();
        const attempts = this.attemptCounts.get(uid);

        if (!attempts || now > attempts.resetTime) {
            this.attemptCounts.set(uid, {
                count: 1,
                resetTime: now + this.RATE_LIMIT_WINDOW_MS,
                firstAttempt: now
            });
            return true;
        }

        if (attempts.count >= this.MAX_ATTEMPTS) {
            const timeSinceFirst = now - attempts.firstAttempt;
            if (timeSinceFirst > this.RATE_LIMIT_WINDOW_MS * this.ESCALATION_THRESHOLD) {
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
            return false;
        }

        attempts.count++;
        return true;
    }

    resetRateLimit(uid: string): void {
        this.attemptCounts.delete(uid);
    }

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

    // ========== Enhanced ZKP Integration Functions ==========

    /**
     * Generate device key pair
     */
    async generateDeviceKey(uid: string): Promise<DeviceKeyPair> {
        try {
            // Generate ECDSA P-256 key pair
            const keyPair = crypto.generateKeyPairSync('ec', {
                namedCurve: 'prime256v1',
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            });

            // Convert to JWK format for storage
            const publicKeyJWK = crypto.createPublicKey(keyPair.publicKey).export({
                format: 'jwk'
            }) as JsonWebKey;

            // Generate device ID from public key
            const deviceId = this.generateDeviceId(publicKeyJWK);

            // Store device key in registry
            await deviceRegistry.storeDeviceKey(uid, deviceId, publicKeyJWK);

            return {
                privateKey: keyPair.privateKey,
                publicKey: keyPair.publicKey,
                deviceId,
                createdAt: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to generate device key: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Sign data with device private key
     */
    async signWithDeviceKey(data: string, privateKey: string): Promise<string> {
        try {
            const sign = crypto.createSign('SHA256');
            sign.update(data);
            sign.end();

            const signature = sign.sign(privateKey, 'base64');
            return signature;
        } catch (error) {
            throw new Error(`Failed to sign with device key: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Verify device signature
     */
    async verifyDeviceSignature(signature: string, data: string, publicKey: string): Promise<boolean> {
        try {
            const verify = crypto.createVerify('SHA256');
            verify.update(data);
            verify.end();

            return verify.verify(publicKey, signature, 'base64');
        } catch (error) {
            console.error('Device signature verification error:', error);
            return false;
        }
    }

    /**
     * Generate ZKP proof using device private key
     */
    async generateZKProofWithDevice(
        uid: string,
        devicePrivateKey: string,
        challenge?: string
    ): Promise<any> {
        try {
            // Validate inputs
            if (!uid || !devicePrivateKey) {
                throw new Error('UID and device private key are required for ZKP proof generation');
            }

            // Check if user has registered devices
            const hasDevices = await deviceRegistry.hasRegisteredDevices(uid);
            if (!hasDevices) {
                throw new Error('No registered devices found for user');
            }

            // Generate ZKP proof using the device private key
            const proofResult = await this.zkpGenerator.generateProof(
                uid,
                devicePrivateKey,
                {
                    timeout: 5000, // 5 second timeout per requirement 1.6
                    enablePerformanceLogging: true
                }
            );

            return {
                proof: proofResult.proof,
                publicSignals: proofResult.publicSignals,
                generationTime: proofResult.generationTime,
                method: 'zkp'
            };
        } catch (error) {
            throw new Error(`Failed to generate ZKP proof with device: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Generate ZKP proof using device signature (for compatibility)
     */
    async generateZKProofWithDeviceSignature(
        uid: string,
        deviceSignature: string,
        challenge?: string
    ): Promise<any> {
        try {
            // Use device signature to generate ZKP proof
            const proofResult = await this.zkpGenerator.generateProofWithDeviceKey(
                uid,
                deviceSignature,
                {
                    timeout: 5000,
                    enablePerformanceLogging: true
                }
            );

            return {
                proof: proofResult.proof,
                publicSignals: proofResult.publicSignals,
                generationTime: proofResult.generationTime,
                method: 'zkp'
            };
        } catch (error) {
            throw new Error(`Failed to generate ZKP proof with device signature: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Validate device with ZKP proof
     */
    async validateDeviceWithZKP(
        uid: string,
        proof: any,
        devicePublicKeyHash: string
    ): Promise<boolean> {
        try {
            // Verify the ZKP proof
            const verificationResult = await this.zkpVerifier.verifyZKProof(
                proof.proof,
                proof.publicSignals,
                uid,
                {
                    timeout: 100, // 100ms timeout per requirement 1.7
                    enablePerformanceLogging: true
                }
            );

            // Additional validation: check if device public key hash matches
            if (proof.publicSignals.devicePublicKeyHash !== devicePublicKeyHash) {
                console.warn('Device public key hash mismatch in ZKP proof');
                return false;
            }

            return verificationResult.isValid;
        } catch (error) {
            console.error('ZKP device validation error:', error);
            return false;
        }
    }

    /**
     * Authenticate with fallback support (device signature -> ZKP -> legacy)
     */
    async authenticateWithFallback(
        uid: string,
        deviceSignature?: string,
        zkProof?: any,
        options: HybridAuthOptions = {}
    ): Promise<AuthenticationResult> {
        const startTime = Date.now();
        const { preferZKP = true, enableFallback = true, timeout = 10000 } = options;

        try {
            // Check rate limiting first
            if (!this.checkRateLimit(uid)) {
                return {
                    success: false,
                    method: 'device_signature',
                    uid,
                    deviceId: '',
                    timestamp: Math.floor(Date.now() / 1000),
                    error: 'Rate limit exceeded'
                };
            }

            let result: AuthenticationResult;

            // Strategy 1: Try ZKP first if preferred and available
            if (preferZKP && (zkProof || deviceSignature)) {
                try {
                    result = await this.authenticateWithZKP({
                        uid,
                        deviceSignature,
                        enableFallback: false
                    });

                    if (result.success) {
                        this.resetRateLimit(uid);
                        return result;
                    }
                } catch (error) {
                    console.warn('ZKP authentication failed, trying fallback:', error);
                }
            }

            // Strategy 2: Try device signature authentication
            if (enableFallback && deviceSignature) {
                try {
                    result = await this.authenticateWithDeviceSignature(uid, deviceSignature);

                    if (result.success) {
                        this.resetRateLimit(uid);
                        return { ...result, fallbackUsed: preferZKP };
                    }
                } catch (error) {
                    console.warn('Device signature authentication failed:', error);
                }
            }

            // Strategy 3: Check if migration is needed (legacy users)
            if (enableFallback) {
                const migrationNeeded = await this.checkMigrationNeeded(uid);
                if (migrationNeeded) {
                    return {
                        success: false,
                        method: 'device_signature',
                        uid,
                        deviceId: '',
                        timestamp: Math.floor(Date.now() / 1000),
                        error: 'Migration required - no devices registered',
                        fallbackUsed: true
                    };
                }
            }

            // All authentication methods failed
            return {
                success: false,
                method: 'hybrid',
                uid,
                deviceId: '',
                timestamp: Math.floor(Date.now() / 1000),
                error: 'All authentication methods failed'
            };

        } catch (error) {
            return {
                success: false,
                method: 'hybrid',
                uid,
                deviceId: '',
                timestamp: Math.floor(Date.now() / 1000),
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Authenticate using ZKP proof
     */
    async authenticateWithZKP(request: ZKPAuthenticationRequest): Promise<AuthenticationResult> {
        try {
            const { uid, devicePrivateKey, deviceSignature, enableFallback = true } = request;

            // Generate ZKP proof if not provided
            let proofData: any;

            if (devicePrivateKey) {
                proofData = await this.generateZKProofWithDevice(uid, devicePrivateKey);
            } else if (deviceSignature) {
                proofData = await this.generateZKProofWithDeviceSignature(uid, deviceSignature);
            } else {
                throw new Error('Either device private key or device signature is required');
            }

            // Verify the generated proof
            const isValid = await this.validateDeviceWithZKP(
                uid,
                proofData,
                proofData.publicSignals.devicePublicKeyHash
            );

            if (!isValid && enableFallback && deviceSignature) {
                // Fallback to device signature authentication
                return await this.authenticateWithDeviceSignature(uid, deviceSignature);
            }

            return {
                success: isValid,
                method: 'zkp',
                uid,
                deviceId: proofData.publicSignals.devicePublicKeyHash.substring(0, 16),
                timestamp: Math.floor(Date.now() / 1000),
                proof: proofData,
                fallbackUsed: false
            };

        } catch (error) {
            if (request.enableFallback && request.deviceSignature) {
                // Try fallback authentication
                try {
                    const fallbackResult = await this.authenticateWithDeviceSignature(request.uid, request.deviceSignature);
                    return { ...fallbackResult, fallbackUsed: true };
                } catch (fallbackError) {
                    // Both methods failed
                }
            }

            return {
                success: false,
                method: 'zkp',
                uid: request.uid,
                deviceId: '',
                timestamp: Math.floor(Date.now() / 1000),
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Authenticate using device signature (existing method enhanced)
     */
    async authenticateWithDeviceSignature(uid: string, deviceSignature: string): Promise<AuthenticationResult> {
        try {
            // Use existing device auth service for verification
            const isValid = await this.verifyDeviceZKP(uid, deviceSignature);

            // Get device information
            const devices = await deviceRegistry.listUserDevices(uid);
            const deviceId = devices.length > 0 ? devices[0].deviceId : '';

            return {
                success: isValid,
                method: 'device_signature',
                uid,
                deviceId,
                timestamp: Math.floor(Date.now() / 1000),
                fallbackUsed: false
            };

        } catch (error) {
            return {
                success: false,
                method: 'device_signature',
                uid,
                deviceId: '',
                timestamp: Math.floor(Date.now() / 1000),
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Migrate legacy user to device-based authentication
     */
    async migrateLegacyUser(uid: string, recoveryPhrase: string): Promise<{
        success: boolean;
        deviceKey?: DeviceKeyPair;
        error?: string;
    }> {
        try {
            // Verify legacy authentication first
            const isValidLegacy = await this.verifyLegacyAuthentication(uid, recoveryPhrase);

            if (!isValidLegacy) {
                return {
                    success: false,
                    error: 'Invalid recovery phrase for legacy user'
                };
            }

            // Generate new device key for the user
            const deviceKey = await this.generateDeviceKey(uid);

            return {
                success: true,
                deviceKey
            };

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Get authentication methods available for a user
     */
    async getAvailableAuthMethods(uid: string): Promise<{
        deviceSignature: boolean;
        zkpProof: boolean;
        legacy: boolean;
        migrationNeeded: boolean;
    }> {
        try {
            const hasDevices = await deviceRegistry.hasRegisteredDevices(uid);
            const migrationNeeded = await this.checkMigrationNeeded(uid);

            return {
                deviceSignature: hasDevices,
                zkpProof: hasDevices, // ZKP requires device keys
                legacy: migrationNeeded,
                migrationNeeded
            };

        } catch (error) {
            return {
                deviceSignature: false,
                zkpProof: false,
                legacy: false,
                migrationNeeded: false
            };
        }
    }

    /**
     * Get device manager statistics
     */
    getDeviceManagerStats(): {
        totalUsers: number;
        totalDevices: number;
        zkpEnabled: boolean;
        fallbackEnabled: boolean;
    } {
        const registryStats = deviceRegistry.getStats();

        return {
            totalUsers: registryStats.totalUsers,
            totalDevices: registryStats.totalDevices,
            zkpEnabled: true,
            fallbackEnabled: true
        };
    }

    /**
     * Health check for the enhanced device manager
     */
    async healthCheck(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        components: {
            deviceRegistry: boolean;
            zkpService: boolean;
            fallbackAuth: boolean;
        };
    }> {
        const components = {
            deviceRegistry: true, // Always available (in-memory)
            zkpService: false,
            fallbackAuth: true
        };

        try {
            // Check ZKP service health
            const zkpHealth = await zkpService.healthCheck();
            components.zkpService = zkpHealth.status === 'healthy';

            const allHealthy = Object.values(components).every(c => c);
            const someHealthy = Object.values(components).some(c => c);

            return {
                status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
                components
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                components
            };
        }
    }
}

export const deviceAuthService = new DeviceAuthService();