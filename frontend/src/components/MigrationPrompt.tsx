/**
 * Migration Prompt Component
 * Displays migration prompt for existing users without device keys
 * Requirements: 6.1, 6.2
 */

import { useState, useEffect } from 'react';
import { migrationService } from '../services/migrationService';
import '../styles/Auth.css';

interface MigrationPromptProps {
  uid: string;
  onMigrationComplete: (uid: string) => void;
  onCancel: () => void;
}

const MigrationPrompt = ({ uid, onMigrationComplete, onCancel }: MigrationPromptProps) => {
  const [recoveryPhrase, setRecoveryPhrase] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rateLimitedUntil, setRateLimitedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  // Countdown timer effect
  useEffect(() => {
    if (rateLimitedUntil) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.ceil((rateLimitedUntil - now) / 1000));
        setCountdown(remaining);
        
        if (remaining === 0) {
          setRateLimitedUntil(null);
          setError('');
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [rateLimitedUntil]);

  const handleMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!recoveryPhrase.trim()) {
      setError('Recovery phrase is required');
      return;
    }
    
    try {
      setLoading(true);
      
      const result = await migrationService.authenticateAndMigrate(uid, recoveryPhrase);
      
      if (result.success) {
        onMigrationComplete(uid);
      } else {
        setError(result.message || 'Migration failed');
        
        // Check if it's a rate limit error
        if (result.message?.includes('Too many')) {
          // Set rate limit for 15 minutes (same as backend)
          const lockoutTime = Date.now() + (15 * 60 * 1000);
          setRateLimitedUntil(lockoutTime);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Migration failed';
      setError(errorMessage);
      
      // Check if it's a rate limit error
      if (errorMessage.includes('Too many')) {
        const lockoutTime = Date.now() + (15 * 60 * 1000);
        setRateLimitedUntil(lockoutTime);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="auth-container">
      <div className="migration-prompt">
        <h2>Account Migration Required</h2>
        <div className="migration-info">
          <p>
            Your account needs to be upgraded to use device-based authentication for enhanced security.
          </p>
          <p>
            This is a one-time process that will:
          </p>
          <ul>
            <li>Generate a secure device key for this device</li>
            <li>Maintain your existing UID and recovery phrase</li>
            <li>Enhance your account security</li>
          </ul>
          <p>
            <strong>Please enter your recovery phrase to complete the migration:</strong>
          </p>
        </div>
        
        <form onSubmit={handleMigration} className="auth-form">
          <div className="form-group">
            <label htmlFor="recoveryPhrase">Recovery Phrase</label>
            <textarea
              id="recoveryPhrase"
              value={recoveryPhrase}
              onChange={(e) => setRecoveryPhrase(e.target.value)}
              placeholder="Enter your recovery phrase"
              disabled={loading}
              rows={3}
              required
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="button-group">
            <button 
              type="submit" 
              className="auth-button primary" 
              disabled={loading || rateLimitedUntil !== null}
            >
              {loading 
                ? 'Migrating Account...' 
                : rateLimitedUntil 
                  ? `Try again in ${formatCountdown(countdown)}` 
                  : 'Migrate Account'}
            </button>
            
            <button 
              type="button" 
              onClick={onCancel} 
              className="auth-button secondary"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
        
        <div className="migration-help">
          <p className="help-text">
            <strong>Need help?</strong> Your recovery phrase was provided when you first registered. 
            It's the same phrase you would use to recover your account on a new device.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MigrationPrompt;