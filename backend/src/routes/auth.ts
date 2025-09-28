import { Router } from 'express';
import { register, login, verifyRecoveryPhrase, checkUser } from '../controllers/auth';

const router = Router();

// Register a new user with UID
router.post('/register', register);

// Legacy login endpoint - deprecated for security reasons
// Returns 410 Gone to indicate the endpoint has been permanently removed
router.post('/login', login);

// Verify recovery phrase and derive UID
router.post('/verify-recovery', verifyRecoveryPhrase);

// Check if user exists (for migration detection)
router.get('/check-user/:uid', checkUser);

export default router;