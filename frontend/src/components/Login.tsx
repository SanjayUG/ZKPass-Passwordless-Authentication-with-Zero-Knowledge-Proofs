import { useState } from 'react';
import { deviceAuthService } from '../services/deviceAuthService';
import { migrationService } from '../services/migrationService';
import MigrationPrompt from './MigrationPrompt';
import '../styles/Auth.css';
import '../styles/MigrationPrompt.css';

interface LoginProps {
  onLoginSuccess: (uid: string) => void;
  onForgotUID: () => void;
}

const Login = ({ onLoginSuccess, onForgotUID }: LoginProps) => {
  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false);
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [migrationUid, setMigrationUid] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!uid.trim()) {
      setError('UID is required');
      return;
    }
    
    try {
      setLoading(true);
      
      // Check migration status first
      const migrationStatus = await migrationService.checkMigrationStatus(uid);
      
      // Check if UID exists on blockchain
      if (!migrationStatus.hasLegacyAuth && !migrationStatus.hasDeviceKey) {
        setError('UID not found. Please check your UID or register a new account.');
        setLoading(false);
        return;
      }
      
      if (migrationStatus.needsMigration) {
        // User exists in legacy system but needs migration
        setMigrationUid(uid);
        setShowMigrationPrompt(true);
        setLoading(false);
        return;
      }
      
      // Check if device has a stored device key
      const hasDeviceKey = await deviceAuthService.hasDeviceKey(uid);
      
      if (hasDeviceKey) {
        // Device is registered - authenticate using device key
        await authenticateWithDeviceKey(uid);
      } else {
        // No device key found - trigger new device authorization flow
        setShowRecoveryPhrase(true);
        setLoading(false);
      }
    } catch (err) {
      // Check if the error was handled by authenticateWithDeviceKey
      const error = err as Error & { requiresRecovery?: boolean; errorCode?: string };
      
      if (error.requiresRecovery || error.errorCode === 'NO_DEVICES_REGISTERED') {
        // Error was already handled by showing recovery form
        return;
      }
      
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  };

  const authenticateWithDeviceKey = async (uid: string) => {
    try {
      // Generate ZKP proof using device key and authenticate
      const result = await deviceAuthService.authenticateWithDevice(uid);
      
      if (result.success) {
        onLoginSuccess(uid);
      } else {
        throw new Error(result.message || 'Authentication failed');
      }
    } catch (err) {
      // Check if this is a device revocation error
      const error = err as Error & { requiresRecovery?: boolean; errorCode?: string };
      
      if (error.requiresRecovery && error.errorCode === 'DEVICE_NOT_AUTHORIZED') {
        // Device was revoked - automatically show recovery phrase form
        setShowRecoveryPhrase(true);
        setError('This device has been revoked. Please enter your recovery phrase to re-authorize it.');
        setLoading(false);
        return;
      } else if (error.errorCode === 'NO_DEVICES_REGISTERED') {
        // No devices registered - show recovery phrase form
        setShowRecoveryPhrase(true);
        setError('No devices are registered for this account. Please enter your recovery phrase to authorize this device.');
        setLoading(false);
        return;
      }
      
      // For other errors, throw normally
      throw new Error(err instanceof Error ? err.message : 'Device authentication failed');
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!recoveryPhrase.trim()) {
      setError('Recovery phrase is required');
      return;
    }
    
    try {
      setLoading(true);
      
      // Authorize new device and authenticate
      const result = await deviceAuthService.authorizeAndAuthenticate(uid, recoveryPhrase);
      
      if (result.success) {
        onLoginSuccess(uid);
      } else {
        throw new Error(result.message || 'Device authorization failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Device authorization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowRecoveryPhrase(false);
    setRecoveryPhrase('');
    setError('');
  };

  const handleMigrationComplete = (migratedUid: string) => {
    setShowMigrationPrompt(false);
    setMigrationUid('');
    onLoginSuccess(migratedUid);
  };

  const handleMigrationCancel = () => {
    setShowMigrationPrompt(false);
    setMigrationUid('');
    setError('');
  };

  if (showMigrationPrompt) {
    return (
      <MigrationPrompt
        uid={migrationUid}
        onMigrationComplete={handleMigrationComplete}
        onCancel={handleMigrationCancel}
      />
    );
  }

  if (showRecoveryPhrase) {
    return (
      <div className="auth-container">
        <h2>Authorize New Device</h2>
        <p>This device is not authorized. Please enter your recovery phrase to authorize it.</p>
        <form onSubmit={handleRecoverySubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="recoveryPhrase">Recovery Phrase</label>
            <textarea
              id="recoveryPhrase"
              value={recoveryPhrase}
              onChange={(e) => setRecoveryPhrase(e.target.value)}
              placeholder="Enter your recovery phrase"
              disabled={loading}
              rows={3}
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Authorizing Device...' : 'Authorize Device'}
          </button>
          
          <div className="forgot-link">
            <button type="button" onClick={handleBackToLogin} className="text-button">
              Back to Login
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="uid">Unique Identifier (UID)</label>
          <input
            type="text"
            id="uid"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="Enter your UID"
            disabled={loading}
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        
        <button type="submit" className="auth-button" disabled={loading}>
          {loading ? 'Checking Device...' : 'Login'}
        </button>
        
        <div className="forgot-link">
          <button type="button" onClick={onForgotUID} className="text-button" >
            Forgot UID?
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;