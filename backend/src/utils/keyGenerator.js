// src/utils/keyGenerator.js
import crypto from "crypto";
import { buildPoseidon } from "circomlibjs";

/**
 * Generate a public/private key pair
 * @returns {Object} - Public key and private key (0x-prefixed hex strings)
 */
export const generateKeys = async () => {
  const poseidon = await buildPoseidon(); // Initialize Poseidon
  const privateKey = "0x" + crypto.randomBytes(32).toString("hex"); // 256-bit private key

  // Compute Poseidon hash of the private key
  const hash = poseidon([BigInt(privateKey)]);
  const publicKey = "0x" + poseidon.F.toString(hash); // Convert hash to hex string

  return { publicKey, privateKey };
};