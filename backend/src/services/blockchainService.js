// src/services/blockchainService.js
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const { ETHEREUM_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS } = process.env;

// ABI for the AuthContract
const AUTH_CONTRACT_ABI = [
  "function registerUser(string memory publicKey)",
  "function isPublicKeyRegistered(string memory publicKey) view returns (bool)",
];

// Initialize provider and signer
const provider = new ethers.JsonRpcProvider(ETHEREUM_RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Initialize contract
const authContract = new ethers.Contract(CONTRACT_ADDRESS, AUTH_CONTRACT_ABI, signer);

/**
 * Register a user on the blockchain
 * @param {string} publicKey - User's public key
 * @returns {Object} - Transaction receipt
 */
export const registerUserOnChain = async (publicKey) => {
  try {
    console.log("Registering user on-chain with publicKey:", publicKey);

    const tx = await authContract.registerUser(publicKey);
    const receipt = await tx.wait();

    console.log("User registered on-chain:", receipt);
    return receipt;
  } catch (error) {
    console.error("Error registering user on-chain:", error);
    throw new Error("Failed to register user on-chain");
  }
};

/**
 * Check if a publicKey is registered on the blockchain
 * @param {string} publicKey - User's public key
 * @returns {boolean} - True if the publicKey is registered, false otherwise
 */
export const isPublicKeyRegisteredOnChain = async (publicKey) => {
  try {
    const isRegistered = await authContract.isPublicKeyRegistered(publicKey);
    return isRegistered;
  } catch (error) {
    console.error("Error checking publicKey registration:", error);
    throw new Error("Failed to check publicKey registration");
  }
};