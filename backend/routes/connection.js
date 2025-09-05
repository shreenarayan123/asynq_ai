const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');
const ConnectionLog = require('../models/ConnectionLog');

/**
 * @route   GET /api/connection
 * @desc    Get WhatsApp connection status
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const status = whatsappService.getConnectionStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting connection status:', error);
    res.status(500).json({ error: 'Failed to get connection status' });
  }
});

/**
 * @route   POST /api/connection/reconnect
 * @desc    Reconnect to WhatsApp
 * @access  Public
 */
router.post('/reconnect', async (req, res) => {
  try {
    const { forceNewQR = false } = req.body;
    const success = await whatsappService.resetConnection(forceNewQR);
    if (success) {
      res.json({ 
        success: true, 
        message: forceNewQR ? 'Reconnecting to WhatsApp with new QR code...' : 'Reconnecting to WhatsApp...'
      });
    } else {
      res.status(500).json({ success: false, error: 'Failed to reconnect' });
    }
  } catch (error) {
    console.error('Error reconnecting to WhatsApp:', error);
    res.status(500).json({ success: false, error: 'Error reconnecting to WhatsApp' });
  }
});

/**
 * @route   POST /api/connection/reset
 * @desc    Force new QR code generation
 * @access  Public
 */
router.post('/reset', async (req, res) => {
  try {
    // Clear the session and force new QR code
    const success = await whatsappService.resetConnection(true);
    if (success) {
      res.json({ 
        success: true, 
        message: 'WhatsApp session cleared, generating new QR code...'
      });
    } else {
      res.status(500).json({ success: false, error: 'Failed to reset session' });
    }
  } catch (error) {
    console.error('Error resetting WhatsApp session:', error);
    res.status(500).json({ success: false, error: 'Error resetting WhatsApp session' });
  }
});

/**
 * @route   GET /api/connection/logs
 * @desc    Get connection logs
 * @access  Public
 */
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const logs = await ConnectionLog.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('-qrCode');
    
    res.json(logs);
  } catch (error) {
    console.error('Error getting connection logs:', error);
    res.status(500).json({ error: 'Failed to get connection logs' });
  }
});

module.exports = router;
