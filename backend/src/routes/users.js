import express from 'express';
import { User } from '../models/index.js';
import { requireAuth } from './auth.js';

const router = express.Router();

// Get logged in user profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.walletAddress);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/me', requireAuth, async (req, res) => {
  try {
    const { name, bio, skills, role, avatarUrl } = req.body;
    
    const user = await User.findByPk(req.user.walletAddress);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name) user.name = name;
    if (bio) user.bio = bio;
    if (skills) user.skills = skills;
    if (role) user.role = role;
    if (avatarUrl) user.avatarUrl = avatarUrl;

    await user.save();
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific user by wallet address
router.get('/:address', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.address.toLowerCase());
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
