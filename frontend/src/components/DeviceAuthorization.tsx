import React, { useState } from 'react';
import { deviceAuthService } from '../services/deviceAuthService';
import '../styles/DeviceAuthorization.css';

interface DeviceAuthorizationProps {
  uid: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  onCancel: () => void;
}

interface FormState {
  recoveryPhrase: string;
  deviceName: string;
}

interface ValidationErrors {
  recoveryPhrase?: string;
  deviceName?: string;
}

const DeviceAuthorization: React.FC<DeviceAuthorizationProps> = ({
  uid,
  onSuccess,
  onError,
  onCancel
}) => {
  const [formState, setFormState] = useState<FormState>({
    recoveryPhrase: '',
    deviceName: ''
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Validate recovery phrase
    if (!formState.recoveryPhrase.trim()) {
      newErrors.recoveryPhrase = 'Recovery phrase is required';
    } else if (formState.recoveryPhrase.trim().split(/\s+/).length < 12) {
      newErrors.recoveryPhrase = 'Recovery phrase must contain at least 12 words';
    }

    // Validate device name (optional but if provided, should be reasonable)
    if (formState.deviceName.trim() && formState.deviceName.trim().length < 2) {
      newErrors.deviceName = 'Device name must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormState, value: string) => {
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsAuthorizing(true);
      
      // Authorize the new device
      const result = await deviceAuthService.authorizeNewDevice(
        uid,
        formState.recoveryPhrase.trim()
      );

      if (result.success) {
        onSuccess();
      } else {
        onError(result.message || 'Device authorization failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Device authorization failed';
      
      // Provide more specific error messages based on common failure scenarios
      if (errorMessage.includes('recovery phrase')) {
        onError('Invalid recovery phrase. Please check your recovery phrase and try again.');
      } else if (errorMessage.includes('rate limit')) {
        onError('Too many authorization attempts. Please wait a few minutes before trying again.');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        onError('Network error. Please check your connection and try again.');
      } else {
        onError(errorMessage);
      }
    } finally {
      setIsAuthorizing(false);
    }
  };

  const getDeviceName = (): string => {
    if (formState.deviceName.trim()) {
      return formState.deviceName.trim();
    }

    // Auto-generate device name based on browser/OS
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome Browser';
    if (userAgent.includes('Firefox')) return 'Firefox Browser';
    if (userAgent.includes('Safari')) return 'Safari Browser';
    if (userAgent.includes('Edge')) return 'Edge Browser';
    return 'Web Browser';
  };

  return (
    <div className="device-authorization-container">
      <div className="authorization-header">
        <h3>Authorize New Device</h3>
        <p className="authorization-description">
          To authorize this device, please enter your recovery phrase. This will generate a new device key 
          for secure authentication on this device.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="authorization-form">
        <div className="form-group">
          <label htmlFor="recoveryPhrase">
            Recovery Phrase *
            <button
              type="button"
              className="toggle-visibility"
              onClick={() => setShowRecoveryPhrase(!showRecoveryPhrase)}
              aria-label={showRecoveryPhrase ? 'Hide recovery phrase' : 'Show recovery phrase'}
            >
              {showRecoveryPhrase ? '👁️' : '👁️‍🗨️'}
            </button>
          </label>
          <textarea
            id="recoveryPhrase"
            value={formState.recoveryPhrase}
            onChange={(e) => handleInputChange('recoveryPhrase', e.target.value)}
            placeholder="Enter your 12+ word recovery phrase..."
            className={`recovery-phrase-input ${errors.recoveryPhrase ? 'error' : ''}`}
            rows={4}
            disabled={isAuthorizing}
            style={{
              fontFamily: showRecoveryPhrase ? 'monospace' : 'inherit',
              ...(showRecoveryPhrase ? {} : { WebkitTextSecurity: 'disc' } as any)
            }}
          />
          {errors.recoveryPhrase && (
            <span className="field-error">{errors.recoveryPhrase}</span>
          )}
          <div className="input-help">
            Enter the recovery phrase you received when you first registered your account.
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="deviceName">
            Device Name (Optional)
          </label>
          <input
            id="deviceName"
            type="text"
            value={formState.deviceName}
            onChange={(e) => handleInputChange('deviceName', e.target.value)}
            placeholder={`e.g., ${getDeviceName()}`}
            className={errors.deviceName ? 'error' : ''}
            disabled={isAuthorizing}
            maxLength={50}
          />
          {errors.deviceName && (
            <span className="field-error">{errors.deviceName}</span>
          )}
          <div className="input-help">
            Give this device a recognizable name for easier management.
          </div>
        </div>

        <div className="security-notice">
          <div className="notice-icon">🔒</div>
          <div className="notice-content">
            <h4>Security Notice</h4>
            <ul>
              <li>Your recovery phrase is used only to verify your identity</li>
              <li>A new device key will be generated and stored securely on this device</li>
              <li>Your recovery phrase is never stored or transmitted to our servers</li>
              <li>You can revoke this device's access at any time from device management</li>
            </ul>
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-button"
            onClick={onCancel}
            disabled={isAuthorizing}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="authorize-button"
            disabled={isAuthorizing || !formState.recoveryPhrase.trim()}
          >
            {isAuthorizing ? (
              <>
                <span className="button-spinner"></span>
                Authorizing Device...
              </>
            ) : (
              'Authorize Device'
            )}
          </button>
        </div>
      </form>

      <div className="authorization-help">
        <h4>Need Help?</h4>
        <ul>
          <li>
            <strong>Lost your recovery phrase?</strong> Contact support for account recovery options.
          </li>
          <li>
            <strong>Recovery phrase not working?</strong> Make sure you're entering it exactly as provided, 
            including correct spelling and word order.
          </li>
          <li>
            <strong>Multiple failed attempts?</strong> Wait a few minutes before trying again to avoid rate limiting.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DeviceAuthorization;