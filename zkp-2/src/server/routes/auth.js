const express = require('express');
const jwt = require('jsonwebtoken');
const CryptoJS = require('crypto-js');
const User = require('../models/User');
const router = express.Router();
const { Blockchain, Block } = require('../blockchain');
const NodeRSA = require('node-rsa');

// Helper function to encrypt password
const encryptPassword = (password) => {
  return CryptoJS.AES.encrypt(password, process.env.ENCRYPTION_KEY).toString();
};

// Helper function to decrypt password
const decryptPassword = (encryptedPassword) => {
  const bytes = CryptoJS.AES.decrypt(encryptedPassword, process.env.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

const generateKeyPair = () => {
  const key = new NodeRSA({ b: 2048 });
  const publicKey = key.exportKey('public');
  const privateKey = key.exportKey('private');
  return { publicKey, privateKey };
};

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    
    // Encrypt password
    const encryptedPassword = encryptPassword(password);
    
    // Generate key pair
    const { publicKey, privateKey } = generateKeyPair();

    // Create new user
    const newUser = new User({
      username,
      email,
      password: encryptedPassword,
      zkpPublicKey: publicKey
    });
    
    await newUser.save();

    // Add public key to blockchain
    const newBlock = new Block(Blockchain.chain.length, Date.now(), publicKey);
    Blockchain.addBlock(newBlock);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      privateKey,
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        apiKey: newUser.apiKey
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password, privateKey } = req.body; // Include private key

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Decrypt and verify password
    const decryptedPassword = decryptPassword(user.password);
    if (password !== decryptedPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify private key
    const key = new NodeRSA(privateKey);
    const derivedPublicKey = key.exportKey('public');
    if (derivedPublicKey !== user.zkpPublicKey) {
      return res.status(401).json({ message: 'Invalid private key' });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        apiKey: user.apiKey
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;