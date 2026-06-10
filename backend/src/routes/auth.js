import express from 'express';
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'workclaw_super_secret_hackathon_key';

// In-memory store for nonces (in production use Redis or DB)
const nonces = {};

// 1. Generate a nonce for the wallet to sign
router.get('/nonce', (req, res) => {
  const { address } = req.query;
  if (!address) return res.status(400).json({ error: 'Address required' });

  // Generate a random 32-byte nonce
  const nonce = ethers.hexlify(ethers.randomBytes(32));
  nonces[address.toLowerCase()] = nonce;
  
  res.json({ nonce });
});

// 2. Verify signature and login
router.post('/verify', async (req, res) => {
  try {
    const { address, signature } = req.body;
    if (!address || !signature) {
      return res.status(400).json({ error: 'Address and signature required' });
    }

    const lowerAddress = address.toLowerCase();
    const nonce = nonces[lowerAddress];

    if (!nonce) {
      return res.status(400).json({ error: 'Invalid or expired nonce' });
    }

    // SIWE Standard Message Format
    const message = `Welcome to WorkClaw!\n\nClick to sign in and accept the WorkClaw Terms of Service.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nWallet address:\n${address}\n\nNonce:\n${nonce}`;

    // Verify signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== lowerAddress) {
      return res.status(401).json({ error: 'Signature verification failed' });
    }

    // Clear nonce
    delete nonces[lowerAddress];

    // Find or create User
    let [user, created] = await User.findOrCreate({
      where: { walletAddress: lowerAddress },
      defaults: {
        role: 'Freelancer', // default role
        name: `User ${lowerAddress.substring(0, 6)}`,
      }
    });

    // Generate JWT
    const token = jwt.sign(
      { walletAddress: user.walletAddress, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user
    });

  } catch (error) {
    console.error('Auth Verify Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Middleware to protect routes
export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { walletAddress, role, iat, exp }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export default router;
