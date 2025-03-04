// zkp/scripts/verifyProof.js
const { groth16 } = require("snarkjs");
const fs = require("fs");
const path = require("path");

const CIRCUITS_DIR = path.join(__dirname, "..", "circuits"); // Adjust path as needed
const PROOFS_DIR = path.join(__dirname, "..", "proofs"); // Adjust path as needed

/**
 * Verify a ZKP proof
 */
const verifyProof = async () => {
  try {
    const proof = JSON.parse(fs.readFileSync(path.join(PROOFS_DIR, "proof.json")));
    const publicSignals = JSON.parse(
      fs.readFileSync(path.join(PROOFS_DIR, "publicSignals.json"))
    );

    const vKey = JSON.parse(
      fs.readFileSync(path.join(CIRCUITS_DIR, "verification_key.json"))
    );

    const isValid = await groth16.verify(vKey, publicSignals, proof);
    console.log("Proof is valid:", isValid);
  } catch (error) {
    console.error("Error verifying proof:", error);
  }
};

// Example usage
verifyProof().catch((error) => {
  console.error("Error verifying proof:", error);
});