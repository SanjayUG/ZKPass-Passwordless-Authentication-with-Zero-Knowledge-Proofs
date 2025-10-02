/**
 * Device Authentication Routes
 */

import { Router } from 'express';
import { 
  verifyDeviceZKP, 
  registerDevice, 
  authorizeDevice, 
  listDevices, 
  revokeDevice,
  generateZKP,
  enhancedAuthenticate,
  authenticateWithZKP,
  generateZKProofEnhanced,
  registerDeviceWithZKP,
  checkMigrationStatus,
  migrateLegacyUser,
  getAuthMethods,
  healthCheckEnhanced
} from '../controllers/deviceAuth';
import { securityLogger } from '../services/securityLogger';

const router = Router();

// Enhanced authentication endpoints
router.post('/authenticate', enhancedAuthenticate);
router.post('/authenticate/zkp', authenticateWithZKP);

// ZKP generation and verification
router.post('/generate-zkp', generateZKP);
router.post('/proof/generate', generateZKProofEnhanced);
router.post('/verify-zkp', verifyDeviceZKP);

// Device management
router.post('/register', registerDevice);
router.post('/device/register', registerDeviceWithZKP);
router.post('/authorize', authorizeDevice);
router.get('/devices/:uid', listDevices);
router.get('/methods/:uid', getAuthMethods);
router.delete('/devices/:uid/:deviceId', revokeDevice);

// Migration support
router.get('/migration/status/:uid', checkMigrationStatus);
router.post('/migration/migrate', migrateLegacyUser);

// Health check
router.get('/health', healthCheckEnhanced);

// Security monitoring endpoint (for admin/monitoring purposes)
router.get('/security/logs/:uid', (req, res) => {
  try {
    const { uid } = req.params;
    const { eventType, limit } = req.query;
    
    const logs = securityLogger.getSecurityLogs(
      uid, 
      eventType as any, 
      limit ? parseInt(limit as string) : 100
    );
    
    res.status(200).json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Security logs error:', error);
    res.status(500).json({ success: false, message: 'Server error while retrieving security logs' });
  }
});

// Security monitoring endpoint for all logs
router.get('/security/logs', (req, res) => {
  try {
    const { eventType, limit } = req.query;
    
    const logs = securityLogger.getSecurityLogs(
      undefined, 
      eventType as any, 
      limit ? parseInt(limit as string) : 100
    );
    
    res.status(200).json({
      success: true,
      logs
    });
  } catch (error) {
    console.error('Security logs error:', error);
    res.status(500).json({ success: false, message: 'Server error while retrieving security logs' });
  }
});

// Security statistics endpoint
router.get('/security/stats', (req, res) => {
  try {
    const stats = securityLogger.getSecurityStats();
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Security stats error:', error);
    res.status(500).json({ success: false, message: 'Server error while retrieving security stats' });
  }
});

export default router;