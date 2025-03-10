// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract AuthContract {
    mapping(string => bool) private registeredKeys;

    function registerUser(string memory publicKey) public {
        registeredKeys[publicKey] = true;
    }

    function isPublicKeyRegistered(string memory publicKey) public view returns (bool) {
        return registeredKeys[publicKey];
    }
}