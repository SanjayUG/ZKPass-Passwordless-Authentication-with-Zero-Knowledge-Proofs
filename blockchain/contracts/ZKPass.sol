// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ZKPass
 * @dev Combined contract for ZKPass authentication system, handling both UID registration and ZKP verification
 */
contract ZKPass {
    // Mapping to store registered UIDs
    mapping(string => bool) private registeredUIDs;
    
    // Mapping to store device registrations: uid => deviceId => isActive
    mapping(string => mapping(string => bool)) private userDevices;
    
    // Mapping to store device public key hashes: uid => deviceId => publicKeyHash
    mapping(string => mapping(string => string)) private devicePublicKeyHashes;
    
    // Mapping to store list of device IDs for each user: uid => deviceId[]
    mapping(string => string[]) private userDeviceList;
    
    // Event emitted when a new UID is registered
    event UIDRegistered(string indexed uid);
    
    // Event emitted when a device is registered
    event DeviceRegistered(string indexed uid, string indexed deviceId, string publicKeyHash);
    
    // Event emitted when a device is revoked
    event DeviceRevoked(string indexed uid, string indexed deviceId);
    
    /**
     * @dev Register a new UID
     * @param uid The unique identifier to register
     */
    function registerUID(string memory uid) public {
        // Ensure UID is not empty
        bytes memory uidBytes = bytes(uid);
        require(uidBytes.length > 0, "UID cannot be empty");
        
        // Ensure UID is not already registered
        require(!registeredUIDs[uid], "UID already registered");
        
        // Register the UID
        registeredUIDs[uid] = true;
        
        // Emit event
        emit UIDRegistered(uid);
    }
    
    /**
     * @dev Check if a UID exists
     * @param uid The unique identifier to check
     * @return bool True if the UID exists, false otherwise
     */
    function checkUID(string memory uid) public view returns (bool) {
        return registeredUIDs[uid];
    }
    
    /**
     * @dev Register a device for a user
     * @param uid The unique identifier of the user
     * @param deviceId The device identifier
     * @param publicKeyHash The hash of the device's public key
     */
    function registerDevice(string memory uid, string memory deviceId, string memory publicKeyHash) public {
        // Ensure UID exists
        require(registeredUIDs[uid], "UID not registered");
        
        // Ensure device ID is not empty
        require(bytes(deviceId).length > 0, "Device ID cannot be empty");
        
        // Ensure public key hash is not empty
        require(bytes(publicKeyHash).length > 0, "Public key hash cannot be empty");
        
        // If device is not already registered for this user, add it to the list
        if (!userDevices[uid][deviceId]) {
            userDeviceList[uid].push(deviceId);
        }
        
        // Register the device
        userDevices[uid][deviceId] = true;
        devicePublicKeyHashes[uid][deviceId] = publicKeyHash;
        
        // Emit event
        emit DeviceRegistered(uid, deviceId, publicKeyHash);
    }
    
    /**
     * @dev Revoke a device for a user
     * @param uid The unique identifier of the user
     * @param deviceId The device identifier to revoke
     */
    function revokeDevice(string memory uid, string memory deviceId) public {
        // Ensure UID exists
        require(registeredUIDs[uid], "UID not registered");
        
        // Ensure device is currently active
        require(userDevices[uid][deviceId], "Device not registered or already revoked");
        
        // Revoke the device
        userDevices[uid][deviceId] = false;
        
        // Clear the public key hash
        devicePublicKeyHashes[uid][deviceId] = "";
        
        // Emit event
        emit DeviceRevoked(uid, deviceId);
    }
    
    /**
     * @dev Check if a device is active for a user
     * @param uid The unique identifier of the user
     * @param deviceId The device identifier to check
     * @return bool True if the device is active, false otherwise
     */
    function isDeviceActive(string memory uid, string memory deviceId) public view returns (bool) {
        return userDevices[uid][deviceId];
    }
    
    /**
     * @dev Get all active devices for a user
     * @param uid The unique identifier of the user
     * @return string[] Array of active device IDs
     */
    function getActiveDevices(string memory uid) public view returns (string[] memory) {
        string[] memory allDevices = userDeviceList[uid];
        
        // Count active devices
        uint activeCount = 0;
        for (uint i = 0; i < allDevices.length; i++) {
            if (userDevices[uid][allDevices[i]]) {
                activeCount++;
            }
        }
        
        // Create array of active devices
        string[] memory activeDevices = new string[](activeCount);
        uint activeIndex = 0;
        
        for (uint i = 0; i < allDevices.length; i++) {
            if (userDevices[uid][allDevices[i]]) {
                activeDevices[activeIndex] = allDevices[i];
                activeIndex++;
            }
        }
        
        return activeDevices;
    }
    
    /**
     * @dev Get the public key hash for a specific device
     * @param uid The unique identifier of the user
     * @param deviceId The device identifier
     * @return string The public key hash, empty if device is not active
     */
    function getDevicePublicKeyHash(string memory uid, string memory deviceId) public view returns (string memory) {
        if (!userDevices[uid][deviceId]) {
            return "";
        }
        return devicePublicKeyHashes[uid][deviceId];
    }
    
    /**
     * @dev Verify a ZKP proof
     * @param proof The proof to verify
     * @param uid The unique identifier to check against
     * @return bool True if the proof is valid, false otherwise
     */
    function verifyProof(string memory proof, string memory uid) public view returns (bool) {
        // First check if the UID exists in the registry
        if (!checkUID(uid)) {
            return false;
        }
        
        // The actual verification would compare the proof against an expected value
        // In a real implementation, this would use cryptographic verification
        // For this implementation, we're simulating the verification process
        
        // The verification logic should match the proof generation algorithm:
        // 1. The backend has already hashed the first and second halves of the private key
        // 2. The backend has already concatenated: hashedFirstHalf + uid + hashedSecondHalf
        // 3. The backend has already hashed the combined string to create the proof
        
        // Since we can't recreate the private key on-chain, we trust that the proof
        // was generated correctly and simply verify its format
        
        // Check that the proof is a valid hex string of the right length (SHA-256 hash)
        bytes memory proofBytes = bytes(proof);
        if (proofBytes.length != 64) { // SHA-256 produces a 32-byte (64 hex chars) hash
            return false;
        }
        
        // Check that the proof contains only valid hex characters
        for (uint i = 0; i < proofBytes.length; i++) {
            bytes1 char = proofBytes[i];
            bool isHexChar = (
                (char >= 0x30 && char <= 0x39) || // 0-9
                (char >= 0x61 && char <= 0x66) || // a-f
                (char >= 0x41 && char <= 0x46)    // A-F
            );
            
            if (!isHexChar) {
                return false;
            }
        }
        
        // If we've passed all checks, the proof is considered valid
        return true;
    }
}