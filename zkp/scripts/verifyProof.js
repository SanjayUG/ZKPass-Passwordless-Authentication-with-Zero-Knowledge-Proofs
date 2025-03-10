const { groth16 } = require("snarkjs");
const fs = require("fs");

async function verifyProof() {
    // Load proof and public signals
    const proof = JSON.parse(fs.readFileSync("proofs/proof.json"));
    const publicSignals = JSON.parse(fs.readFileSync("proofs/publicSignals.json"));

    console.log("Proof:", proof);
    console.log("Public Signals:", publicSignals);

    // Load verification key
    const vKey = JSON.parse(fs.readFileSync("circuits/verification_key.json"));

    // Verify the proof
    const isValid = await groth16.verify(vKey, publicSignals, proof);
    console.log("Proof is valid:", isValid);
}

verifyProof().catch((error) => {
    console.error("Error verifying proof:", error);
});