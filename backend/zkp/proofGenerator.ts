import crypto from 'crypto';

/**
 * Generate a ZKP proof using device key signature as secret input
 * This is the secure method that replaces legacy UID-based key derivation
 * 
 * @param uid User's unique identifier
 * @param deviceSignature Device signature used as secret input (NOT a derived private key)
 * @returns The generated proof
 */
export const generateProof = async (uid: string, deviceSignature: string): Promise<string> => {
  try {
    // 1. Split the device signature into two halves
    const halfLength = Math.floor(deviceSignature.length / 2);
    const firstHalf = deviceSignature.substring(0, halfLength);
    const secondHalf = deviceSignature.substring(halfLength);
    
    // Hash each half separately
    const hashedFirstHalf = crypto.createHash('sha256').update(firstHalf).digest('hex');
    const hashedSecondHalf = crypto.createHash('sha256').update(secondHalf).digest('hex');
    
    // 2. Concatenate: hashedFirstHalf + uid + hashedSecondHalf
    const combinedString = hashedFirstHalf + uid + hashedSecondHalf;
    
    // 3. Hash the combined string to create the ZKP proof
    const proof = crypto.createHash('sha256').update(combinedString).digest('hex');
    
    return proof;
  } catch (error) {
    console.error('Error generating ZKP proof with device signature:', error);
    throw new Error('Failed to generate ZKP proof with device signature');
  }
};

/**
 * Generate a ZKP proof using device key signature as the secret input
 * This replaces the derived private key with a device-specific signature
 * 
 * @param uid User's unique identifier
 * @param deviceSignature Signature generated using device private key
 * @returns The generated proof
 */
export const generateProofWithDeviceKey = async (uid: string, deviceSignature: string): Promise<string> => {
  try {
    // Use the device signature as the "private key" input to the existing algorithm
    // This ensures the proof is tied to the specific device that generated the signature
    return await generateProof(uid, deviceSignature);
  } catch (error) {
    console.error('Error generating ZKP proof with device key:', error);
    throw new Error('Failed to generate ZKP proof with device key');
  }
};

/**
 * Legacy ZKP generation - DEPRECATED AND REMOVED
 * This function has been removed for security reasons
 */
export const generateProofWithLegacyKey = async (uid: string): Promise<string> => {
  throw new Error('Legacy ZKP generation has been disabled for security reasons. Use device key authentication instead.');
};

/**
 * Prepare proof data for blockchain verification
 * This function formats the proof and uid in a way that can be sent to the blockchain
 * 
 * @param proof The generated proof
 * @param uid User's unique identifier
 * @returns Formatted proof data for blockchain verification
 */
export const prepareProofForVerification = (proof: string, uid: string): { proof: string, uid: string } => {
  return { proof, uid };
};