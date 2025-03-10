const { groth16 } = require("snarkjs");
const fs = require("fs");
const circomlibjs = require("circomlibjs");

// Compute Poseidon hash
async function computeHash(secret) {
    const poseidon = await circomlibjs.buildPoseidon(); // Initialize Poseidon
    const hash = poseidon([BigInt(secret)]); // Compute Poseidon hash
    return poseidon.F.toString(hash); // Convert hash to a string representation of the field element
}

async function generateProof() {
    const secret = "123456"; // Secret input (as string)
    const hash = await computeHash(secret); // Compute hash as a string

    console.log("Secret:", secret);
    console.log("Computed Hash:", hash);

    const { proof, publicSignals } = await groth16.fullProve(
        { secret: secret, hash: hash }, // Inputs as strings
        "circuits/auth_js/auth.wasm",  // Compiled circuit
        "circuits/auth_0001.zkey"      // Proving key
    );

    console.log("Proof:", proof);
    console.log("Public Signals:", publicSignals);

<<<<<<< HEAD
// Example usage
(async () => {
  const poseidon = await buildPoseidon();
  const secret = "0x3e65af30a63e945e99b730d9fadaaab698c5663ba314fa3ba2a34fc325411252"; // Example private key
  const hash = poseidon.F.toString(poseidon([BigInt(secret)])); // Compute Poseidon hash
  generateProof(secret, hash).catch((error) => {
    console.error("Error:", error);
  });
})();
=======
    // Save proof and public signals
    fs.writeFileSync("proofs/proof.json", JSON.stringify(proof));
    fs.writeFileSync("proofs/publicSignals.json", JSON.stringify(publicSignals));
}

generateProof().catch((error) => {
    console.error("Error generating proof:", error);
});
>>>>>>> origin/coreBackendUpdate
