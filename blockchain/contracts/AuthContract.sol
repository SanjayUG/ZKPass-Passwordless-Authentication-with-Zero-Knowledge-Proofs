// blockchain/contracts/AuthContract.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AuthContract {
    // Mapping to store user credentials
    mapping(address => string) public userCredentials;

    // Event to log when a user is registered
    event UserRegistered(address indexed user, string publicKey);

    // Event to log when credentials are updated
    event CredentialsUpdated(address indexed user, string newPublicKey);

    // Event to log when credentials are revoked
    event CredentialsRevoked(address indexed user);

    // Register a new user
    function registerUser(address user, string memory publicKey) public {
        require(bytes(userCredentials[user]).length == 0, "User already registered");
        userCredentials[user] = publicKey;
        emit UserRegistered(user, publicKey);
    }

    // Update user credentials
    function updateCredentials(address user, string memory newPublicKey) public {
        require(bytes(userCredentials[user]).length != 0, "User not registered");
        userCredentials[user] = newPublicKey;
        emit CredentialsUpdated(user, newPublicKey);
    }

    // Revoke user credentials
    function revokeCredentials(address user) public {
        require(bytes(userCredentials[user]).length != 0, "User not registered");
        delete userCredentials[user];
        emit CredentialsRevoked(user);
    }

    // Check if a user is registered
    function isRegistered(address user) public view returns (bool) {
        return bytes(userCredentials[user]).length != 0;
    }
}