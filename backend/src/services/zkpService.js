// src/services/zkpService.js
import { groth16 } from "snarkjs";
import fs from "fs";
import path from "path";

// Correct paths to the zkp directory
const ZKP_DIR = path.join(process.cwd(), "../zkp"); // Go up one level to the root, then into zkp
const CIRCUITS_DIR = path.join(ZKP_DIR, "circuits/auth_js");
const PROOFS_DIR = path.join(ZKP_DIR, "proofs");

/**
 * Generate a ZKP proof for a given secret and hash
 * @param {string} secret - User's secret (privateKey)
 * @param {string} hash - Hash of the secret (publicKey)
 * @returns {Object} - Proof and public signals
 */
export const generateProof = async (secret, hash) => {
  try {
    const { proof, publicSignals } = await groth16.fullProve(
      { secret, hash },
      path.join(CIRCUITS_DIR, "auth.wasm"),
      path.join(ZKP_DIR, "circuits/auth_0001.zkey") // Correct path
    );

    // Save proof and public signals for later verification
    fs.writeFileSync(path.join(PROOFS_DIR, "proof.json"), JSON.stringify(proof));
    fs.writeFileSync(
      path.join(PROOFS_DIR, "publicSignals.json"),
      JSON.stringify(publicSignals)
    );

    return { proof, publicSignals };
  } catch (error) {
    console.error("Error generating proof:", error);
    throw new Error("Failed to generate proof");
  }
};

/**
 * Verify a ZKP proof
 * @param {Object} proof - The proof to verify
 * @param {Array} publicSignals - Public signals associated with the proof
 * @returns {boolean} - True if the proof is valid, false otherwise
 */
export const verifyProof = async (proof, publicSignals) => {
  try {
    const vKey = JSON.parse(
      fs.readFileSync(path.join(ZKP_DIR, "circuits/verification_key.json")) // Correct path
    );

    const isValid = await groth16.verify(vKey, publicSignals, proof);
    return isValid;
  } catch (error) {
    console.error("Error verifying proof:", error);
    throw new Error("Failed to verify proof");
  }
};