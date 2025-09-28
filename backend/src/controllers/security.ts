/**
 * Security Management Controller
 * Handles security monitoring, alerts, and account management endpoints
 */

import { RequestHandler } from 'express';
import { securityLogger } from '../services/securityLogger';

/**
 * Get security alerts and monitoring data
 */
export const getSecurityAlerts: RequestHandler = async (req, res) => {
  try {
    const { severity, limit } = req.query;
    const alertLimit = limit ? parseInt(limit as string) : 50;
    
    const alerts = securityLogger.getSecurityAlerts(
      severity as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | undefined,
      alertLimit
    );

    res.status(200).json({
      success: true,
      alerts,
      count: alerts.length
    });
  } catch (error) {
    console.error('Error fetching security alerts:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching security alerts' });
  }
};

/**
 * Get security statistics
 */
export const getSecurityStats: RequestHandler = async (req, res) => {
  try {
    const stats = securityLogger.getSecurityStats();
    
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching security stats:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching security stats' });
  }
};

/**
 * Get security logs for a specific user
 */
export const getUserSecurityLogs: RequestHandler = async (req, res) => {
  try {
    const { uid } = req.params;
    const { eventType, limit } = req.query;
    
    if (!uid) {
      res.status(400).json({ success: false, message: 'UID is required' });
      return;
    }

    const logLimit = limit ? parseInt(limit as string) : 100;
    const logs = securityLogger.getSecurityLogs(
      uid,
      eventType as any,
      logLimit
    );

    // Remove sensitive information before sending
    const sanitizedLogs = logs.map(log => ({
      eventType: log.eventType,
      timestamp: log.timestamp,
      success: log.success,
      severity: log.severity,
      deviceId: log.deviceId,
      errorMessage: log.errorMessage,
      details: log.details
    }));

    res.status(200).json({
      success: true,
      logs: sanitizedLogs,
      count: sanitizedLogs.length
    });
  } catch (error) {
    console.error('Error fetching user security logs:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching security logs' });
  }
};

/**
 * Check if an account is locked
 */
export const checkAccountLock: RequestHandler = async (req, res) => {
  try {
    const { uid } = req.params;
    
    if (!uid) {
      res.status(400).json({ success: false, message: 'UID is required' });
      return;
    }

    const isLocked = securityLogger.isAccountLocked(uid);
    const lockInfo = securityLogger.getAccountLockInfo(uid);

    res.status(200).json({
      success: true,
      isLocked,
      lockInfo: lockInfo ? {
        lockedAt: lockInfo.lockedAt,
        reason: lockInfo.reason,
        unlockAt: lockInfo.unlockAt
      } : null
    });
  } catch (error) {
    console.error('Error checking account lock:', error);
    res.status(500).json({ success: false, message: 'Server error while checking account lock' });
  }
};

/**
 * Manually unlock an account (admin function)
 */
export const unlockAccount: RequestHandler = async (req, res) => {
  try {
    const { uid } = req.params;
    const { reason } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    if (!uid) {
      res.status(400).json({ success: false, message: 'UID is required' });
      return;
    }

    if (!reason) {
      res.status(400).json({ success: false, message: 'Unlock reason is required' });
      return;
    }

    const wasLocked = securityLogger.isAccountLocked(uid);
    if (!wasLocked) {
      res.status(400).json({ success: false, message: 'Account is not currently locked' });
      return;
    }

    const unlocked = securityLogger.unlockAccount(uid, `Manual unlock: ${reason}`);
    
    if (unlocked) {
      // Log the manual unlock action
      securityLogger.logEvent({
        eventType: 'ACCOUNT_UNLOCKED',
        uid,
        success: true,
        timestamp: new Date(),
        ipAddress,
        userAgent,
        errorMessage: `Manual unlock by admin: ${reason}`,
        severity: 'MEDIUM'
      });

      res.status(200).json({
        success: true,
        message: 'Account unlocked successfully'
      });
    } else {
      res.status(500).json({ success: false, message: 'Failed to unlock account' });
    }
  } catch (error) {
    console.error('Error unlocking account:', error);
    res.status(500).json({ success: false, message: 'Server error while unlocking account' });
  }
};

/**
 * Get account lock status for multiple users (admin function)
 */
export const getLockedAccounts: RequestHandler = async (req, res) => {
  try {
    const stats = securityLogger.getSecurityStats();
    const alerts = securityLogger.getSecurityAlerts('CRITICAL', 100);
    
    // Filter for account lock events
    const lockEvents = alerts.filter(alert => alert.eventType === 'ACCOUNT_LOCKED');
    
    res.status(200).json({
      success: true,
      lockedAccountsCount: stats.lockedAccounts,
      recentLockEvents: lockEvents.slice(0, 20)
    });
  } catch (error) {
    console.error('Error fetching locked accounts:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching locked accounts' });
  }
};