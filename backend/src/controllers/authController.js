// src/controllers/authController.js
import Pubkey from "../models/Pubkey.js";
import { generateKeys } from "../utils/keyGenerator.js";
import { registerUserOnChain, isUserRegisteredOnChain } from "../services/blockchainService.js";
import { generateProof, verifyProof } from "../services/zkpService.js";

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
 * Authenticate a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const loginUser = async (req, res) => {
  const { publicKey, privateKey } = req.body;

  if (!publicKey || !privateKey) {
    return res.status(400).json({ message: "Public key and private key are required" });
  }

  try {
    // Step 1: Check if the user is registered on the blockchain
    const isRegistered = await isUserRegisteredOnChain(publicKey);

    if (!isRegistered) {
      return res.status(404).json({ message: "User not found" });
    }

    // Step 2: Generate ZKP proof
    const { proof, publicSignals } = await generateProof(privateKey, publicKey);

    // Step 3: Verify ZKP proof
    const isValid = await verifyProof(proof, publicSignals);

    if (isValid) {
      return res.status(200).json({ message: "Login successful" });
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};