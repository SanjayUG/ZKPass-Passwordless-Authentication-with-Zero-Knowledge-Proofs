/**
 * ZKP (Zero-Knowledge Proof) Module
 * 
 * This module provides functions for generating and verifying zero-knowledge proofs
 * for the ZKPass authentication system using Circom circuits and zkSNARKs.
 * 
 * Enhanced with true zkSNARK implementation using snarkjs and Circom circuits.
 * Requirements: 1.2, 1.3, 1.6, 1.7, 8.2, 8.3
 */

// Integrated ZKP Service (recommended for new implementations)
export { 
  ZKPService, 
  zkpService,
  type ZKPServiceConfig,
  type AuthenticationRequest,
  type AuthenticationResponse,
  type ServiceMetrics
} from './zkpService';

// Individual ZKP services for advanced use cases
export { 
  ZKPProofGenerator, 
  ZKPError, 
  ZKPErrorCode,
  type ProofGenerationOptions,
  type ProofGenerationResult
} from './proofGenerator';

export { 
  ZKPProofVerifier, 
  VerificationError, 
  VerificationErrorCode,
  type VerificationResult,
  type VerificationOptions
} from './proofVerifier';

// Circuit management
export { CircuitManager } from './circuitManager';
export type { CircuitKeys, CircuitInputs, ZKProof, PublicSignals } from './circuitManager';

// Legacy compatibility functions (deprecated)
export { 
  generateProof, 
  generateProofWithDeviceKey, 
  prepareProofForVerification 
} from './proofGenerator';
export { verifyProof } from './proofVerifier';