/**
 * Recovery phrase utilities
 * Shared logic for recovery phrase verification
 */

import crypto from 'crypto';
import { WORD_MAP } from './wordMap';

// Legacy SECRET_SALT removed for security reasons
// Recovery phrase verification no longer uses shared secrets

/**
 * Derive UID from recovery phrase
 */
export const verifyRecoveryPhrase = (recoveryPhrase: string): string => {
  const words = recoveryPhrase.split(' ');
  let combinedString = '';
  
  for (const word of words) {
    let foundChar = '';
    // Search WORD_MAP to find which character's word list contains this word
    for (const [char, wordList] of Object.entries(WORD_MAP)) {
      const index = wordList.indexOf(word);
      if (index !== -1) {
        foundChar = char;
        break;
      }
    }
    combinedString += foundChar;
  }
  
  // The first 3 characters are from the private key
  const priKeyChars = combinedString.substring(0, 3);
  
  // The last 3 characters are from the salt
  const saltChars = combinedString.substring(combinedString.length - 3);
  
  // The middle part is the UID
  const uid = combinedString.substring(3, combinedString.length - 3);
  
  if (!uid) {
    throw new Error('Invalid recovery phrase: could not derive UID');
  }
  
  return uid;
};

/**
 * Legacy private key derivation - DEPRECATED AND REMOVED
 * This function has been removed for security reasons as it used a shared SECRET_SALT
 */
export const derivePrivateKey = (uid: string): string => {
  throw new Error('Legacy private key derivation has been disabled for security reasons. Use device key authentication instead.');
};