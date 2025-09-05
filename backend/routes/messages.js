const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const whatsappService = require('../services/whatsappService');
const { v4: uuidv4 } = require('uuid');

/**
 * @route   GET /api/messages
 * @desc    Get all messages with pagination
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const messages = await Message.find()
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    const totalCount = await Message.countDocuments();
    
    res.json({
      messages,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

/**
 * @route   GET /api/messages/filter
 * @desc    Get filtered messages by phone number, date range, etc.
 * @access  Public
 */
router.get('/filter', async (req, res) => {
  try {
    const { phone, startDate, endDate, sender } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Build filter query
    const filter = {};
    
    if (phone) {
      filter.from = { $regex: phone, $options: 'i' };
    }
    
    if (sender) {
      filter.sender = sender;
    }
    
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }
    
    const messages = await Message.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
    
    const totalCount = await Message.countDocuments(filter);
    
    res.json({
      messages,
      pagination: {
        totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error filtering messages:', error);
    res.status(500).json({ error: 'Failed to filter messages' });
  }
});

/**
 * @route   POST /api/messages/send
 * @desc    Send a message to a specific phone number
 * @access  Public
 */
router.post('/send', async (req, res) => {
  try {
    const { to, text } = req.body;
    
    if (!to || !text) {
      return res.status(400).json({ error: 'Phone number and message text are required' });
    }
    
    // Ensure phone number is in correct format
    const formattedPhone = to.includes('@c.us') ? to : `${to.replace(/[^0-9]/g, '')}@c.us`;
    
    const result = await whatsappService.sendMessage(formattedPhone, text);
    
    if (result.success) {
      res.json(result.message);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

module.exports = router;
