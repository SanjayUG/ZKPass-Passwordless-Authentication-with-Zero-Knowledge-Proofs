/**
 * Device Authentication Controller
 * Handles HTTP endpoints for device key authentication
 */

import { RequestHandler } from 'express';
import { deviceRegistry } from '../services/deviceRegistry';
import { deviceAuthService } from '../services/deviceAuth';
import { checkUIDExists } from '../services/blockchain';
import { securityLogger } from '../services/securityLogger';
import {
  DeviceAuthorizationRequest,
  AuthResult
} from '../types/device';

/**
 * Verify ZKP proof with device key authentication
 */
export const verifyDeviceZKP: RequestHandler = async (req, res) => {
  const { uid, zkpProof, deviceId } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  try {
    if (!uid || !zkpProof) {
      securityLogger.logZKPVerification(uid || 'unknown', deviceId, false, ipAddress, userAgent, 'Missing UID or zkpProof');
      res.status(400).json({
        success: false,
        message: 'UID and zkpProof are required'
      });
      return;
    }

    // Check if account is locked
    if (securityLogger.isAccountLocked(uid)) {
      const lockInfo = securityLogger.getAccountLockInfo(uid);
      securityLogger.logAuthenticationFailure(uid, 'Attempted login on locked account', ipAddress, userAgent);
      res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to suspicious activity. Please try again later.',
        lockInfo: lockInfo ? {
          reason: lockInfo.reason,
          unlockAt: lockInfo.unlockAt?.toISOString()
        } : undefined
      });
      return;
    }

    // Check rate limiting
    if (!deviceAuthService.checkRateLimit(uid)) {
      securityLogger.logRateLimitExceeded(uid, ipAddress, userAgent);
      res.status(429).json({
        success: false,
        message: 'Too many authentication attempts. Please try again later.'
      });
      return;
    }

    // Check if user exists on blockchain
    const uidExists = await checkUIDExists(uid);
    if (!uidExists) {
      securityLogger.logZKPVerification(uid, deviceId, false, ipAddress, userAgent, 'User not found');
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Check if user has registered devices
    const hasDevices = await deviceRegistry.hasRegisteredDevices(uid);
    if (!hasDevices) {
      securityLogger.logZKPVerification(uid, deviceId, false, ipAddress, userAgent, 'No registered devices found');
      res.status(401).json({
        success: false,
        message: 'No registered devices found. Please authorize this device first.',
        errorCode: 'NO_DEVICES_REGISTERED'
      });
      return;
    }

    // Check if this specific device is registered
    const isDeviceRegistered = await deviceRegistry.isDeviceRegistered(uid, deviceId);
    if (!isDeviceRegistered) {
      securityLogger.logZKPVerification(uid, deviceId, false, ipAddress, userAgent, 'Device not registered or revoked');
      res.status(401).json({
        success: false,
        message: 'This device is not authorized. Please use your recovery phrase to re-authorize this device.',
        errorCode: 'DEVICE_NOT_AUTHORIZED',
        requiresRecovery: true
      });
      return;
    }

    // Debug logging with secure logger
    const { SecureLogger } = await import('../utils/secureLogger');
    console.log('=== ZKP Verification Debug ===');
    SecureLogger.logZKP('ZKP verification started', uid, zkpProof?.length);
    
    // Verify the ZKP proof using device keys
    const isValid = await deviceAuthService.verifyDeviceZKP(uid, zkpProof, deviceId);
    
    console.log('ZKP Verification result:', isValid);
    console.log('=== End Debug ===');

    if (!isValid) {
      securityLogger.logZKPVerification(uid, deviceId, false, ipAddress, userAgent, 'Invalid ZKP proof');
      securityLogger.logAuthenticationFailure(uid, 'Invalid ZKP proof', ipAddress, userAgent);
      res.status(401).json({
        success: false,
        message: 'Authentication failed. Invalid proof or device signature.',
        errorCode: 'INVALID_PROOF'
      });
      return;
    }

    // Reset rate limit on successful authentication
    deviceAuthService.resetRateLimit(uid);

    // Log successful authentication
    securityLogger.logZKPVerification(uid, deviceId, true, ipAddress, userAgent);

    const result: AuthResult = {
      success: true,
      message: 'Authentication successful',
      uid
    };

    res.status(200).json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    securityLogger.logZKPVerification(uid || 'unknown', deviceId, false, ipAddress, userAgent, errorMessage);
    console.error('ZKP verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification' });
  }
};

/**
 * Register a new device with public key
 */
export const registerDevice: RequestHandler = async (req, res) => {
  const { uid, publicKeyJWK, deviceInfo } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  let deviceId: string | undefined;

  try {
    if (!uid || !publicKeyJWK) {
      securityLogger.logDeviceRegistration(uid || 'unknown', 'unknown', false, ipAddress, userAgent, 'Missing UID or publicKeyJWK');
      res.status(400).json({
        success: false,
        message: 'UID and publicKeyJWK are required'
      });
      return;
    }

    // Validate public key format
    if (!deviceAuthService.validatePublicKey(publicKeyJWK)) {
      securityLogger.logDeviceRegistration(uid, 'unknown', false, ipAddress, userAgent, 'Invalid public key format');
      res.status(400).json({
        success: false,
        message: 'Invalid public key format'
      });
      return;
    }

    // Generate device ID from public key
    deviceId = deviceAuthService.generateDeviceId(publicKeyJWK);

    // Store the device key
    await deviceRegistry.storeDeviceKey(uid, deviceId, publicKeyJWK, deviceInfo);

    // Log successful device registration
    securityLogger.logDeviceRegistration(uid, deviceId, true, ipAddress, userAgent);

    res.status(201).json({
      success: true,
      message: 'Device registered successfully',
      deviceId
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    securityLogger.logDeviceRegistration(uid || 'unknown', deviceId || 'unknown', false, ipAddress, userAgent, errorMessage);
    console.error('Device registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during device registration' });
  }
};

/**
 * Authorize new device using recovery phrase
 */
export const authorizeDevice: RequestHandler = async (req, res) => {
  const { uid, recoveryPhrase, publicKeyJWK, deviceInfo }: DeviceAuthorizationRequest = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  let deviceId: string | undefined;

  try {
    if (!uid || !recoveryPhrase || !publicKeyJWK) {
      securityLogger.logDeviceAuthorization(uid || 'unknown', 'unknown', false, ipAddress, userAgent, 'Missing required fields');
      res.status(400).json({
        success: false,
        message: 'UID, recoveryPhrase, and publicKeyJWK are required'
      });
      return;
    }

    // Check if account is locked
    if (securityLogger.isAccountLocked(uid)) {
      const lockInfo = securityLogger.getAccountLockInfo(uid);
      securityLogger.logAuthenticationFailure(uid, 'Attempted device authorization on locked account', ipAddress, userAgent);
      res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to suspicious activity. Please try again later.',
        lockInfo: lockInfo ? {
          reason: lockInfo.reason,
          unlockAt: lockInfo.unlockAt?.toISOString()
        } : undefined
      });
      return;
    }

    // Check rate limiting for recovery attempts
    if (!deviceAuthService.checkRateLimit(`recovery_${uid}`)) {
      securityLogger.logRateLimitExceeded(uid, ipAddress, userAgent);
      res.status(429).json({
        success: false,
        message: 'Too many recovery attempts. Please try again later.'
      });
      return;
    }

    // Verify recovery phrase using shared utility
    const { verifyRecoveryPhrase } = await import('../utils/recoveryPhrase');

    try {
      const derivedUID = verifyRecoveryPhrase(recoveryPhrase);

      if (derivedUID !== uid) {
        securityLogger.logRecoveryAttempt(uid, false, ipAddress, userAgent, 'Recovery phrase does not match UID');
        res.status(401).json({
          success: false,
          message: 'Invalid recovery phrase'
        });
        return;
      }

      // Log successful recovery phrase verification
      securityLogger.logRecoveryAttempt(uid, true, ipAddress, userAgent);

    } catch (verificationError) {
      const errorMessage = verificationError instanceof Error ? verificationError.message : 'Invalid recovery phrase format';
      securityLogger.logRecoveryAttempt(uid, false, ipAddress, userAgent, errorMessage);
      res.status(401).json({
        success: false,
        message: 'Invalid recovery phrase format'
      });
      return;
    }

    // Validate public key format
    if (!deviceAuthService.validatePublicKey(publicKeyJWK)) {
      securityLogger.logDeviceAuthorization(uid, 'unknown', false, ipAddress, userAgent, 'Invalid public key format');
      res.status(400).json({
        success: false,
        message: 'Invalid public key format'
      });
      return;
    }

    // Generate device ID and register the device
    deviceId = deviceAuthService.generateDeviceId(publicKeyJWK);
    await deviceRegistry.storeDeviceKey(uid, deviceId, publicKeyJWK, deviceInfo);

    // Reset rate limit on successful authorization
    deviceAuthService.resetRateLimit(`recovery_${uid}`);

    // Log successful device authorization with notification
    securityLogger.logEventWithNotification({
      eventType: 'DEVICE_AUTHORIZATION',
      uid,
      deviceId,
      success: true,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      details: { newDevice: true, authorizedViaRecoveryPhrase: true }
    });

    const result: AuthResult = {
      success: true,
      message: 'Device authorized successfully',
      uid
    };

    res.status(200).json({ ...result, deviceId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    securityLogger.logDeviceAuthorization(uid || 'unknown', deviceId || 'unknown', false, ipAddress, userAgent, errorMessage);
    console.error('Device authorization error:', error);
    res.status(500).json({ success: false, message: 'Server error during device authorization' });
  }
};

/**
 * List authorized devices for a user
 */
export const listDevices: RequestHandler = async (req, res) => {
  const { uid } = req.params;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  try {
    if (!uid) {
      res.status(400).json({ success: false, message: 'UID is required' });
      return;
    }

    const devices = await deviceRegistry.listUserDevices(uid);

    // Remove sensitive information before sending
    const sanitizedDevices = devices.map(device => ({
      deviceId: device.deviceId,
      createdAt: device.createdAt,
      lastUsed: device.lastUsed,
      deviceName: device.deviceName,
      userAgent: device.userAgent
    }));

    res.status(200).json({
      success: true,
      devices: sanitizedDevices
    });
  } catch (error) {
    console.error('List devices error:', error);
    res.status(500).json({ success: false, message: 'Server error while listing devices' });
  }
};

/**
 * Generate ZKP proof using device signature
 */
export const generateZKP: RequestHandler = async (req, res) => {
  const { uid, deviceSignature } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  try {
    if (!uid || !deviceSignature) {
      res.status(400).json({
        success: false,
        message: 'UID and deviceSignature are required'
      });
      return;
    }

    // Generate ZKP proof using device signature as the secret input
    const { generateProofWithDeviceKey } = await import('../../zkp/proofGenerator');
    const zkpProof = await generateProofWithDeviceKey(uid, deviceSignature);

    res.status(200).json({
      success: true,
      zkpProof
    });
  } catch (error) {
    console.error('ZKP generation error:', error);
    res.status(500).json({ success: false, message: 'Server error during ZKP generation' });
  }
};

/**
 * Revoke a device
 */
export const revokeDevice: RequestHandler = async (req, res) => {
  const { uid, deviceId } = req.params;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');

  try {
    if (!uid || !deviceId) {
      securityLogger.logDeviceRevocation(uid || 'unknown', deviceId || 'unknown', false, ipAddress, userAgent, 'Missing UID or deviceId');
      res.status(400).json({ success: false, message: 'UID and deviceId are required' });
      return;
    }

    const removed = await deviceRegistry.removeDevice(uid, deviceId);

    if (!removed) {
      securityLogger.logDeviceRevocation(uid, deviceId, false, ipAddress, userAgent, 'Device not found');
      res.status(404).json({ success: false, message: 'Device not found' });
      return;
    }

    // Log successful device revocation
    securityLogger.logDeviceRevocation(uid, deviceId, true, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      message: 'Device revoked successfully'
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    securityLogger.logDeviceRevocation(uid || 'unknown', deviceId || 'unknown', false, ipAddress, userAgent, errorMessage);
    console.error('Device revocation error:', error);
    res.status(500).json({ success: false, message: 'Server error during device revocation' });
  }
};

/**
 * Enhanced authentication endpoint supporting multiple methods
 */
export const enhancedAuthenticate: RequestHandler = async (req, res) => {
  try {
    const requestBody = req.body;
    const { 
      uid, 
      deviceSignature, 
      zkpProof, 
      authMethod = 'auto' as const,
      fallbackEnabled = true 
    } = requestBody;

    // Validate required fields
    if (!uid) {
      res.status(400).json({
        success: false,
        error: 'UID is required',
        method: 'hybrid'
      });
      return;
    }

    // Check available authentication methods for the user
    const availableMethods = await deviceAuthService.getAvailableAuthMethods(uid);

    // Handle migration case
    if (availableMethods.migrationNeeded && !availableMethods.deviceSignature) {
      res.status(200).json({
        success: false,
        method: 'hybrid',
        uid,
        deviceId: '',
        timestamp: Math.floor(Date.now() / 1000),
        migrationNeeded: true,
        availableMethods: ['legacy'],
        error: 'User migration required - no devices registered'
      });
      return;
    }

    let result;

    // Route authentication based on method preference
    switch (authMethod) {
      case 'zkp':
        if (!availableMethods.zkpProof) {
          res.status(400).json({
            success: false,
            error: 'ZKP authentication not available for this user',
            method: 'zkp',
            availableMethods: Object.keys(availableMethods).filter(k => availableMethods[k as keyof typeof availableMethods])
          });
          return;
        }
        
        result = await deviceAuthService.authenticateWithZKP({
          uid,
          deviceSignature,
          enableFallback: fallbackEnabled
        });
        break;

      case 'device_signature':
        if (!availableMethods.deviceSignature || !deviceSignature) {
          res.status(400).json({
            success: false,
            error: 'Device signature authentication not available or signature missing',
            method: 'device_signature'
          });
          return;
        }
        
        result = await deviceAuthService.authenticateWithDeviceSignature(uid, deviceSignature);
        break;

      case 'hybrid':
      case 'auto':
      default:
        // Use hybrid authentication with fallback
        result = await deviceAuthService.authenticateWithFallback(
          uid,
          deviceSignature,
          zkpProof,
          {
            preferZKP: (authMethod as string) !== 'device_signature',
            enableFallback: fallbackEnabled,
            timeout: 10000
          }
        );
        break;
    }

    // Prepare response
    const response = {
      success: result.success,
      method: result.method,
      uid: result.uid,
      deviceId: result.deviceId,
      timestamp: result.timestamp,
      proof: result.proof,
      fallbackUsed: result.fallbackUsed,
      migrationNeeded: availableMethods.migrationNeeded,
      availableMethods: Object.keys(availableMethods).filter(k => availableMethods[k as keyof typeof availableMethods]),
      error: result.error
    };

    const statusCode = result.success ? 200 : 401;
    res.status(statusCode).json(response);

  } catch (error) {
    console.error('Enhanced authentication error:', error);
    res.status(500).json({
      success: false,
      method: 'hybrid' as const,
      uid: req.body.uid || '',
      deviceId: '',
      timestamp: Math.floor(Date.now() / 1000),
      error: 'Internal server error during authentication'
    });
  }
};

/**
 * ZKP-specific authentication endpoint
 */
export const authenticateWithZKP: RequestHandler = async (req, res) => {
  try {
    const zkpRequest = req.body;

    if (!zkpRequest.uid) {
      res.status(400).json({
        success: false,
        error: 'UID is required for ZKP authentication'
      });
      return;
    }

    if (!zkpRequest.devicePrivateKey && !zkpRequest.deviceSignature) {
      res.status(400).json({
        success: false,
        error: 'Either device private key or device signature is required'
      });
      return;
    }

    const result = await deviceAuthService.authenticateWithZKP(zkpRequest);

    const statusCode = result.success ? 200 : 401;
    res.status(statusCode).json(result);

  } catch (error) {
    console.error('ZKP authentication error:', error);
    res.status(500).json({
      success: false,
      method: 'zkp',
      uid: req.body.uid || '',
      deviceId: '',
      timestamp: Math.floor(Date.now() / 1000),
      error: 'Internal server error during ZKP authentication'
    });
  }
};

/**
 * Generate ZKP proof endpoint (enhanced version)
 */
export const generateZKProofEnhanced: RequestHandler = async (req, res) => {
  try {
    const { uid, devicePrivateKey, deviceSignature, challenge } = req.body;

    if (!uid) {
      res.status(400).json({
        success: false,
        error: 'UID is required'
      });
      return;
    }

    if (!devicePrivateKey && !deviceSignature) {
      res.status(400).json({
        success: false,
        error: 'Either device private key or device signature is required'
      });
      return;
    }

    let proofData;

    if (devicePrivateKey) {
      proofData = await deviceAuthService.generateZKProofWithDevice(
        uid,
        devicePrivateKey,
        challenge
      );
    } else {
      proofData = await deviceAuthService.generateZKProofWithDeviceSignature(
        uid,
        deviceSignature,
        challenge
      );
    }

    res.status(200).json({
      success: true,
      uid,
      proof: proofData.proof,
      publicSignals: proofData.publicSignals,
      generationTime: proofData.generationTime,
      method: proofData.method
    });

  } catch (error) {
    console.error('ZKP proof generation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate ZKP proof'
    });
  }
};

/**
 * Device registration with ZKP support
 */
export const registerDeviceWithZKP: RequestHandler = async (req, res) => {
  try {
    const { uid, deviceInfo } = req.body;

    if (!uid) {
      res.status(400).json({
        success: false,
        error: 'UID is required for device registration'
      });
      return;
    }

    // Generate new device key pair
    const deviceKey = await deviceAuthService.generateDeviceKey(uid);

    // Test ZKP proof generation with the new device key
    try {
      const testProof = await deviceAuthService.generateZKProofWithDevice(
        uid,
        deviceKey.privateKey
      );

      res.status(200).json({
        success: true,
        uid,
        deviceId: deviceKey.deviceId,
        deviceKey: {
          deviceId: deviceKey.deviceId,
          publicKey: deviceKey.publicKey,
          createdAt: deviceKey.createdAt
          // Note: privateKey is not returned for security
        },
        zkpEnabled: true,
        testProof: {
          generated: true,
          generationTime: testProof.generationTime
        }
      });

    } catch (zkpError) {
      // Device registered but ZKP test failed
      console.warn('Device registered but ZKP test failed:', zkpError);
      
      res.status(200).json({
        success: true,
        uid,
        deviceId: deviceKey.deviceId,
        deviceKey: {
          deviceId: deviceKey.deviceId,
          publicKey: deviceKey.publicKey,
          createdAt: deviceKey.createdAt
        },
        zkpEnabled: false,
        warning: 'Device registered but ZKP functionality may not be available'
      });
    }

  } catch (error) {
    console.error('Device registration error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register device'
    });
  }
};

/**
 * Check migration status for legacy users
 */
export const checkMigrationStatus: RequestHandler = async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      res.status(400).json({
        success: false,
        error: 'UID is required'
      });
      return;
    }

    const migrationNeeded = await deviceAuthService.checkMigrationNeeded(uid);
    const availableMethods = await deviceAuthService.getAvailableAuthMethods(uid);

    const migrationStatus = {
      needed: migrationNeeded,
      availableMethods: Object.keys(availableMethods).filter(k => availableMethods[k as keyof typeof availableMethods])
    };

    if (migrationNeeded) {
      (migrationStatus as any).reason = 'User exists in legacy system but has no registered devices';
      (migrationStatus as any).recommendedAction = 'Register a device using recovery phrase authentication';
    }

    res.status(200).json({
      success: true,
      uid,
      migration: migrationStatus
    });

  } catch (error) {
    console.error('Migration status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check migration status'
    });
  }
};

/**
 * Migrate legacy user to device-based authentication
 */
export const migrateLegacyUser: RequestHandler = async (req, res) => {
  try {
    const { uid, recoveryPhrase } = req.body;

    if (!uid || !recoveryPhrase) {
      res.status(400).json({
        success: false,
        error: 'UID and recovery phrase are required for migration'
      });
      return;
    }

    const migrationResult = await deviceAuthService.migrateLegacyUser(uid, recoveryPhrase);

    if (migrationResult.success) {
      res.status(200).json({
        success: true,
        uid,
        message: 'User successfully migrated to device-based authentication',
        deviceKey: {
          deviceId: migrationResult.deviceKey!.deviceId,
          publicKey: migrationResult.deviceKey!.publicKey,
          createdAt: migrationResult.deviceKey!.createdAt
        },
        zkpEnabled: true
      });
    } else {
      res.status(400).json({
        success: false,
        error: migrationResult.error || 'Migration failed'
      });
    }

  } catch (error) {
    console.error('User migration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during migration'
    });
  }
};

/**
 * Get available authentication methods for a user
 */
export const getAuthMethods: RequestHandler = async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      res.status(400).json({
        success: false,
        error: 'UID is required'
      });
      return;
    }

    const methods = await deviceAuthService.getAvailableAuthMethods(uid);
    const devices = await deviceRegistry.listUserDevices(uid);

    res.status(200).json({
      success: true,
      uid,
      authMethods: methods,
      deviceCount: devices.length,
      devices: devices.map(d => ({
        deviceId: d.deviceId,
        deviceName: d.deviceName,
        createdAt: d.createdAt,
        lastUsed: d.lastUsed
      }))
    });

  } catch (error) {
    console.error('Get auth methods error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get authentication methods'
    });
  }
};

/**
 * Health check endpoint for enhanced device authentication
 */
export const healthCheckEnhanced: RequestHandler = async (req, res) => {
  try {
    const health = await deviceAuthService.healthCheck();
    const stats = deviceAuthService.getDeviceManagerStats();

    res.status(health.status === 'healthy' ? 200 : 503).json({
      status: health.status,
      components: health.components,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
};