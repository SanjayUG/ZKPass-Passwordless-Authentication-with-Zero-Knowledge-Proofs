// src/controllers/authController.js
import { verifyProof } from "../services/zkpService.js";
import { isUserRegisteredOnChain } from "../services/blockchainService.js";

/**
 * Authenticate a user using ZKP
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const loginUser = async (req, res) => {
  const { proof, publicSignals, ethereumAddress } = req.body;

  if (!proof || !publicSignals || !ethereumAddress) {
    return res.status(400).json({ message: "Proof, public signals, and Ethereum address are required" });
  }

  try {
    // Step 1: Verify ZKP
    const isValid = await verifyProof(proof, publicSignals);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid ZKP" });
    }

    // Step 2: Check if the user is registered on the blockchain
    const isRegistered = await isUserRegisteredOnChain(ethereumAddress);

    if (!isRegistered) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Verify a ZKP
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const verifyZKP = async (req, res) => {
  const { proof, publicSignals } = req.body;

  if (!proof || !publicSignals) {
    return res.status(400).json({ message: "Proof and public signals are required" });
  }

  try {
    const isValid = await verifyProof(proof, publicSignals);
    return res.status(200).json({ isValid });
  } catch (error) {
    console.error("Error during ZKP verification:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
