const express = require('express');
const crypto = require('crypto');
const Verification = require('../models/Verification');
const { authenticateJWT, authenticateAPIKey } = require('../middleware/auth');
const router = express.Router();

// Create a new verification request
router.post('/request', authenticateAPIKey, async (req, res) => {
  try {
    const requestId = crypto.randomBytes(16).toString('hex');
    
    const verification = new Verification({
      userId: req.user.id,
      requestId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
    });
    
    await verification.save();
    
    res.status(201).json({
      message: 'Verification request created',
      requestId,
      expiresAt: verification.expiresAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Submit proof for verification
router.post('/submit-proof', authenticateJWT, async (req, res) => {
  try {
    const { requestId, proofData } = req.body;
    
    if (!requestId || !proofData) {
      return res.status(400).json({ message: 'Request ID and proof data are required' });
    }
    
    // Find the verification request
    const verification = await Verification.findOne({ requestId });
    
    if (!verification) {
      return res.status(404).json({ message: 'Verification request not found' });
    }
    
    if (verification.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Verification request has expired' });
    }
    
    if (verification.status !== 'pending') {
      return res.status(400).json({ message: 'Verification request is not pending' });
    }
    
    // Update verification with proof data
    verification.proofData = proofData;
    verification.status = 'verified'; // In a real system, you would verify the proof first
    await verification.save();
    
    res.status(200).json({
      message: 'Proof submitted successfully',
      status: verification.status
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check verification status
router.get('/status/:requestId', authenticateAPIKey, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const verification = await Verification.findOne({ requestId });
    
    if (!verification) {
      return res.status(404).json({ message: 'Verification request not found' });
    }
    
    res.status(200).json({
      requestId: verification.requestId,
      status: verification.status,
      createdAt: verification.createdAt,
      expiresAt: verification.expiresAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// List all verifications for a user
router.get('/list', authenticateJWT, async (req, res) => {
  try {
    const verifications = await Verification.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    
    res.status(200).json({ verifications });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Cancel a pending verification
router.delete('/:requestId', authenticateJWT, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const verification = await Verification.findOne({ 
      requestId, 
      userId: req.user.id 
    });
    
    if (!verification) {
      return res.status(404).json({ message: 'Verification request not found' });
    }
    
    if (verification.status !== 'pending') {
      return res.status(400).json({ message: 'Only pending verifications can be cancelled' });
    }
    
    verification.status = 'rejected';
    await verification.save();
    
    res.status(200).json({ message: 'Verification request cancelled' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;