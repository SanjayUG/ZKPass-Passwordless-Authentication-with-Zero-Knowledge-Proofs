/**
 * Types for authentication
 */

import { DeviceInfo } from './deviceKey';

/**
 * Authentication response from the server
 */
export interface AuthResponse {
  success: boolean;
  message: string;
  uid?: string;
  recoveryPhrase?: string;
}

/**
 * Authentication result interface for device-based authentication
 */
export interface AuthResult {
  success: boolean;
  message: string;
  uid?: string;
  deviceId?: string;
}

/**
 * Device ZKP login request interface
 */
export interface DeviceZKPLoginRequest {
  uid: string;
  zkpProof: string;
  deviceId?: string;
}

/**
 * Device authorization request interface
 */
export interface DeviceAuthorizationRequest {
  uid: string;
  recoveryPhrase: string;
  publicKeyJWK: JsonWebKey;
  deviceInfo?: Partial<DeviceInfo>;
}

/**
 * Device registration request interface
 */
export interface DeviceRegistrationRequest {
  uid: string;
  publicKeyJWK: JsonWebKey;
  deviceInfo?: Partial<DeviceInfo>;
}