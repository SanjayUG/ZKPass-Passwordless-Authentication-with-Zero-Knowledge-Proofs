import { useState } from 'react';
import '../styles/Auth.css';
import { authApi } from '../services/api';
import { setupDeviceKey, isBrowserSupported } from '../utils/deviceKeyUtils';

interface RegisterProps {
  onRegisterSuccess: (recoveryPhrase: string, deviceSetupSuccess?: boolean) => void;
}

const Register = ({ onRegisterSuccess }: RegisterProps) => {
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deviceKeySupported, setDeviceKeySupported] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous errors at the start of submission
    setError('');
    
    if (!uid.trim()) {
      setError('UID is required');
      return;
    }
    
    try {
      setLoading(true);
      
      let publicKeyJWK: JsonWebKey | undefined;
      let deviceSetupSuccess = false;

      let deviceKeyPair: { publicKey: CryptoKey; privateKey: CryptoKey; publicKeyJWK: JsonWebKey } | undefined;
      
      // Check if browser supports device keys
      if (isBrowserSupported()) {
        try {
          // Generate device key pair (but don't store it yet)
          const { deviceKeyManager } = await import('../services/deviceKeyManager');
          deviceKeyPair = await deviceKeyManager.generateDeviceKeyPair();
          publicKeyJWK = deviceKeyPair.publicKeyJWK;
        } catch (deviceError) {
          console.warn('Device key generation failed during registration:', deviceError);
          // Continue with registration even if device key setup fails
          setError('Device key setup failed, but registration will continue without device authentication');
        }
      } else {
        setDeviceKeySupported(false);
        console.warn('Browser does not support device key features');
      }

      // Register user with optional device key
      const data = await authApi.register(
        uid, 
        publicKeyJWK, 
        { 
          deviceName: getDeviceName(),
          userAgent: navigator.userAgent 
        }
      );
      
      console.log('Registration response:', data);
      
      // Explicit check for success before proceeding
      if (!data.success) {
        throw new Error('Registration failed');
      }
      
      if (data.deviceSetupFailed) {
        setError(`Registration successful, but ${data.deviceError || 'device setup failed'}`);
        deviceSetupSuccess = false;
      } else if (data.deviceId && deviceKeyPair) {
        // Now store the device key with the correct device ID from backend
        console.log('Storing device key with backend device ID:', data.deviceId);
        try {
          const { deviceKeyManager } = await import('../services/deviceKeyManager');
          await deviceKeyManager.storeDeviceKeyWithId(uid, deviceKeyPair.privateKey, data.deviceId);
          console.log('Device key stored successfully with correct device ID');
          deviceSetupSuccess = true;
        } catch (storeError) {
          console.error('Failed to store device key:', storeError);
          setError('Registration successful, but failed to store device key locally');
          deviceSetupSuccess = false;
        }
      }
      
      // Only call onRegisterSuccess when registration truly succeeds
      onRegisterSuccess(data.recoveryPhrase, deviceSetupSuccess);
    } catch (err) {
      // Handle all errors uniformly - set error state and do NOT call onRegisterSuccess
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      // Explicitly do NOT call onRegisterSuccess here
    } finally {
      // Always reset loading state to re-enable the form
      setLoading(false);
    }
  };

  const getDeviceName = (): string => {
    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Mobile')) {
      return 'Mobile Device';
    } else if (userAgent.includes('Tablet')) {
      return 'Tablet';
    } else {
      return 'Desktop Computer';
    }
  };

  return (
    <div className="auth-container">
      <h2>Register</h2>
      {!deviceKeySupported && (
        <div className="warning-message">
          Device key authentication is not supported in this browser. Registration will continue with basic authentication.
        </div>
      )}
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="uid">Create Unique Identifier (UID)</label>
          <input
            type="text"
            id="uid"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="Enter a unique identifier"
            disabled={loading}
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default Register;