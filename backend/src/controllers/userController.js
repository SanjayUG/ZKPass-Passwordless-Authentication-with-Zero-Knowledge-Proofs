// src/controllers/userController.js
import User from "../models/User.js";
import { registerUserOnChain, updateCredentialsOnChain, revokeCredentialsOnChain } from "../services/blockchainService.js";

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const registerUser = async (req, res) => {
  const { publicKey, ethereumAddress } = req.body;

  if (!publicKey || !ethereumAddress) {
    return res.status(400).json({ message: "Public key and Ethereum address are required" });
  }

  try {
    // Step 1: Register user on the blockchain
    await registerUserOnChain(ethereumAddress, publicKey);

    // Step 2: Save user to MongoDB
    const newUser = new User({ publicKey, ethereumAddress });
    await newUser.save();

    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error during registration:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Update or revoke user credentials
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateCredentials = async (req, res) => {
    const { ethereumAddress, newPublicKey, action } = req.body;
  
    if (!ethereumAddress || !action) {
      return res.status(400).json({ message: "Ethereum address and action are required" });
    }
  
    try {
      if (action === "update" && newPublicKey) {
        // Update credentials
        await updateCredentialsOnChain(ethereumAddress, newPublicKey);
        return res.status(200).json({ message: "Credentials updated successfully" });
      } else if (action === "revoke") {
        // Revoke credentials
        await revokeCredentialsOnChain(ethereumAddress);
        return res.status(200).json({ message: "Credentials revoked successfully" });
      } else {
        return res.status(400).json({ message: "Invalid action or missing new public key" });
      }
    } catch (error) {
      console.error("Error during credential management:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };