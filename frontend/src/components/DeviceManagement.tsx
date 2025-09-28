import React, { useState, useEffect } from 'react';
import { DeviceInfo } from '../types/deviceKey';
import { deviceAuthService } from '../services/deviceAuthService';
import DeviceList from './DeviceList';
import DeviceAuthorization from './DeviceAuthorization';
import ErrorMessage from './ErrorMessage';
import '../styles/DeviceManagement.css';

interface DeviceManagementProps {
  uid: string;
  onDeviceAuthorized?: () => void;
}

interface ErrorState {
  message: string;
  type: 'error' | 'warning' | 'info';
}

const DeviceManagement: React.FC<DeviceManagementProps> = ({ uid, onDeviceAuthorized }) => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [showAuthorization, setShowAuthorization] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load devices on component mount and when refresh is triggered
  useEffect(() => {
    loadDevices();
  }, [uid, refreshTrigger]);

  const loadDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const deviceList = await deviceAuthService.listAuthorizedDevices(uid);
      setDevices(deviceList);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to load devices',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceRevoked = () => {
    // Refresh the device list after revocation
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeviceAuthorized = () => {
    // Refresh the device list after new device authorization
    setRefreshTrigger(prev => prev + 1);
    setShowAuthorization(false);
    
    // Notify parent component if callback provided
    if (onDeviceAuthorized) {
      onDeviceAuthorized();
    }
  };

  const handleAuthorizationError = (errorMessage: string) => {
    setError({
      message: errorMessage,
      type: 'error'
    });
  };

  const clearError = () => {
    setError(null);
  };

  if (loading) {
    return (
      <div className="device-management-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading devices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="device-management-container">
      <div className="device-management-header">
        <h2>Device Management</h2>
        <p className="device-management-description">
          Manage devices authorized to access your account. Each device has its own cryptographic key for secure authentication.
        </p>
      </div>

      <ErrorMessage 
        error={error?.message || null}
        type={error?.type || 'error'}
        onDismiss={clearError}
      />

      {showAuthorization ? (
        <DeviceAuthorization
          uid={uid}
          onSuccess={handleDeviceAuthorized}
          onError={handleAuthorizationError}
          onCancel={() => setShowAuthorization(false)}
        />
      ) : (
        <>
          <div className="device-actions">
            <button
              className="authorize-device-button"
              onClick={() => setShowAuthorization(true)}
            >
              Authorize New Device
            </button>
          </div>

          <DeviceList
            devices={devices}
            uid={uid}
            onDeviceRevoked={handleDeviceRevoked}
            onError={handleAuthorizationError}
          />
        </>
      )}
    </div>
  );
};

export default DeviceManagement;