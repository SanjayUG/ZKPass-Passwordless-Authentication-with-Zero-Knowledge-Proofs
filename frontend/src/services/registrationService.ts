/**
 * Registration service that integrates device key authentication
 * This service handles the complete registration flow including device key setup
 */

import { authApi } from './api';
import { 
  setupDeviceKey, 
  removeDeviceKey, 
  isBrowserSupported 
} from '../utils/deviceKeyUtils';
// Removed unused import: DeviceKeyError

export interface RegistrationResult {
  success: boolean;
  recoveryPhrase: string;
  deviceId?: string;
  deviceSetupFailed?: boolean;
  deviceError?: string;
  message: string;
}

export interface RegistrationOptions {
  enableDeviceKey?: boolean;
  deviceName?: string;
}

/**
 * Complete registration flow with integrated device key setup
 * This is the main registration function that should be used by the frontend
 */
export async function registerUser(
  uid: string, 
  options: RegistrationOptions = {}
): Promise<RegistrationResult> {
  const { enableDeviceKey = true, deviceName } = options;
  
  try {
    // Step 1: Validate inputs
    if (!uid || typeof uid !== 'string' || uid.trim().length === 0) {
      throw new Error('Valid UID is required for registration');
    }

    // Step 2: Check browser support for device keys if enabled
    if (enableDeviceKey && !isBrowserSupported()) {
      console.warn('Browser does not support device keys, proceeding without device authentication');
      return await registerWithoutDeviceKey(uid);
    }

    // Step 3: Register UID with backend first
    console.log('Starting registration for UID:', uid);
    const initialRegistration = await authApi.register(uid);
    
    if (!initialRegistration.success) {
      throw new Error('Failed to register UID with backend');
    }

    // Step 4: If device keys are disabled, return early
    if (!enableDeviceKey) {
      return {
        success: true,
        recoveryPhrase: initialRegistration.recoveryPhrase,
        message: 'Registration successful (device authentication disabled)'
      };
    }

    // Step 5: Generate device key pair after successful UID registration
    let deviceId: string | undefined;
    let deviceSetupFailed = false;
    let deviceError: string | undefined;

    try {
      console.log('Generating device key for registered UID:', uid);
      const deviceKeyResult = await setupDeviceKey(uid);
      deviceId = deviceKeyResult.deviceId;

      // Step 6: Register device key with backend
      const deviceInfo = {
        deviceName: deviceName || getDefaultDeviceName(),
        userAgent: navigator.userAgent
      };

      const deviceRegistration = await authApi.register(uid, deviceKeyResult.publicKeyJWK, deviceInfo);
      
      console.log('Device registration response:', deviceRegistration);
      
      if (deviceRegistration.deviceSetupFailed) {
        deviceSetupFailed = true;
        deviceError = deviceRegistration.deviceError || 'Device key registration failed';
        console.warn('Device key registration failed:', deviceError);
      } else {
        // Update device ID with the one returned by backend
        if (deviceRegistration.deviceId) {
          console.log('Updating device ID from', deviceId, 'to', deviceRegistration.deviceId);
          deviceId = deviceRegistration.deviceId;
          // Update the stored device key with the correct device ID
          await deviceKeyManager.updateDeviceId(uid, deviceRegistration.deviceId);
          console.log('Device ID updated successfully');
        } else {
          console.warn('No device ID returned from backend');
        }
        console.log('Device key registered successfully:', deviceId);
      }

    } catch (deviceKeyError) {
      deviceSetupFailed = true;
      deviceError = deviceKeyError instanceof Error ? deviceKeyError.message : 'Device key setup failed';
      console.error('Device key setup failed:', deviceKeyError);

      // Clean up any partially created device keys
      try {
        await removeDeviceKey(uid);
      } catch (cleanupError) {
        console.error('Failed to clean up device key after setup failure:', cleanupError);
      }
    }

    // Step 7: Return registration result
    const result: RegistrationResult = {
      success: true,
      recoveryPhrase: initialRegistration.recoveryPhrase,
      deviceId,
      deviceSetupFailed,
      deviceError,
      message: deviceSetupFailed 
        ? 'Registration successful, but device authentication setup failed'
        : 'Registration successful with device authentication enabled'
    };

    console.log('Registration completed:', {
      uid,
      deviceId,
      deviceSetupSuccess: !deviceSetupFailed
    });

    return result;

  } catch (error) {
    console.error('Registration failed:', error);
    
    // Clean up any device keys that might have been created
    try {
      await removeDeviceKey(uid);
    } catch (cleanupError) {
      console.error('Failed to clean up device key after registration failure:', cleanupError);
    }

    throw new Error(
      error instanceof Error 
        ? error.message 
        : 'Registration failed due to unknown error'
    );
  }
}

/**
 * Registration flow without device key authentication
 * Used as fallback when device keys are not supported or disabled
 */
async function registerWithoutDeviceKey(uid: string): Promise<RegistrationResult> {
  try {
    const registrationResult = await authApi.register(uid);
    
    if (!registrationResult.success) {
      throw new Error('Backend registration failed');
    }

    return {
      success: true,
      recoveryPhrase: registrationResult.recoveryPhrase,
      message: 'Registration successful (device authentication not available)'
    };
  } catch (error) {
    console.error('Registration without device key failed:', error);
    throw error;
  }
}

/**
 * Get a default device name based on the user agent
 */
function getDefaultDeviceName(): string {
  const userAgent = navigator.userAgent;
  
  if (userAgent.includes('Mobile')) {
    return 'Mobile Device';
  } else if (userAgent.includes('Tablet')) {
    return 'Tablet Device';
  } else if (userAgent.includes('Chrome')) {
    return 'Chrome Browser';
  } else if (userAgent.includes('Firefox')) {
    return 'Firefox Browser';
  } else if (userAgent.includes('Safari')) {
    return 'Safari Browser';
  } else if (userAgent.includes('Edge')) {
    return 'Edge Browser';
  } else {
    return 'Desktop Device';
  }
}

/**
 * Validate registration requirements before starting the process
 */
export function validateRegistrationRequirements(uid: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate UID
  if (!uid || typeof uid !== 'string') {
    errors.push('UID must be a non-empty string');
  } else if (uid.trim().length === 0) {
    errors.push('UID cannot be empty or whitespace only');
  } else if (uid.length < 3) {
    errors.push('UID must be at least 3 characters long');
  } else if (uid.length > 50) {
    errors.push('UID must be less than 50 characters long');
  }

  // Check browser support
  if (!isBrowserSupported()) {
    errors.push('Browser does not support required cryptographic features');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Check if a user can register with device keys
 */
export function canRegisterWithDeviceKeys(): boolean {
  return isBrowserSupported();
}