// src/controllers/authController.js
import Pubkey from "../models/Pubkey.js";
import { generateKeys } from "../utils/keyGenerator.js";
import { registerUserOnChain, isPublicKeyRegisteredOnChain } from "../services/blockchainService.js";
import { generateProof, verifyProof } from "../services/zkpService.js";
import crypto from "crypto";

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const registerUser = async (req, res) => {
  try {
    let publicKey, privateKey;
    let isKeyUnique = false;

    // Generate a unique public-private key pair
    while (!isKeyUnique) {
      ({ publicKey, privateKey } = generateKeys());

      // Check if the publicKey already exists in the database
      const existingUser = await Pubkey.findOne({ publicKey });
      if (!existingUser) {
        isKeyUnique = true;
      }
    }

    // Save the new user to MongoDB
    const newUser = new Pubkey({ publicKey });
    await newUser.save();

    // Register the user on the blockchain
    await registerUserOnChain(publicKey);

    // Return the keys to the user
    res.status(201).json({ publicKey, privateKey });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Login a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const loginUser = async (req, res) => {
  try {
    const { privateKey } = req.body;

    // Generate the publicKey from the privateKey
    const publicKey = "0x" + crypto.createHash("sha256").update(privateKey.slice(2), "hex").digest("hex");

    // Check if the publicKey is registered on the blockchain
    const isRegistered = await isPublicKeyRegisteredOnChain(publicKey);
    if (!isRegistered) {
      return res.status(400).json({ message: "User not registered" });
    }

    // Generate a ZKP proof for the privateKey
    const { proof, publicSignals } = await generateProof(privateKey, publicKey);

    // Verify the ZKP proof
    const isValidProof = await verifyProof(proof, publicSignals);
    if (!isValidProof) {
      return res.status(400).json({ message: "Invalid proof" });
    }

    // Login successful
    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};