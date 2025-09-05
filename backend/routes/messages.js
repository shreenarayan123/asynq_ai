import express from 'express';
import Message from '../models/Message.js';
import * as whatsappService from '../services/whatsappService.js';

const router = express.Router();


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

router.post('/send', async (req, res) => {
  try {
    const { to, text } = req.body;
    
    if (!to || !text) {
      return res.status(400).json({ error: 'Phone number and message text are required' });
    }
    
   
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

export default router;
