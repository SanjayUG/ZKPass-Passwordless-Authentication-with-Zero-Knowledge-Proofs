// zkp/utils/zkpHelpers.js
import { groth16 } from "snarkjs";
import fs from "fs";
import path from "path";

const CIRCUITS_DIR = path.join(process.cwd(), "circuits");
const PROOFS_DIR = path.join(process.cwd(), "proofs");

/**
 * Generate a ZKP proof
 * @param {string} secret - User's secret
 * @param {string} hash - Hash of the secret
 * @returns {Object} - Proof and public signals
 */
export const generateProof = async (secret, hash) => {
  try {
    const { proof, publicSignals } = await groth16.fullProve(
      { secret, hash },
      path.join(CIRCUITS_DIR, "auth.wasm"),
      path.join(CIRCUITS_DIR, "auth.zkey")
    );

    // Save proof and public signals
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
      fs.readFileSync(path.join(CIRCUITS_DIR, "verification_key.json"))
    );

    const isValid = await groth16.verify(vKey, publicSignals, proof);
    return isValid;
  } catch (error) {
    console.error("Error verifying proof:", error);
    throw new Error("Failed to verify proof");
  }
};