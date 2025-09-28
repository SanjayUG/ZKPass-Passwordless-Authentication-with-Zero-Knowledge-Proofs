/**
 * Device authentication types and interfaces
 */

export interface DeviceInfo {
  deviceId: string;           // Unique device identifier
  uid: string;               // User identifier
  publicKeyJWK: JsonWebKey;  // Device public key in JWK format
  createdAt: Date;           // Device registration timestamp
  lastUsed: Date;            // Last authentication timestamp
  deviceName?: string;       // Optional user-friendly device name
  userAgent?: string;        // Browser/device information
}

export interface DeviceZKPLoginRequest {
  uid: string;
  zkpProof: string;
  deviceId?: string;
}

export interface DeviceAuthorizationRequest {
  uid: string;
  recoveryPhrase: string;
  publicKeyJWK: JsonWebKey;
  deviceInfo?: Partial<DeviceInfo>;
}

export interface AuthResult {
  success: boolean;
  message: string;
  uid?: string;              // Confirmed UID after successful auth
}

export enum AuthError {
  ZKP_VERIFICATION_FAILED = 'ZKP_VERIFICATION_FAILED',
  DEVICE_NOT_REGISTERED = 'DEVICE_NOT_REGISTERED',
  INVALID_RECOVERY_PHRASE = 'INVALID_RECOVERY_PHRASE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}