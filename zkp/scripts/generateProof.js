
// zkp/scripts/generateProof.js
const { groth16 } = require("snarkjs");
const fs = require("fs");
const path = require("path");

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
const privateKey = "123456"; // User's privateKey
const hash = "3607056778794995795434385085847334626017449707154072104308864676240828390282"; // Hash of the privateKey
generateProof(privateKey, hash).catch((error) => {
  console.error("Error:", error);
});