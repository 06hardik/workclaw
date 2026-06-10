import express from 'express';
import { Message, User } from '../models/index.js';
import { requireAuth } from './auth.js';
import { io } from '../index.js';

const router = express.Router();

// Get all messages for a specific job
router.get('/:jobId', requireAuth, async (req, res) => {
  try {
    const messages = await Message.findAll({
      where: { jobId: req.params.jobId },
      include: [
        { model: User, attributes: ['name', 'avatarUrl', 'role', 'walletAddress'] }
      ],
      order: [['createdAt', 'ASC']],
    });
    
    res.json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new message for a job
router.post('/:jobId', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Message text required' });

    const message = await Message.create({
      jobId: req.params.jobId,
      senderAddress: req.user.walletAddress,
      text: text,
    });

    // We also fetch the user details to return a complete message object
    const completeMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, attributes: ['name', 'avatarUrl', 'role', 'walletAddress'] }
      ]
    });

    // Broadcast to everyone in the job room
    io.to(`job_${req.params.jobId}`).emit('chat:newMessage', completeMessage);

    res.json({ success: true, message: completeMessage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
