/**
 * Security Logger Service
 * Handles comprehensive security event logging for device operations
 */

export interface SecurityEvent {
  eventType: 'DEVICE_REGISTRATION' | 'DEVICE_AUTHORIZATION' | 'DEVICE_REVOCATION' | 'ZKP_VERIFICATION' | 'RECOVERY_ATTEMPT' | 'RATE_LIMIT_EXCEEDED' | 'AUTHENTICATION_FAILURE' | 'ACCOUNT_LOCKED' | 'ACCOUNT_UNLOCKED' | 'SUSPICIOUS_ACTIVITY';
  uid: string;
  deviceId?: string;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  details?: any;
  errorMessage?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

class SecurityLoggerService {
  private logs: SecurityEvent[] = [];
  private lockedAccounts: Map<string, { lockedAt: Date; reason: string; unlockAt?: Date }> = new Map();
  private suspiciousActivityThresholds = {
    failedAttemptsWindow: 10 * 60 * 1000, // 10 minutes
    maxFailedAttempts: 10,
    multipleDeviceWindow: 5 * 60 * 1000, // 5 minutes
    maxDeviceRegistrations: 3
  };

  /**
   * Log a security event
   */
  logEvent(event: SecurityEvent): void {
    const logEntry: SecurityEvent = {
      ...event,
      timestamp: new Date(),
      severity: event.severity || this.determineSeverity(event)
    };

    this.logs.push(logEntry);

    // Console logging for development with severity levels
    const severityPrefix = logEntry.severity ? `[${logEntry.severity}]` : '';
    const logLevel = event.success ? 'info' : 'warn';
    const message = `[SECURITY]${severityPrefix} ${event.eventType} - UID: ${event.uid}${event.deviceId ? `, Device: ${event.deviceId}` : ''} - ${event.success ? 'SUCCESS' : 'FAILURE'}`;
    
    if (logLevel === 'info') {
      console.log(message, event.details || '');
    } else {
      console.warn(message, event.errorMessage || event.details || '');
    }

    // Check for suspicious activity patterns
    this.detectSuspiciousActivity(event);

    // In production, this would integrate with proper logging infrastructure
    // like Winston, ELK stack, or cloud logging services
  }

  /**
   * Determine event severity based on type and context
   */
  private determineSeverity(event: SecurityEvent): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (event.eventType === 'ACCOUNT_LOCKED' || event.eventType === 'SUSPICIOUS_ACTIVITY') {
      return 'CRITICAL';
    }
    if (event.eventType === 'RATE_LIMIT_EXCEEDED' || event.eventType === 'AUTHENTICATION_FAILURE') {
      return 'HIGH';
    }
    if (!event.success && (event.eventType === 'ZKP_VERIFICATION' || event.eventType === 'RECOVERY_ATTEMPT')) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * Detect suspicious activity patterns and trigger account locking if needed
   */
  private detectSuspiciousActivity(event: SecurityEvent): void {
    const now = new Date();
    const uid = event.uid;

    // Skip detection for already locked accounts
    if (this.isAccountLocked(uid)) {
      return;
    }

    // Pattern 1: Multiple failed authentication attempts
    const recentFailures = this.getRecentEvents(uid, ['ZKP_VERIFICATION', 'RECOVERY_ATTEMPT', 'AUTHENTICATION_FAILURE'], this.suspiciousActivityThresholds.failedAttemptsWindow)
      .filter(e => !e.success);

    if (recentFailures.length >= this.suspiciousActivityThresholds.maxFailedAttempts) {
      this.lockAccount(uid, 'Multiple failed authentication attempts detected', event.ipAddress, event.userAgent);
      return;
    }

    // Pattern 2: Multiple device registrations in short time
    const recentRegistrations = this.getRecentEvents(uid, ['DEVICE_REGISTRATION', 'DEVICE_AUTHORIZATION'], this.suspiciousActivityThresholds.multipleDeviceWindow)
      .filter(e => e.success);

    if (recentRegistrations.length >= this.suspiciousActivityThresholds.maxDeviceRegistrations) {
      this.lockAccount(uid, 'Multiple device registrations in short time period', event.ipAddress, event.userAgent);
      return;
    }

    // Pattern 3: Failed attempts from multiple IP addresses
    const recentFailuresWithIPs = recentFailures.filter(e => e.ipAddress);
    const uniqueIPs = new Set(recentFailuresWithIPs.map(e => e.ipAddress));
    
    if (uniqueIPs.size >= 3 && recentFailures.length >= 5) {
      this.lockAccount(uid, 'Failed attempts from multiple IP addresses', event.ipAddress, event.userAgent);
      return;
    }
  }

  /**
   * Get recent events for a user within a time window
   */
  private getRecentEvents(uid: string, eventTypes: SecurityEvent['eventType'][], windowMs: number): SecurityEvent[] {
    const cutoff = new Date(Date.now() - windowMs);
    return this.logs.filter(log => 
      log.uid === uid && 
      eventTypes.includes(log.eventType) && 
      log.timestamp > cutoff
    );
  }

  /**
   * Lock an account due to suspicious activity
   */
  lockAccount(uid: string, reason: string, ipAddress?: string, userAgent?: string): void {
    const lockDuration = 30 * 60 * 1000; // 30 minutes
    const unlockAt = new Date(Date.now() + lockDuration);
    
    this.lockedAccounts.set(uid, {
      lockedAt: new Date(),
      reason,
      unlockAt
    });

    // Log the account locking event
    this.logEvent({
      eventType: 'ACCOUNT_LOCKED',
      uid,
      success: false,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      errorMessage: reason,
      severity: 'CRITICAL',
      details: { unlockAt: unlockAt.toISOString(), lockDurationMinutes: 30 }
    });

    // Schedule automatic unlock
    setTimeout(() => {
      this.unlockAccount(uid, 'Automatic unlock after timeout');
    }, lockDuration);
  }

  /**
   * Manually unlock an account
   */
  unlockAccount(uid: string, reason: string): boolean {
    const lockInfo = this.lockedAccounts.get(uid);
    if (!lockInfo) {
      return false;
    }

    this.lockedAccounts.delete(uid);

    this.logEvent({
      eventType: 'ACCOUNT_UNLOCKED',
      uid,
      success: true,
      timestamp: new Date(),
      errorMessage: reason,
      severity: 'MEDIUM',
      details: { 
        wasLockedAt: lockInfo.lockedAt.toISOString(),
        lockReason: lockInfo.reason
      }
    });

    return true;
  }

  /**
   * Check if an account is currently locked
   */
  isAccountLocked(uid: string): boolean {
    const lockInfo = this.lockedAccounts.get(uid);
    if (!lockInfo) {
      return false;
    }

    // Check if lock has expired
    if (lockInfo.unlockAt && new Date() > lockInfo.unlockAt) {
      this.unlockAccount(uid, 'Automatic unlock after timeout');
      return false;
    }

    return true;
  }

  /**
   * Get account lock information
   */
  getAccountLockInfo(uid: string): { lockedAt: Date; reason: string; unlockAt?: Date } | null {
    return this.lockedAccounts.get(uid) || null;
  }

  /**
   * Log device registration event
   */
  logDeviceRegistration(uid: string, deviceId: string, success: boolean, ipAddress?: string, userAgent?: string, errorMessage?: string): void {
    this.logEvent({
      eventType: 'DEVICE_REGISTRATION',
      uid,
      deviceId,
      success,
      ipAddress,
      userAgent,
      errorMessage,
      timestamp: new Date()
    });
  }

  /**
   * Log device authorization event (recovery phrase verification)
   */
  logDeviceAuthorization(uid: string, deviceId: string, success: boolean, ipAddress?: string, userAgent?: string, errorMessage?: string): void {
    this.logEvent({
      eventType: 'DEVICE_AUTHORIZATION',
      uid,
      deviceId,
      success,
      ipAddress,
      userAgent,
      errorMessage,
      timestamp: new Date()
    });
  }

  /**
   * Log device revocation event
   */
  logDeviceRevocation(uid: string, deviceId: string, success: boolean, ipAddress?: string, userAgent?: string, errorMessage?: string): void {
    this.logEvent({
      eventType: 'DEVICE_REVOCATION',
      uid,
      deviceId,
      success,
      ipAddress,
      userAgent,
      errorMessage,
      timestamp: new Date()
    });
  }

  /**
   * Log ZKP verification event
   */
  logZKPVerification(uid: string, deviceId: string | undefined, success: boolean, ipAddress?: string, userAgent?: string, errorMessage?: string): void {
    this.logEvent({
      eventType: 'ZKP_VERIFICATION',
      uid,
      deviceId,
      success,
      ipAddress,
      userAgent,
      errorMessage,
      timestamp: new Date()
    });
  }

  /**
   * Log recovery phrase attempt
   */
  logRecoveryAttempt(uid: string, success: boolean, ipAddress?: string, userAgent?: string, errorMessage?: string): void {
    this.logEvent({
      eventType: 'RECOVERY_ATTEMPT',
      uid,
      success,
      ipAddress,
      userAgent,
      errorMessage,
      timestamp: new Date()
    });
  }

  /**
   * Log rate limit exceeded event
   */
  logRateLimitExceeded(uid: string, ipAddress?: string, userAgent?: string): void {
    this.logEvent({
      eventType: 'RATE_LIMIT_EXCEEDED',
      uid,
      success: false,
      ipAddress,
      userAgent,
      errorMessage: 'Rate limit exceeded for authentication attempts',
      timestamp: new Date()
    });
  }

  /**
   * Log authentication failure
   */
  logAuthenticationFailure(uid: string, reason: string, ipAddress?: string, userAgent?: string): void {
    this.logEvent({
      eventType: 'AUTHENTICATION_FAILURE',
      uid,
      success: false,
      ipAddress,
      userAgent,
      errorMessage: reason,
      timestamp: new Date()
    });
  }

  /**
   * Log suspicious activity detection
   */
  logSuspiciousActivity(uid: string, activityType: string, details: any, ipAddress?: string, userAgent?: string): void {
    this.logEvent({
      eventType: 'SUSPICIOUS_ACTIVITY',
      uid,
      success: false,
      ipAddress,
      userAgent,
      errorMessage: `Suspicious activity detected: ${activityType}`,
      details,
      severity: 'CRITICAL',
      timestamp: new Date()
    });
  }

  /**
   * Get security logs for monitoring (filtered for security)
   */
  getSecurityLogs(uid?: string, eventType?: SecurityEvent['eventType'], limit: number = 100): SecurityEvent[] {
    let filteredLogs = this.logs;

    if (uid) {
      filteredLogs = filteredLogs.filter(log => log.uid === uid);
    }

    if (eventType) {
      filteredLogs = filteredLogs.filter(log => log.eventType === eventType);
    }

    return filteredLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get security statistics
   */
  getSecurityStats(): { totalEvents: number; failureRate: number; eventsByType: Record<string, number>; lockedAccounts: number } {
    const totalEvents = this.logs.length;
    const failures = this.logs.filter(log => !log.success).length;
    const failureRate = totalEvents > 0 ? (failures / totalEvents) * 100 : 0;

    const eventsByType: Record<string, number> = {};
    this.logs.forEach(log => {
      eventsByType[log.eventType] = (eventsByType[log.eventType] || 0) + 1;
    });

    return {
      totalEvents,
      failureRate: Math.round(failureRate * 100) / 100,
      eventsByType,
      lockedAccounts: this.lockedAccounts.size
    };
  }

  /**
   * Get security alerts for monitoring dashboard
   */
  getSecurityAlerts(severity?: SecurityEvent['severity'], limit: number = 50): SecurityEvent[] {
    let alerts = this.logs.filter(log => 
      log.severity === 'HIGH' || log.severity === 'CRITICAL' || 
      ['ACCOUNT_LOCKED', 'SUSPICIOUS_ACTIVITY', 'RATE_LIMIT_EXCEEDED'].includes(log.eventType)
    );

    if (severity) {
      alerts = alerts.filter(log => log.severity === severity);
    }

    return alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Send security notification (placeholder for real notification system)
   */
  private sendSecurityNotification(event: SecurityEvent): void {
    // In a real implementation, this would integrate with:
    // - Email service (SendGrid, AWS SES, etc.)
    // - Push notification service
    // - Slack/Discord webhooks
    // - SMS service for critical alerts
    
    console.log(`🔔 SECURITY NOTIFICATION: ${event.eventType} for UID: ${event.uid}`);
    
    if (event.severity === 'CRITICAL') {
      console.log(`🚨 CRITICAL ALERT: ${event.errorMessage}`);
      // In production: send immediate notifications to security team
    }
    
    // For device authorization notifications, we would notify existing devices
    if (event.eventType === 'DEVICE_AUTHORIZATION' && event.success) {
      console.log(`📱 New device authorized for UID: ${event.uid}`);
      // In production: send notification to all existing devices for this user
    }
  }

  /**
   * Enhanced logging with automatic notifications
   */
  logEventWithNotification(event: SecurityEvent): void {
    this.logEvent(event);
    
    // Send notifications for critical events
    if (event.severity === 'CRITICAL' || 
        ['ACCOUNT_LOCKED', 'DEVICE_AUTHORIZATION', 'SUSPICIOUS_ACTIVITY'].includes(event.eventType)) {
      this.sendSecurityNotification(event);
    }
  }
}

// Export singleton instance
export const securityLogger = new SecurityLoggerService();