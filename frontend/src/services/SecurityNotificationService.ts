/**
 * Security Notification Service
 * Handles security-related notifications and alerts on the frontend
 */

export interface SecurityNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  autoClose?: boolean;
  duration?: number;
}

class SecurityNotificationService {
  private notifications: SecurityNotification[] = [];
  private listeners: ((notifications: SecurityNotification[]) => void)[] = [];

  /**
   * Add a security notification
   */
  addNotification(notification: Omit<SecurityNotification, 'id' | 'timestamp'>): string {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification: SecurityNotification = {
      ...notification,
      id,
      timestamp: new Date(),
      autoClose: notification.autoClose ?? true,
      duration: notification.duration ?? 5000
    };

    this.notifications.unshift(newNotification);
    this.notifyListeners();

    // Auto-remove notification after duration
    if (newNotification.autoClose) {
      setTimeout(() => {
        this.removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }

  /**
   * Remove a notification
   */
  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  /**
   * Clear all notifications
   */
  clearAll(): void {
    this.notifications = [];
    this.notifyListeners();
  }

  /**
   * Get all notifications
   */
  getNotifications(): SecurityNotification[] {
    return [...this.notifications];
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: (notifications: SecurityNotification[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  /**
   * Show device authorization notification
   */
  notifyDeviceAuthorization(deviceId: string, success: boolean): void {
    if (success) {
      this.addNotification({
        type: 'info',
        title: 'New Device Authorized',
        message: `A new device (${deviceId.substring(0, 8)}...) has been authorized for your account.`,
        severity: 'MEDIUM',
        autoClose: false
      });
    } else {
      this.addNotification({
        type: 'error',
        title: 'Device Authorization Failed',
        message: 'Failed to authorize new device. Please check your recovery phrase.',
        severity: 'HIGH'
      });
    }
  }

  /**
   * Show account lock notification
   */
  notifyAccountLocked(reason: string, unlockTime?: string): void {
    this.addNotification({
      type: 'error',
      title: 'Account Temporarily Locked',
      message: `Your account has been locked due to: ${reason}${unlockTime ? ` Unlocks at: ${new Date(unlockTime).toLocaleString()}` : ''}`,
      severity: 'CRITICAL',
      autoClose: false
    });
  }

  /**
   * Show rate limit notification
   */
  notifyRateLimited(): void {
    this.addNotification({
      type: 'warning',
      title: 'Too Many Attempts',
      message: 'Too many authentication attempts. Please wait before trying again.',
      severity: 'HIGH'
    });
  }

  /**
   * Show authentication failure notification
   */
  notifyAuthenticationFailure(reason: string): void {
    this.addNotification({
      type: 'error',
      title: 'Authentication Failed',
      message: reason,
      severity: 'MEDIUM'
    });
  }

  /**
   * Show suspicious activity notification
   */
  notifySuspiciousActivity(activity: string): void {
    this.addNotification({
      type: 'warning',
      title: 'Suspicious Activity Detected',
      message: `Security alert: ${activity}. If this wasn't you, please secure your account immediately.`,
      severity: 'CRITICAL',
      autoClose: false
    });
  }

  /**
   * Show device revocation notification
   */
  notifyDeviceRevoked(deviceId: string): void {
    this.addNotification({
      type: 'info',
      title: 'Device Revoked',
      message: `Device ${deviceId.substring(0, 8)}... has been removed from your account.`,
      severity: 'LOW'
    });
  }

  /**
   * Show security event notification based on event type
   */
  notifySecurityEvent(eventType: string, success: boolean, details?: any): void {
    switch (eventType) {
      case 'DEVICE_REGISTRATION':
        if (success) {
          this.addNotification({
            type: 'success',
            title: 'Device Registered',
            message: 'Your device has been successfully registered.',
            severity: 'LOW'
          });
        }
        break;

      case 'DEVICE_AUTHORIZATION':
        this.notifyDeviceAuthorization(details?.deviceId || 'unknown', success);
        break;

      case 'ACCOUNT_LOCKED':
        this.notifyAccountLocked(details?.reason || 'Security violation', details?.unlockAt);
        break;

      case 'RATE_LIMIT_EXCEEDED':
        this.notifyRateLimited();
        break;

      case 'AUTHENTICATION_FAILURE':
        this.notifyAuthenticationFailure(details?.reason || 'Invalid credentials');
        break;

      case 'SUSPICIOUS_ACTIVITY':
        this.notifySuspiciousActivity(details?.activity || 'Unusual account activity');
        break;

      case 'DEVICE_REVOCATION':
        if (success) {
          this.notifyDeviceRevoked(details?.deviceId || 'unknown');
        }
        break;

      default:
        // Generic notification for unknown event types
        this.addNotification({
          type: success ? 'success' : 'error',
          title: 'Security Event',
          message: `${eventType}: ${success ? 'Success' : 'Failed'}`,
          severity: success ? 'LOW' : 'MEDIUM'
        });
    }
  }
}

// Export singleton instance
export const securityNotificationService = new SecurityNotificationService();

// React hook for using notifications
export const useSecurityNotifications = () => {
  const [notifications, setNotifications] = React.useState<SecurityNotification[]>([]);

  React.useEffect(() => {
    const unsubscribe = securityNotificationService.subscribe(setNotifications);
    setNotifications(securityNotificationService.getNotifications());
    return unsubscribe;
  }, []);

  return {
    notifications,
    addNotification: securityNotificationService.addNotification.bind(securityNotificationService),
    removeNotification: securityNotificationService.removeNotification.bind(securityNotificationService),
    clearAll: securityNotificationService.clearAll.bind(securityNotificationService)
  };
};

// Add React import for the hook
import React from 'react';