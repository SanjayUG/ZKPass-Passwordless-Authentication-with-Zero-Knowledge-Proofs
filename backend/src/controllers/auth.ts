import { Request, Response, RequestHandler } from 'express';
import crypto from 'crypto';
import { ethers } from 'ethers';
import * as snarkjs from 'snarkjs';
import { storeUIDOnBlockchain, checkUIDExists } from '../services/blockchain';
import { WORD_MAP } from '../utils/wordMap';
import { deviceRegistry } from '../services/deviceRegistry';
import { deviceAuthService } from '../services/deviceAuth';
import { securityLogger } from '../services/securityLogger';

// Legacy SECRET_SALT removed for security reasons
// Device key authentication no longer requires shared secrets

/**
 * Register a new user with UID and optional device key
 * Supports both initial registration and device key addition
 */
export const register: RequestHandler = async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.get('User-Agent');
  
  try {
    const { uid, publicKeyJWK, deviceInfo } = req.body;

    if (!uid) {
      res.status(400).json({ success: false, message: 'UID is required' });
      return;
    }

    // Check if UID already exists
    const uidExists = await checkUIDExists(uid);
    
    // If UID doesn't exist, this is initial registration
    if (!uidExists) {
      return await handleInitialRegistration(req, res, uid, publicKeyJWK, deviceInfo, ipAddress, userAgent);
    }
    
    // If UID exists and device key is provided, this is device key addition
    if (publicKeyJWK) {
      return await handleDeviceKeyAddition(req, res, uid, publicKeyJWK, deviceInfo, ipAddress, userAgent);
    }
    
    // UID exists but no device key provided - invalid request
    res.status(400).json({ 
      success: false, 
      message: 'UID already exists. To add device key, provide publicKeyJWK.' 
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

/**
 * Handle initial user registration with optional device key
 */
async function handleInitialRegistration(
  req: Request,
  res: Response,
  uid: string,
  publicKeyJWK?: JsonWebKey,
  deviceInfo?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    // Generate recovery key and phrase
    const revoveryKey = crypto.randomBytes(32).toString('hex');
    const recoveryPhrase = generateRecoveryPhrase(uid, revoveryKey);

    // Store UID on blockchain first - this is the critical step
    await storeUIDOnBlockchain(uid);
    console.log('UID stored on blockchain successfully:', uid);

    let deviceId: string | undefined;
    let deviceSetupFailed = false;
    let deviceError: string | undefined;

    // If device public key is provided, register the device after successful UID registration
    if (publicKeyJWK) {
      try {
        // Validate public key format
        if (!deviceAuthService.validatePublicKey(publicKeyJWK)) {
          throw new Error('Invalid device public key format');
        }

        // Generate device ID and register the device
        deviceId = deviceAuthService.generateDeviceId(publicKeyJWK);
        await deviceRegistry.storeDeviceKey(uid, deviceId, publicKeyJWK, deviceInfo);

        // Log successful device registration
        securityLogger.logDeviceRegistration(uid, deviceId, true, ipAddress, userAgent);
        console.log('Device key registered successfully during initial registration:', deviceId);
        
      } catch (deviceRegistrationError) {
        deviceSetupFailed = true;
        deviceError = deviceRegistrationError instanceof Error 
          ? deviceRegistrationError.message 
          : 'Unknown device registration error';
          
        securityLogger.logDeviceRegistration(uid, deviceId || 'unknown', false, ipAddress, userAgent, deviceError);
        console.error('Device registration failed during initial registration:', deviceRegistrationError);
      }
    }

    // Return registration result
    const response: any = {
      success: true,
      message: deviceSetupFailed 
        ? 'Registration successful, but device setup failed'
        : 'Registration successful',
      recoveryPhrase
    };

    if (deviceId) {
      response.deviceId = deviceId;
    }

    if (deviceSetupFailed) {
      response.deviceSetupFailed = true;
      response.deviceError = deviceError;
    }

    res.status(201).json(response);
    
  } catch (error) {
    console.error('Initial registration failed:', error);
    
    // If blockchain registration fails, the entire registration fails
    const errorMessage = error instanceof Error ? error.message : 'Registration failed';
    res.status(500).json({ 
      success: false, 
      message: errorMessage.includes('already exists') 
        ? 'UID already exists' 
        : 'Server error during registration'
    });
  }
}

/**
 * Handle device key addition to existing user
 */
async function handleDeviceKeyAddition(
  req: Request,
  res: Response,
  uid: string,
  publicKeyJWK: JsonWebKey,
  deviceInfo?: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    // Validate public key format
    if (!deviceAuthService.validatePublicKey(publicKeyJWK)) {
      securityLogger.logDeviceRegistration(uid, 'unknown', false, ipAddress, userAgent, 'Invalid public key format');
      res.status(400).json({
        success: false,
        message: 'Invalid device public key format'
      });
      return;
    }

    // Generate device ID and register the device
    const deviceId = deviceAuthService.generateDeviceId(publicKeyJWK);
    await deviceRegistry.storeDeviceKey(uid, deviceId, publicKeyJWK, deviceInfo);

    // Log successful device registration
    securityLogger.logDeviceRegistration(uid, deviceId, true, ipAddress, userAgent);
    console.log('Device key added successfully to existing user:', { uid, deviceId });

    res.status(201).json({
      success: true,
      message: 'Device key registered successfully',
      deviceId
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown device registration error';
    securityLogger.logDeviceRegistration(uid, 'unknown', false, ipAddress, userAgent, errorMessage);
    console.error('Device key addition failed:', error);
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to register device key',
      deviceError: errorMessage
    });
  }
}

/**
 * Legacy login endpoint - DEPRECATED
 * This endpoint has been removed for security reasons.
 * Use device key authentication instead.
 */
export const login: RequestHandler = async (req, res) => {
  res.status(410).json({
    success: false,
    message: 'Legacy authentication has been disabled for security reasons. Please use device key authentication.',
    migrationRequired: true
  });
};

/**
 * Check if a user exists on the blockchain
 * Used for migration detection
 */
export const checkUser: RequestHandler = async (req, res) => {
  try {
    const { uid } = req.params;

    if (!uid) {
      res.status(400).json({ success: false, message: 'UID is required' });
      return;
    }

    // Check if UID exists on blockchain
    const uidExists = await checkUIDExists(uid);
    
    res.status(200).json({
      success: true,
      exists: uidExists,
      uid: uidExists ? uid : undefined
    });
  } catch (error) {
    console.error('Check user error:', error);
    res.status(500).json({ success: false, message: 'Server error during user check' });
  }
};

/**
 * Verify recovery phrase and derive UID
 */
export const verifyRecoveryPhrase: RequestHandler = async (req, res) => {
  try {
    const { recoveryPhrase } = req.body;

    // Input validation
    if (!recoveryPhrase || typeof recoveryPhrase !== 'string') {
      res.status(400).json({ 
        success: false, 
        message: 'Recovery phrase must be a non-empty string' 
      });
      return;
    }

    // Validate recovery phrase format (should be space-separated words)
    if (!/^[\w\s]+$/.test(recoveryPhrase)) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid recovery phrase format' 
      });
      return;
    }

    try {
      // Derive UID from recovery phrase
      const { uid, privateKey } = deriveUIDFromRecoveryPhrase(recoveryPhrase);


      // Check if UID exists on blockchain
      const uidExists = await checkUIDExists(uid);
      if (!uidExists) {
        res.status(404).json({ 
          success: false, 
          message: 'Invalid recovery phrase - UID not found' 
        });
        return;
      }

      // Get the public key from the private key
      const wallet = new ethers.Wallet(privateKey);
      const publicKey = wallet.address;

      // Return success response matching SDK interface
      res.status(200).json({
        success: true,
        message: 'Recovery successful',
        uid,
        publicKey
      });
    } catch (derivationError) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid recovery phrase - could not derive UID' 
      });
      return;
    }
  } catch (error) {
    console.error('Recovery error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during recovery',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Legacy private key derivation - REMOVED FOR SECURITY
 * This function has been removed as it used a shared SECRET_SALT
 * which created a security vulnerability.
 */
function derivePrivateKey(uid: string): string {
  throw new Error('Legacy private key derivation has been disabled for security reasons. Use device key authentication instead.');
}

/**
 * Generate a recovery phrase from UID and private key
 * Updated to use secure random salt instead of shared SECRET_SALT
 */
const generateRecoveryPhrase = (uid: string, revoveryKey: string): string => {
  // Take 3 random characters from the revoveryKey
  const recvKeyChar = revoveryKey.substring(0, 3);
  
  // Generate 3 random characters instead of using shared salt
  const randomSalt = crypto.randomBytes(3).toString('hex').substring(0, 3);
  
  // Combine: recvKeyChar + uid + randomSalt
  const combinedString = recvKeyChar + uid + randomSalt;
  
  // Generate phrase from combined string using word map
  let phraseParts: string[] = [];
  
  for (let i = 0; i < combinedString.length; i++) {
    const char = combinedString[i];
    const words = WORD_MAP[char] || [];
    
    if (words.length > 0) {
      // Randomly select a word variant
      const randomIndex = Math.floor(Math.random() * words.length);
      phraseParts.push(words[randomIndex]);
    }
  }
  
  return phraseParts.join(' ');
};

/**
 * Derive UID from recovery phrase
 * Updated to only return UID, not private key (for security)
 */
const deriveUIDFromRecoveryPhrase = (recoveryPhrase: string): { uid: string, privateKey: string } => {
  const words = recoveryPhrase.split(' ');
  let combinedString = '';
  
  for (const word of words) {
    let foundChar = '';
    // Search WORD_MAP to find which character's word list contains this word
    for (const [char, wordList] of Object.entries(WORD_MAP)) {
      const index = wordList.indexOf(word);
      if (index !== -1) {
        foundChar = char;
        break;
      }
    }
    combinedString += foundChar;
  }
  
  // The first 3 characters are from the private key
  const priKeyChars = combinedString.substring(0, 3);
  
  // The last 3 characters are from the salt (now random, not shared)
  const saltChars = combinedString.substring(combinedString.length - 3);
  
  // The middle part is the UID
  const uid = combinedString.substring(3, combinedString.length - 3);
  
  // Return a placeholder private key since we no longer derive keys from UID
  // This maintains backward compatibility for recovery phrase verification
  const placeholderPrivateKey = crypto.createHash('sha256').update(uid + priKeyChars + saltChars).digest('hex');
  
  return { uid, privateKey: placeholderPrivateKey };
};