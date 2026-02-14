const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Authentication middleware
exports.authenticateJWT = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// API Key Authentication middleware
exports.authenticateAPIKey = async (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  
  if (!apiKey) {
    return res.status(401).json({ message: 'API key is required' });
  }

  try {
    const user = await User.findOne({ apiKey });
    
    if (!user) {
      return res.status(403).json({ message: 'Invalid API key' });
    }
    
    req.user = { id: user._id, username: user.username };
    next();
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};