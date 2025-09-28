import React, { useState } from 'react';
import { DeviceInfo } from '../types/deviceKey';
import { deviceAuthService } from '../services/deviceAuthService';
import { deviceKeyManager } from '../services/deviceKeyManager';
import '../styles/DeviceList.css';

interface DeviceListProps {
  devices: DeviceInfo[];
  uid: string;
  onDeviceRevoked: () => void;
  onError: (message: string) => void;
}

interface ConfirmationState {
  deviceId: string | null;
  deviceName: string | null;
}

const DeviceList: React.FC<DeviceListProps> = ({ devices, uid, onDeviceRevoked, onError }) => {
  const [revokingDevice, setRevokingDevice] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>({ deviceId: null, deviceName: null });
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  // Get current device ID on component mount
  React.useEffect(() => {
    const getCurrentDevice = async () => {
      try {
        const deviceId = await deviceKeyManager.getDeviceId(uid);
        setCurrentDeviceId(deviceId);
      } catch (error) {
        console.error('Failed to get current device ID:', error);
      }
    };
    getCurrentDevice();
  }, [uid]);

  const handleRevokeClick = (device: DeviceInfo) => {
    setConfirmation({
      deviceId: device.deviceId,
      deviceName: device.deviceName || 'Unknown Device'
    });
  };

  const handleConfirmRevoke = async () => {
    if (!confirmation.deviceId) return;

    try {
      setRevokingDevice(confirmation.deviceId);
      await deviceAuthService.revokeDevice(uid, confirmation.deviceId);
      
      // Clear confirmation state
      setConfirmation({ deviceId: null, deviceName: null });
      
      // Notify parent component
      onDeviceRevoked();
      
      // Show success message briefly
      const isCurrentDevice = confirmation.deviceId === currentDeviceId;
      if (isCurrentDevice) {
        onError('Current device has been revoked. You will need to re-authorize to continue using this device.');
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to revoke device');
    } finally {
      setRevokingDevice(null);
    }
  };

  const handleCancelRevoke = () => {
    setConfirmation({ deviceId: null, deviceName: null });
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getDeviceIcon = (userAgent?: string): string => {
    if (!userAgent) return '💻';
    
    if (userAgent.includes('Mobile')) return '📱';
    if (userAgent.includes('Tablet')) return '📱';
    if (userAgent.includes('Windows')) return '🖥️';
    if (userAgent.includes('Mac')) return '💻';
    if (userAgent.includes('Linux')) return '🖥️';
    
    return '💻';
  };

  const isCurrentDevice = (deviceId: string): boolean => {
    return deviceId === currentDeviceId;
  };

  if (devices.length === 0) {
    return (
      <div className="device-list-container">
        <div className="no-devices">
          <div className="no-devices-icon">🔐</div>
          <h3>No Authorized Devices</h3>
          <p>You haven't authorized any devices yet. Use the "Authorize New Device" button to add your first device.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="device-list-container">
      <div className="device-list-header">
        <h3>Authorized Devices ({devices.length})</h3>
        <p className="device-list-description">
          These devices are authorized to access your account using their unique cryptographic keys.
        </p>
      </div>

      <div className="device-list">
        {devices.map((device) => (
          <div key={device.deviceId} className={`device-card ${isCurrentDevice(device.deviceId) ? 'current-device' : ''}`}>
            <div className="device-info">
              <div className="device-header">
                <div className="device-icon">
                  {getDeviceIcon(device.userAgent)}
                </div>
                <div className="device-details">
                  <h4 className="device-name">
                    {device.deviceName || 'Unknown Device'}
                    {isCurrentDevice(device.deviceId) && (
                      <span className="current-device-badge">Current Device</span>
                    )}
                  </h4>
                  <p className="device-id">ID: {device.deviceId.substring(0, 12)}...</p>
                </div>
              </div>
              
              <div className="device-metadata">
                <div className="device-dates">
                  <div className="date-item">
                    <span className="date-label">Created:</span>
                    <span className="date-value">{formatDate(device.createdAt)}</span>
                  </div>
                  <div className="date-item">
                    <span className="date-label">Last Used:</span>
                    <span className="date-value">{formatDate(device.lastUsed)}</span>
                  </div>
                </div>
                
                {device.userAgent && (
                  <div className="device-user-agent">
                    <span className="user-agent-label">Browser:</span>
                    <span className="user-agent-value">{device.userAgent.substring(0, 50)}...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="device-actions">
              <button
                className="revoke-button"
                onClick={() => handleRevokeClick(device)}
                disabled={revokingDevice === device.deviceId}
              >
                {revokingDevice === device.deviceId ? (
                  <>
                    <span className="button-spinner"></span>
                    Revoking...
                  </>
                ) : (
                  'Revoke Access'
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmation.deviceId && (
        <div className="confirmation-overlay">
          <div className="confirmation-modal">
            <div className="confirmation-header">
              <h3>Revoke Device Access</h3>
            </div>
            
            <div className="confirmation-content">
              <div className="warning-icon">⚠️</div>
              <p>
                Are you sure you want to revoke access for <strong>"{confirmation.deviceName}"</strong>?
              </p>
              <p className="confirmation-warning">
                This device will no longer be able to access your account and will need to be re-authorized using your recovery phrase.
              </p>
              
              {confirmation.deviceId === currentDeviceId && (
                <div className="current-device-warning">
                  <strong>Warning:</strong> You are about to revoke access for the current device. 
                  You will need to re-authorize this device to continue using it.
                </div>
              )}
            </div>
            
            <div className="confirmation-actions">
              <button
                className="cancel-button"
                onClick={handleCancelRevoke}
                disabled={revokingDevice === confirmation.deviceId}
              >
                Cancel
              </button>
              <button
                className="confirm-revoke-button"
                onClick={handleConfirmRevoke}
                disabled={revokingDevice === confirmation.deviceId}
              >
                {revokingDevice === confirmation.deviceId ? (
                  <>
                    <span className="button-spinner"></span>
                    Revoking...
                  </>
                ) : (
                  'Revoke Access'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceList;