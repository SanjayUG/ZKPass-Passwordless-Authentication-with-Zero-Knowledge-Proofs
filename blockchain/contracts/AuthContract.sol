// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AuthContract {
    // Mapping to track registered public keys
    mapping(string => bool) public registeredPublicKeys;

    // Event to log when a user is registered
    event UserRegistered(string publicKey);

    // Register a new user
    function registerUser(string memory publicKey) public {
        // Ensure the publicKey is not already registered
        require(!registeredPublicKeys[publicKey], "Public key already registered");

        // Register the publicKey
        registeredPublicKeys[publicKey] = true;

        // Emit event
        emit UserRegistered(publicKey);
    }

    // Check if a publicKey is registered
    function isPublicKeyRegistered(string memory publicKey) public view returns (bool) {
        return registeredPublicKeys[publicKey];
    }
}