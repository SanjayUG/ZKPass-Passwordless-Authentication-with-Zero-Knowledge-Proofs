/**
 * Secure logging utilities to prevent sensitive data exposure
 * Requirements: Security best practices for logging
 */

/**
 * Mask sensitive data for logging purposes
 * Shows first 3 and last 3 characters with asterisks in between
 */
export function maskSensitiveData(data: string, label: string = 'DATA'): string {
  if (!data || data.length < 6) {
    return `${label}:***`;
  }
  
  const start = data.substring(0, 3);
  const end = data.substring(data.length - 3);
  const middle = '*'.repeat(Math.min(data.length - 6, 8)); // Limit asterisks to 8
  
  return `${label}:${start}${middle}${end}`;
}

/**
 * Create a hash-based identifier for logging
 * Useful for correlation without exposing actual values
 */
export function createLogId(data: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8);
}

/**
 * Secure console logging for development
 * Automatically masks UIDs, device IDs, and other sensitive data
 */
export class SecureLogger {
  private static isDevelopment = process.env.NODE_ENV !== 'production';
  
  static logAuth(message: string, uid?: string, deviceId?: string, additional?: any) {
    if (!this.isDevelopment) return;
    
    const logData: any = { message };
    
    if (uid) {
      logData.uid = maskSensitiveData(uid, 'UID');
      logData.uidHash = createLogId(uid);
    }
    
    if (deviceId) {
      logData.deviceId = maskSensitiveData(deviceId, 'DEVICE');
      logData.deviceHash = createLogId(deviceId);
    }
    
    if (additional) {
      logData.additional = additional;
    }
    
    console.log('🔐 AUTH:', logData);
  }
  
  static logZKP(message: string, uid?: string, proofLength?: number, result?: boolean) {
    if (!this.isDevelopment) return;
    
    const logData: any = { message };
    
    if (uid) {
      logData.uid = maskSensitiveData(uid, 'UID');
      logData.uidHash = createLogId(uid);
    }
    
    if (proofLength !== undefined) {
      logData.proofLength = proofLength;
    }
    
    if (result !== undefined) {
      logData.result = result;
    }
    
    console.log('⚡ ZKP:', logData);
  }
  
  static logDevice(message: string, uid?: string, deviceId?: string, success?: boolean) {
    if (!this.isDevelopment) return;
    
    const logData: any = { message };
    
    if (uid) {
      logData.uid = maskSensitiveData(uid, 'UID');
      logData.uidHash = createLogId(uid);
    }
    
    if (deviceId) {
      logData.deviceId = maskSensitiveData(deviceId, 'DEVICE');
      logData.deviceHash = createLogId(deviceId);
    }
    
    if (success !== undefined) {
      logData.success = success;
    }
    
    console.log('📱 DEVICE:', logData);
  }
  
  static logSecurity(message: string, uid?: string, details?: any) {
    // Security logs should always be visible but still secure
    const logData: any = { message };
    
    if (uid) {
      logData.uid = maskSensitiveData(uid, 'UID');
      logData.uidHash = createLogId(uid);
    }
    
    if (details) {
      logData.details = details;
    }
    
    console.log('🛡️  SECURITY:', logData);
  }
}