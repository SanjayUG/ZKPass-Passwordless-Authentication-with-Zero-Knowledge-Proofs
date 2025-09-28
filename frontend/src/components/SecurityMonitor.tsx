/**
 * Security Monitor Component
 * Displays security alerts, account status, and security statistics
 */

import React, { useState, useEffect } from 'react';

interface SecurityEvent {
  eventType: string;
  timestamp: string;
  success: boolean;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  deviceId?: string;
  uid?: string;
  errorMessage?: string;
  details?: any;
}

interface SecurityStats {
  totalEvents: number;
  failureRate: number;
  eventsByType: Record<string, number>;
  lockedAccounts: number;
}

interface AccountLockInfo {
  isLocked: boolean;
  lockInfo?: {
    lockedAt: string;
    reason: string;
    unlockAt?: string;
  };
}

const SecurityMonitor: React.FC<{ uid?: string }> = ({ uid }) => {
  const [securityAlerts, setSecurityAlerts] = useState<SecurityEvent[]>([]);
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [accountLockInfo, setAccountLockInfo] = useState<AccountLockInfo | null>(null);
  const [userLogs, setUserLogs] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = 'http://localhost:3001/api';

  // Fetch security alerts
  const fetchSecurityAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE}/security/alerts?severity=HIGH&limit=10`);
      const data = await response.json();
      if (data.success) {
        setSecurityAlerts(data.alerts);
      }
    } catch (err) {
      console.error('Failed to fetch security alerts:', err);
    }
  };

  // Fetch security statistics
  const fetchSecurityStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/security/stats`);
      const data = await response.json();
      if (data.success) {
        setSecurityStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch security stats:', err);
    }
  };

  // Check account lock status
  const checkAccountLock = async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE}/security/lock-status/${userId}`);
      const data = await response.json();
      if (data.success) {
        setAccountLockInfo(data);
      }
    } catch (err) {
      console.error('Failed to check account lock:', err);
    }
  };

  // Fetch user security logs
  const fetchUserLogs = async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE}/security/logs/${userId}?limit=20`);
      const data = await response.json();
      if (data.success) {
        setUserLogs(data.logs);
      }
    } catch (err) {
      console.error('Failed to fetch user logs:', err);
    }
  };

  // Unlock account (admin function)
  const unlockAccount = async (userId: string, reason: string) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/security/unlock/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await response.json();
      
      if (data.success) {
        alert('Account unlocked successfully');
        if (uid) {
          await checkAccountLock(uid);
        }
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to unlock account');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityAlerts();
    fetchSecurityStats();
    
    if (uid) {
      checkAccountLock(uid);
      fetchUserLogs(uid);
    }

    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      fetchSecurityAlerts();
      fetchSecurityStats();
      if (uid) {
        checkAccountLock(uid);
        fetchUserLogs(uid);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [uid]);

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-100';
      case 'HIGH': return 'text-orange-600 bg-orange-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'LOW': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Security Monitor</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Security Statistics */}
      {securityStats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Security Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded">
              <div className="text-2xl font-bold text-blue-600">{securityStats.totalEvents}</div>
              <div className="text-sm text-gray-600">Total Events</div>
            </div>
            <div className="bg-red-50 p-4 rounded">
              <div className="text-2xl font-bold text-red-600">{securityStats.failureRate}%</div>
              <div className="text-sm text-gray-600">Failure Rate</div>
            </div>
            <div className="bg-orange-50 p-4 rounded">
              <div className="text-2xl font-bold text-orange-600">{securityStats.lockedAccounts}</div>
              <div className="text-sm text-gray-600">Locked Accounts</div>
            </div>
            <div className="bg-green-50 p-4 rounded">
              <div className="text-2xl font-bold text-green-600">
                {Object.keys(securityStats.eventsByType).length}
              </div>
              <div className="text-sm text-gray-600">Event Types</div>
            </div>
          </div>
        </div>
      )}

      {/* Account Lock Status */}
      {uid && accountLockInfo && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Account Status for {uid}</h2>
          {accountLockInfo.isLocked ? (
            <div className="bg-red-50 border border-red-200 rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-red-800 font-semibold">🔒 Account Locked</div>
                  <div className="text-red-600 text-sm mt-1">
                    Reason: {accountLockInfo.lockInfo?.reason}
                  </div>
                  <div className="text-red-600 text-sm">
                    Locked at: {accountLockInfo.lockInfo?.lockedAt && formatTimestamp(accountLockInfo.lockInfo.lockedAt)}
                  </div>
                  {accountLockInfo.lockInfo?.unlockAt && (
                    <div className="text-red-600 text-sm">
                      Unlocks at: {formatTimestamp(accountLockInfo.lockInfo.unlockAt)}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => unlockAccount(uid, 'Manual unlock via security monitor')}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {loading ? 'Unlocking...' : 'Unlock Account'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <div className="text-green-800 font-semibold">✅ Account Active</div>
              <div className="text-green-600 text-sm">No security restrictions</div>
            </div>
          )}
        </div>
      )}

      {/* Security Alerts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Security Alerts</h2>
        <div className="space-y-3">
          {securityAlerts.length > 0 ? (
            securityAlerts.map((alert, index) => (
              <div key={index} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className="font-medium">{alert.eventType}</span>
                    <span className="text-gray-600">UID: {alert.uid || 'Unknown'}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatTimestamp(alert.timestamp)}
                  </span>
                </div>
                {alert.errorMessage && (
                  <div className="text-sm text-gray-600 mt-2">{alert.errorMessage}</div>
                )}
                {alert.deviceId && (
                  <div className="text-sm text-gray-500 mt-1">Device: {alert.deviceId}</div>
                )}
              </div>
            ))
          ) : (
            <div className="text-gray-500 text-center py-4">No recent security alerts</div>
          )}
        </div>
      </div>

      {/* User Security Logs */}
      {uid && userLogs.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Security Log for {uid}</h2>
          <div className="space-y-2">
            {userLogs.map((log, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center space-x-3">
                  <span className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="text-sm font-medium">{log.eventType}</span>
                  {log.deviceId && <span className="text-xs text-gray-500">Device: {log.deviceId}</span>}
                </div>
                <span className="text-xs text-gray-500">{formatTimestamp(log.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityMonitor;