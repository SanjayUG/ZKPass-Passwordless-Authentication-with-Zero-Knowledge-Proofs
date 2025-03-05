// blockchain/contracts/AuthContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AuthContract {
    // Mapping to store user credentials
    mapping(address => string) public userCredentials;

    // Mapping to track registered public keys
    mapping(string => bool) public registeredPublicKeys;

    // Event to log when a user is registered
    event UserRegistered(address indexed user, string publicKey);

    // Event to log when credentials are updated
    event CredentialsUpdated(address indexed user, string newPublicKey);

    // Event to log when credentials are revoked
    event CredentialsRevoked(address indexed user);

    // Register a new user
    function registerUser(address user, string memory publicKey) public {
        

        // Ensure the publicKey is not already registered
        require(!registeredPublicKeys[publicKey], "Public key already registered");

        // Register the user
        userCredentials[user] = publicKey;
        registeredPublicKeys[publicKey] = true;

        // Emit event
        emit UserRegistered(user, publicKey);
    }

    // Update user credentials
    function updateCredentials(address user, string memory newPublicKey) public {
        // Ensure the user is registered
        require(bytes(userCredentials[user]).length != 0, "User not registered");

        // Ensure the new publicKey is not already registered
        require(!registeredPublicKeys[newPublicKey], "Public key already registered");

        // Remove the old publicKey from the registeredPublicKeys mapping
        registeredPublicKeys[userCredentials[user]] = false;

        // Update the user's credentials
        userCredentials[user] = newPublicKey;
        registeredPublicKeys[newPublicKey] = true;

        // Emit event
        emit CredentialsUpdated(user, newPublicKey);
    }

    // Revoke user credentials
    function revokeCredentials(address user) public {
        // Ensure the user is registered
        require(bytes(userCredentials[user]).length != 0, "User not registered");

        // Remove the publicKey from the registeredPublicKeys mapping
        registeredPublicKeys[userCredentials[user]] = false;

        // Delete the user's credentials
        delete userCredentials[user];

        // Emit event
        emit CredentialsRevoked(user);
    }

    // Check if a user is registered
    function isRegistered(address user) public view returns (bool) {
        return bytes(userCredentials[user]).length != 0;
    }
}