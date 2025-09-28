/**
 * ZKP (Zero-Knowledge Proof) Module
 * 
 * This module provides functions for generating and verifying zero-knowledge proofs
 * for the ZKPass authentication system.
 */

export { generateProof, generateProofWithDeviceKey, prepareProofForVerification } from './proofGenerator';
export { verifyProof } from './proofVerifier';