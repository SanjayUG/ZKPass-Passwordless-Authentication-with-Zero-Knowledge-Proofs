import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Blockchain configuration
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const BLOCKCHAIN_RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';

// ABI for the ZKPassRegistry contract
const CONTRACT_ABI = [
  'function registerUID(string memory uid) public',
  'function checkUID(string memory uid) public view returns (bool)',
  'function registerDevice(string memory uid, string memory deviceId, string memory publicKeyHash) public',
  'function revokeDevice(string memory uid, string memory deviceId) public',
  'function isDeviceActive(string memory uid, string memory deviceId) public view returns (bool)',
  'function getActiveDevices(string memory uid) public view returns (string[] memory)',
];

/**
 * Get provider and contract instance
 */
const getContract = async () => {
  try {
    // Create provider
    const provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC_URL);
    
    // Get signer (for transactions that modify state)
    const signer = await provider.getSigner();
    
    // Create contract instance
    const contract = new ethers.Contract(CONTRACT_ADDRESS || '', CONTRACT_ABI, signer);
    
    return { provider, contract };
  } catch (error) {
    console.error('Error connecting to blockchain:', error);
    throw new Error('Failed to connect to blockchain');
  }
};

/**
 * Store UID on blockchain
 */
export const storeUIDOnBlockchain = async (uid: string): Promise<boolean> => {
  try {
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured. Cannot store UID on blockchain.');
    }

    const { contract } = await getContract();
    
    // Register UID on blockchain
    const tx = await contract.registerUID(uid);
    await tx.wait();
    
    return true;
  } catch (error) {
    console.error('Error storing UID on blockchain:', error);
    throw new Error('Failed to store UID on blockchain');
  }
};

/**
 * Check if UID exists on blockchain
 */
export const checkUIDExists = async (uid: string): Promise<boolean> => {
  try {
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured. Cannot check UID on blockchain.');
    }

    const { contract } = await getContract();
    
    // Check if UID exists
    const exists = await contract.checkUID(uid);
    
    return exists;
  } catch (error) {
    console.error('Error checking UID on blockchain:', error);
    throw new Error('Failed to check UID on blockchain');
  }
};
/**
 * Register a device on blockchain
 */
export const registerDeviceOnBlockchain = async (uid: string, deviceId: string, publicKeyHash: string): Promise<boolean> => {
  try {
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured. Cannot register device on blockchain.');
    }

    const { contract } = await getContract();
    
    // Register device on blockchain
    const tx = await contract.registerDevice(uid, deviceId, publicKeyHash);
    await tx.wait();
    
    return true;
  } catch (error) {
    console.error('Error registering device on blockchain:', error);
    throw new Error('Failed to register device on blockchain');
  }
};

/**
 * Revoke a device on blockchain
 */
export const revokeDeviceOnBlockchain = async (uid: string, deviceId: string): Promise<boolean> => {
  try {
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured. Cannot revoke device on blockchain.');
    }

    const { contract } = await getContract();
    
    // Revoke device on blockchain
    const tx = await contract.revokeDevice(uid, deviceId);
    await tx.wait();
    
    return true;
  } catch (error) {
    console.error('Error revoking device on blockchain:', error);
    throw new Error('Failed to revoke device on blockchain.');
  }
};

/**
 * Check if a device is active on blockchain
 */
export const isDeviceActiveOnBlockchain = async (uid: string, deviceId: string): Promise<boolean> => {
  try {
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured. Cannot check device on blockchain.');
    }

    const { contract } = await getContract();
    
    // Check if device is active
    const isActive = await contract.isDeviceActive(uid, deviceId);
    return isActive;
  } catch (error) {
    console.error('Error checking device on blockchain:', error);
    throw new Error('Failed to check device on blockchain');
  }
};

/**
 * Get all active devices for a UID from blockchain
 */
export const getActiveDevicesFromBlockchain = async (uid: string): Promise<string[]> => {
  try {
    if (!CONTRACT_ADDRESS) {
      throw new Error('Contract address not configured. Cannot get devices from blockchain.');
    }

    const { contract } = await getContract();
    
    // Get active devices
    const devices = await contract.getActiveDevices(uid);
    return devices;
  } catch (error) {
    console.error('Error getting devices from blockchain:', error);
    throw new Error('Failed to get devices from blockchain');
  }
};