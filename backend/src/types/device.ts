/**
 * Device authentication types and interfaces
 * Enhanced with ZKP integration support
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

// Enhanced types for ZKP integration
export interface EnhancedDeviceInfo extends DeviceInfo {
  publicKeyHash?: string;     // Hash of public key for ZKP circuits
  zkpEnabled?: boolean;       // Whether ZKP is enabled for this device
  lastZKPAuth?: Date;         // Last ZKP authentication timestamp
}

export interface DeviceKeyPair {
  privateKey: string;
  publicKey: string;
  deviceId: string;
  createdAt: string;
}

export interface AuthenticationResult {
  success: boolean;
  method: 'device_signature' | 'zkp' | 'hybrid';
  uid: string;
  deviceId: string;
  timestamp: number;
  proof?: any;
  fallbackUsed?: boolean;
  error?: string;
}

export interface ZKPAuthenticationRequest {
  uid: string;
  devicePrivateKey?: string;
  deviceSignature?: string;
  challenge?: string;
  enableFallback?: boolean;
}

export interface HybridAuthOptions {
  preferZKP?: boolean;
  enableFallback?: boolean;
  timeout?: number;
}

export interface EnhancedAuthRequest {
  uid: string;
  deviceSignature?: string;
  zkpProof?: any;
  authMethod?: 'device_signature' | 'zkp' | 'hybrid' | 'auto';
  fallbackEnabled?: boolean;
}

export interface EnhancedAuthResponse {
  success: boolean;
  method: 'device_signature' | 'zkp' | 'hybrid';
  uid: string;
  deviceId: string;
  timestamp: number;
  proof?: any;
  fallbackUsed?: boolean;
  migrationNeeded?: boolean;
  availableMethods?: string[];
  error?: string;
}

export interface MigrationStatus {
  needed: boolean;
  reason?: string;
  availableMethods: string[];
  recommendedAction?: string;
}

export enum AuthError {
  ZKP_VERIFICATION_FAILED = 'ZKP_VERIFICATION_FAILED',
  DEVICE_NOT_REGISTERED = 'DEVICE_NOT_REGISTERED',
  INVALID_RECOVERY_PHRASE = 'INVALID_RECOVERY_PHRASE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  ZKP_GENERATION_FAILED = 'ZKP_GENERATION_FAILED',
  HYBRID_AUTH_FAILED = 'HYBRID_AUTH_FAILED',
  MIGRATION_REQUIRED = 'MIGRATION_REQUIRED',
  FALLBACK_AUTH_FAILED = 'FALLBACK_AUTH_FAILED'
}