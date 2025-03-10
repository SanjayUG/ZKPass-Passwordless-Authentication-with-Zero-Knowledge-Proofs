import Pubkey from "../models/Pubkey.js";
import { generateKeys } from "../utils/keyGenerator.js";
import { registerUserOnChain, isPublicKeyRegisteredOnChain } from "../services/blockchainService.js";
import { generateProof, verifyProof } from "../services/zkpService.js";
import { buildPoseidon } from "circomlibjs";

/**
 * Register a new user
 */
export const registerUser = async (req, res) => {
  try {
    let publicKey, privateKey;
    let isKeyUnique = false;

    while (!isKeyUnique) {
      ({ publicKey, privateKey } = await generateKeys());

      const existingUser = await Pubkey.findOne({ publicKey });
      if (!existingUser) {
        isKeyUnique = true;
      }
    }

    const newUser = new Pubkey({ publicKey });
    await newUser.save();

    await registerUserOnChain(publicKey);

    res.status(201).json({ publicKey, privateKey });
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Login a user
 */
export const loginUser = async (req, res) => {
  try {
    const { privateKey } = req.body;

<<<<<<< HEAD
    // Generate the publicKey from the privateKey using Poseidon
    const poseidon = await buildPoseidon(); 
    const hash = poseidon([BigInt(privateKey)]);
    const publicKey = "0x" + poseidon.F.toString(hash);
=======
    const poseidon = await buildPoseidon();
    const privateKeyBigInt = BigInt(privateKey);
    const publicKey = "0x" + poseidon.F.toString(poseidon([privateKeyBigInt]));
>>>>>>> origin/coreBackendUpdate

    const isRegistered = await isPublicKeyRegisteredOnChain(publicKey);
    if (!isRegistered) {
      return res.status(400).json({ message: "User not registered" });
    }

    const { proof, publicSignals } = await generateProof(privateKey, publicKey);
    const isValidProof = await verifyProof(proof, publicSignals);

    if (!isValidProof) {
      return res.status(400).json({ message: "Invalid proof" });
    }

    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
