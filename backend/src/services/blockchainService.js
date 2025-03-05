import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const { ETHEREUM_RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS } = process.env;

// ABI for the AuthContract
const AUTH_CONTRACT_ABI = [
  "function registerUser(address user, string memory publicKey)",
  "function isRegistered(address user) view returns (bool)",
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

    const tx = await authContract.registerUser(signer.address, publicKey);
    const receipt = await tx.wait();

    console.log("User registered on-chain:", receipt);
    return receipt;
  } catch (error) {
    console.error("Error registering user on-chain:", error);
    throw new Error("Failed to register user on-chain");
  }
};

/**
 * Check if a user is registered on the blockchain
 * @param {string} publicKey - User's public key
 * @returns {boolean} - True if the user is registered, false otherwise
 */
export const isUserRegisteredOnChain = async (publicKey) => {
  try {
    const isRegistered = await authContract.isRegistered(signer.address);
    return isRegistered;
  } catch (error) {
    console.error("Error checking user registration:", error);
    throw new Error("Failed to check user registration");
  }
};