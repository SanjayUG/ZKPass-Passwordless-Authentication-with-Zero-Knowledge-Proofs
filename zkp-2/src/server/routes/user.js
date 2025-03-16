const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const { authenticateJWT } = require('../middleware/auth');
const router = express.Router();

// Get user profile
router.get('/profile', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Regenerate API key
router.post('/regenerate-api-key', authenticateJWT, async (req, res) => {
  try {
    const newApiKey = crypto.randomBytes(32).toString('hex');
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { apiKey: newApiKey },
      { new: true }
    ).select('-password');
    
    res.status(200).json({
      message: 'API key regenerated successfully',
      apiKey: user.apiKey
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update ZKP public key
router.post('/update-zkp-key', authenticateJWT, async (req, res) => {
  try {
    const { zkpPublicKey } = req.body;
    
    if (!zkpPublicKey) {
      return res.status(400).json({ message: 'ZKP public key is required' });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { zkpPublicKey },
      { new: true }
    ).select('-password');
    
    res.status(200).json({
      message: 'ZKP public key updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Clean up null API keys (admin function)
router.post('/cleanup-api-keys', authenticateJWT, async (req, res) => {
  try {
    // Check if user is admin (you might want to add an admin field to the User model)
    const user = await User.findById(req.user.id);
    if (!user || user.username !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    
    // Find users with null API keys
    const usersWithNullKeys = await User.find({ apiKey: null });
    
    // Update each user with a new API key
    for (const user of usersWithNullKeys) {
      user.apiKey = crypto.randomBytes(32).toString('hex');
      await user.save();
    }
    
    res.status(200).json({
      message: 'API keys cleanup completed',
      updatedCount: usersWithNullKeys.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;