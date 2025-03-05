// src/utils/keyGenerator.js
import crypto from "crypto";

/**
 * Generate a public/private key pair
 * @returns {Object} - Public key and private key
 */
export const generateKeys = () => {
  const privateKey = crypto.randomBytes(32).toString("hex"); // 256-bit private key
  const publicKey = crypto.createHash("sha256").update(privateKey).digest("hex"); // Public key as hash of private key
  return { publicKey, privateKey };
};