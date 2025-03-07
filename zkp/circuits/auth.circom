pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template Auth() {
    signal input secret;
    signal input hash;
    signal output verified;

    // Use Poseidon to hash the secret
    component hashChecker = Poseidon(1);
    hashChecker.inputs[0] <== secret;

    // Ensure that the computed hash matches the provided hash
    hashChecker.out === hash;

    verified <== 1;
}

component main = Auth();
