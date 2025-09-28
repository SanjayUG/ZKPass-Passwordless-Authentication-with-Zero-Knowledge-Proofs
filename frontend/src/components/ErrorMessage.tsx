import React from 'react';
import '../styles/ErrorMessage.css';

interface ErrorMessageProps {
  error: Error | string | null;
  type?: 'error' | 'warning' | 'info';
  onDismiss?: () => void;
  className?: string;
}

/**
 * User-friendly error message component for ZKP and device operations
 * Requirements: 3.6 - Create user-friendly error messages for ZKP and device operations
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  error, 
  type = 'error', 
  onDismiss, 
  className = '' 
}) => {
  if (!error) return null;

  const errorMessage = error instanceof Error ? error.message : error;

  // Map technical errors to user-friendly messages
  const getUserFriendlyMessage = (message: string): string => {
    const lowerMessage = message.toLowerCase();

    // Device key related errors
    if (lowerMessage.includes('device_key_generation_failed')) {
      return 'Failed to generate device security key. Please try again or use a different browser.';
    }
    
    if (lowerMessage.includes('device_key_storage_failed')) {
      return 'Unable to save device key securely. Please check your browser settings and try again.';
    }
    
    if (lowerMessage.includes('device_key_not_found')) {
      return 'No device key found. Please authorize this device using your recovery phrase.';
    }
    
    if (lowerMessage.includes('signature_generation_failed')) {
      return 'Failed to create security signature. Please try again.';
    }
    
    if (lowerMessage.includes('browser_not_supported')) {
      return 'Your browser doesn\'t support the required security features. Please use a modern browser like Chrome, Firefox, or Safari.';
    }
    
    if (lowerMessage.includes('indexeddb_not_available')) {
      return 'Browser storage is not available. Please enable cookies and local storage, then try again.';
    }

    // ZKP related errors
    if (lowerMessage.includes('zkp') && lowerMessage.includes('generation')) {
      return 'Failed to generate security proof. Please check your connection and try again.';
    }
    
    if (lowerMessage.includes('zkp') && lowerMessage.includes('verification')) {
      return 'Security verification failed. Please try logging in again.';
    }
    
    if (lowerMessage.includes('proof') && lowerMessage.includes('invalid')) {
      return 'Invalid security proof. Please try again or re-authorize this device.';
    }

    // Authentication errors
    if (lowerMessage.includes('recovery phrase') && lowerMessage.includes('invalid')) {
      return 'Invalid recovery phrase. Please check your recovery phrase and try again.';
    }
    
    if (lowerMessage.includes('device not registered')) {
      return 'This device is not authorized. Please use your recovery phrase to authorize it.';
    }
    
    if (lowerMessage.includes('rate limit')) {
      return 'Too many attempts. Please wait a few minutes before trying again.';
    }
    
    if (lowerMessage.includes('challenge') && lowerMessage.includes('expired')) {
      return 'Security challenge expired. Please try again.';
    }

    // Network errors
    if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      return 'Connection error. Please check your internet connection and try again.';
    }
    
    if (lowerMessage.includes('timeout')) {
      return 'Request timed out. Please check your connection and try again.';
    }

    // Server errors
    if (lowerMessage.includes('500') || lowerMessage.includes('internal server')) {
      return 'Server error. Please try again in a few moments.';
    }
    
    if (lowerMessage.includes('503') || lowerMessage.includes('service unavailable')) {
      return 'Service temporarily unavailable. Please try again later.';
    }

    // Generic fallback
    if (lowerMessage.includes('failed') || lowerMessage.includes('error')) {
      return `Operation failed: ${message}`;
    }

    // Return original message if no mapping found
    return message;
  };

  const getErrorIcon = (type: string): string => {
    switch (type) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '❌';
    }
  };

  const friendlyMessage = getUserFriendlyMessage(errorMessage);

  return (
    <div className={`error-message-container ${type} ${className}`}>
      <div className="error-content">
        <div className="error-icon">
          {getErrorIcon(type)}
        </div>
        <div className="error-text">
          <div className="error-main-message">
            {friendlyMessage}
          </div>
          {/* Show technical details in development or if specifically requested */}
          {process.env.NODE_ENV === 'development' && errorMessage !== friendlyMessage && (
            <details className="error-technical-details">
              <summary>Technical Details</summary>
              <code>{errorMessage}</code>
            </details>
          )}
        </div>
        {onDismiss && (
          <button 
            className="error-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
      
      {/* Helpful suggestions based on error type */}
      {type === 'error' && (() => {
        const lowerMessage = errorMessage.toLowerCase();
        return (
          <div className="error-suggestions">
            {lowerMessage.includes('device') && (
              <div className="suggestion">
                💡 <strong>Tip:</strong> If you're having device issues, try refreshing the page or using your recovery phrase to re-authorize.
              </div>
            )}
            {lowerMessage.includes('recovery phrase') && (
              <div className="suggestion">
                💡 <strong>Tip:</strong> Make sure your recovery phrase is entered exactly as provided, including correct spelling and word order.
              </div>
            )}
            {lowerMessage.includes('network') && (
              <div className="suggestion">
                💡 <strong>Tip:</strong> Check your internet connection and try again. If the problem persists, the service may be temporarily unavailable.
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};

export default ErrorMessage;