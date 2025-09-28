/**
 * Security Management Routes
 * Routes for security monitoring, alerts, and account management
 */

import express from 'express';
import {
  getSecurityAlerts,
  getSecurityStats,
  getUserSecurityLogs,
  checkAccountLock,
  unlockAccount,
  getLockedAccounts
} from '../controllers/security';

const router = express.Router();

// Security monitoring endpoints
router.get('/alerts', getSecurityAlerts);
router.get('/stats', getSecurityStats);
router.get('/locked-accounts', getLockedAccounts);

// User-specific security endpoints
router.get('/logs/:uid', getUserSecurityLogs);
router.get('/lock-status/:uid', checkAccountLock);

// Account management endpoints (admin functions)
router.post('/unlock/:uid', unlockAccount);

export default router;