import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import deviceAuthRoutes from './routes/deviceAuth';
import securityRoutes from './routes/security';

// Load environment variables
dotenv.config();
console.log("Loaded CONTRACT_ADDRESS:", process.env.CONTRACT_ADDRESS);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/device-auth', deviceAuthRoutes);
app.use('/api/security', securityRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  const { deviceRegistry } = require('./services/deviceRegistry');
  const { securityLogger } = require('./services/securityLogger');
  
  const deviceStats = deviceRegistry.getStats();
  const securityStats = securityLogger.getSecurityStats();
  
  res.status(200).json({ 
    status: 'ok', 
    message: 'ZKPass backend is running',
    deviceRegistry: deviceStats,
    security: {
      totalEvents: securityStats.totalEvents,
      lockedAccounts: securityStats.lockedAccounts,
      failureRate: securityStats.failureRate
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});