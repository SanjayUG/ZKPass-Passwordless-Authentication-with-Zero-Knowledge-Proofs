import { randomBytes } from "crypto";
import { buildPoseidon } from "circomlibjs";

/**
 * Generate a public/private key pair using Poseidon hash
 * @returns {Object} - Public key and private key (0x-prefixed hex strings)
 */
export const generateKeys = async () => {
  const poseidon = await buildPoseidon();
  const privateKey = BigInt("0x" + randomBytes(32).toString("hex"));

  // Ensure proper hashing using Poseidon
  const publicKey = "0x" + poseidon.F.toString(poseidon([privateKey]));

  return { publicKey, privateKey: "0x" + privateKey.toString(16) };
};
