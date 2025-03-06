// src/utils/keyGenerator.js
import crypto from "crypto";

/**
 * Generate a public/private key pair
 * @returns {Object} - Public key and private key (0x-prefixed hex strings)
 */
export const generateKeys = () => {
  const privateKey = "0x" + crypto.randomBytes(32).toString("hex"); // 256-bit private key
  const publicKey = "0x" + crypto.createHash("sha256").update(privateKey.slice(2), "hex").digest("hex"); // Public key as hash of private key
  return { publicKey, privateKey };
};