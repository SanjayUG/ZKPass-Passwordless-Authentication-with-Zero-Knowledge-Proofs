// src/services/blockchainService.js
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const { ETHEREUM_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS } = process.env;

// ABI for the AuthContract
const AUTH_CONTRACT_ABI = [
  "function registerUser(address user, string memory publicKey)",
  "function updateCredentials(address user, string memory newPublicKey)",
  "function revokeCredentials(address user)",
  "function isRegistered(address user) view returns (bool)",
];

// Initialize provider and signer
const provider = new ethers.JsonRpcProvider(ETHEREUM_RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Initialize contract
const authContract = new ethers.Contract(CONTRACT_ADDRESS, AUTH_CONTRACT_ABI, signer);

/**
 * Register a user on the blockchain
 * @param {string} userAddress - Ethereum address of the user
 * @param {string} publicKey - User's public key
 * @returns {Object} - Transaction receipt
 */
export const registerUserOnChain = async (userAddress, publicKey) => {
  try {
    const tx = await authContract.registerUser(userAddress, publicKey);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error("Error registering user on-chain:", error);
    throw new Error("Failed to register user on-chain");
  }
};

/**
 * Update user credentials on the blockchain
 * @param {string} userAddress - Ethereum address of the user
 * @param {string} newPublicKey - New public key
 * @returns {Object} - Transaction receipt
 */
export const updateCredentialsOnChain = async (userAddress, newPublicKey) => {
  try {
    const tx = await authContract.updateCredentials(userAddress, newPublicKey);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error("Error updating credentials on-chain:", error);
    throw new Error("Failed to update credentials on-chain");
  }
};

/**
 * Revoke user credentials on the blockchain
 * @param {string} userAddress - Ethereum address of the user
 * @returns {Object} - Transaction receipt
 */
export const revokeCredentialsOnChain = async (userAddress) => {
  try {
    const tx = await authContract.revokeCredentials(userAddress);
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error("Error revoking credentials on-chain:", error);
    throw new Error("Failed to revoke credentials on-chain");
  }
};

/**
 * Check if a user is registered on the blockchain
 * @param {string} userAddress - Ethereum address of the user
 * @returns {boolean} - True if the user is registered, false otherwise
 */
export const isUserRegisteredOnChain = async (userAddress) => {
  try {
    const isRegistered = await authContract.isRegistered(userAddress);
    return isRegistered;
  } catch (error) {
    console.error("Error checking user registration:", error);
    throw new Error("Failed to check user registration");
  }
};