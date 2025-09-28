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
        message: 'No registered devices found. Please authorize this device first.'
      });
      return;
    }

    // Debug logging
    console.log('=== ZKP Verification Debug ===');
    console.log('UID:', uid);
    console.log('Device ID from request:', deviceId);
    console.log('ZKP Proof length:', zkpProof?.length);
    
    // Verify the ZKP proof using device keys
    const isValid = await deviceAuthService.verifyDeviceZKP(uid, zkpProof, deviceId);
    
    console.log('ZKP Verification result:', isValid);
    console.log('=== End Debug ===');

    if (!isValid) {
      securityLogger.logZKPVerification(uid, deviceId, false, ipAddress, userAgent, 'Invalid ZKP proof or device not authorized');
      securityLogger.logAuthenticationFailure(uid, 'Invalid ZKP proof or device not authorized', ipAddress, userAgent);
      res.status(401).json({
        success: false,
        message: 'Invalid ZKP proof or device not authorized'
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

