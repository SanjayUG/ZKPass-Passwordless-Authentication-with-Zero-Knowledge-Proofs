// zkp/scripts/generateProof.js
const { groth16 } = require("snarkjs");
const fs = require("fs");
const path = require("path");
const { buildPoseidon } = require("circomlibjs");

const CIRCUITS_DIR = path.join(__dirname, "..", "circuits"); // Adjust path as needed
const PROOFS_DIR = path.join(__dirname, "..", "proofs"); // Adjust path as needed

/**
 * Generate a ZKP proof
 * @param {string} secret - User's secret
 * @param {string} hash - Hash of the secret
 */
const generateProof = async (secret, hash) => {
  try {
    const { proof, publicSignals } = await groth16.fullProve(
      { secret, hash },
      path.join(CIRCUITS_DIR, "auth_js", "auth.wasm"), // Adjusted path
      path.join(CIRCUITS_DIR, "auth_0001.zkey") // Adjusted path
    );

    // Save proof and public signals
    fs.writeFileSync(path.join(PROOFS_DIR, "proof.json"), JSON.stringify(proof));
    fs.writeFileSync(
      path.join(PROOFS_DIR, "publicSignals.json"),
      JSON.stringify(publicSignals)
    );

    console.log("Proof generated successfully!");
    console.log("Proof:", proof);
    console.log("Public Signals:", publicSignals);
  } catch (error) {
    console.error("Error generating proof:", error);
  }
};

// Example usage
(async () => {
  const poseidon = await buildPoseidon();
  const secret = "0x3e65af30a63e945e99b730d9fadaaab698c5663ba314fa3ba2a34fc325411252"; // Example private key
  const hash = poseidon.F.toString(poseidon([BigInt(secret)])); // Compute Poseidon hash
  generateProof(secret, hash).catch((error) => {
    console.error("Error:", error);
  });
})();