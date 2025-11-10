const API_BASE_URL = 'http://localhost:3001/api';

export const authApi = {
  /**
   * Register a new user with UID and optional device key
   */
  register: async (
    uid: string, 
    publicKeyJWK?: JsonWebKey, 
    deviceInfo?: { deviceName?: string; userAgent?: string }
  ): Promise<{ 
    success: boolean; 
    recoveryPhrase: string; 
    deviceId?: string;
    deviceSetupFailed?: boolean;
    deviceError?: string;
  }> => {
    const requestBody: any = { uid };
    
    // Include device key if provided
    if (publicKeyJWK) {
      requestBody.publicKeyJWK = publicKeyJWK;
      requestBody.deviceInfo = deviceInfo;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      // Parse response body
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, throw generic error
        throw new Error('Registration failed. Please try again.');
      }
      
      // Check if response indicates an error
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed. Please try again.');
      }
      
      return data;
    } catch (error) {
      // Re-throw Error objects as-is, wrap other errors
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Registration failed. Please try again.');
    }
  },
  
  /**
   * Login with UID - proof generation handled by backend
   */
  login: async (uid: string): Promise<{ success: boolean; uid: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uid }),
      });
      
      // Parse response body
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, throw generic error
        throw new Error('Login failed. Please try again.');
      }
      
      // Check if response indicates an error
      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please try again.');
      }
      
      return data;
    } catch (error) {
      // Re-throw Error objects as-is, wrap other errors
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Login failed. Please try again.');
    }
  },
  
  /**
   * Verify recovery phrase and derive UID
   */
  verifyRecovery: async (recoveryPhrase: string): Promise<{ success: boolean; uid: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recoveryPhrase }),
      });
      
      // Parse response body
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, throw generic error
        throw new Error('Recovery failed. Please try again.');
      }
      
      // Check if response indicates an error
      if (!response.ok) {
        throw new Error(data.message || 'Recovery failed. Please try again.');
      }
      
      return data;
    } catch (error) {
      // Re-throw Error objects as-is, wrap other errors
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Recovery failed. Please try again.');
    }
  },
};