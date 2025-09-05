const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const aiService = require('../services/aiService');

/**
 * @route   GET /api/settings
 * @desc    Get all settings
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const allSettings = await Settings.find();
    
    // Convert to a more frontend-friendly format
    // and mask sensitive settings
    const formattedSettings = {};
    
    allSettings.forEach(setting => {
      let value = setting.value;
      
      // Mask sensitive information like API keys
      if (setting.isEncrypted && typeof value === 'string' && value.length > 0) {
        value = `${value.substring(0, 3)}${'•'.repeat(10)}`;
      }
      
      formattedSettings[setting.key] = {
        value,
        type: setting.type,
        description: setting.description
      };
    });
    
    res.json(formattedSettings);
  } catch (error) {
    console.error('Error getting settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

/**
 * @route   PUT /api/settings
 * @desc    Update multiple settings at once
 * @access  Public
 */
router.put('/', async (req, res) => {
  try {
    const updates = req.body;
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No settings provided' });
    }
    
    // Process each setting update
    const updatePromises = Object.keys(updates).map(async (key) => {
      const value = updates[key];
      
      // Special handling for the OpenAI API key
      if (key === 'openaiApiKey' && value) {
        await aiService.updateApiKey(value);
        return;
      }
      
      // Get the existing setting to preserve type and other metadata
      const existingSetting = await Settings.findOne({ key });
      
      if (existingSetting) {
        existingSetting.value = value;
        return existingSetting.save();
      } else {
        // Determine type for new settings
        let type = 'string';
        if (typeof value === 'boolean') type = 'boolean';
        else if (typeof value === 'number') type = 'number';
        else if (typeof value === 'object') type = 'object';
        
        return Settings.create({
          key,
          value,
          type,
          description: `Setting for ${key}`
        });
      }
    });
    
    await Promise.all(updatePromises);
    
    // Get updated settings
    const updatedSettings = await Settings.find();
    
    // Format for response
    const formattedSettings = {};
    updatedSettings.forEach(setting => {
      let value = setting.value;
      
      if (setting.isEncrypted && typeof value === 'string' && value.length > 0) {
        value = `${value.substring(0, 3)}${'•'.repeat(10)}`;
      }
      
      formattedSettings[setting.key] = {
        value,
        type: setting.type,
        description: setting.description
      };
    });
    
    res.json(formattedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

/**
 * @route   PUT /api/settings/:key
 * @desc    Update a specific setting
 * @access  Public
 */
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }
    
    // Special handling for OpenAI API key
    if (key === 'openaiApiKey') {
      await aiService.updateApiKey(value);
    }
    
    // Get the existing setting
    const existingSetting = await Settings.findOne({ key });
    
    if (existingSetting) {
      existingSetting.value = value;
      await existingSetting.save();
    } else {
      // Determine type for new setting
      let type = 'string';
      if (typeof value === 'boolean') type = 'boolean';
      else if (typeof value === 'number') type = 'number';
      else if (typeof value === 'object') type = 'object';
      
      await Settings.create({
        key,
        value,
        type,
        description: `Setting for ${key}`
      });
    }
    
    // Return the updated setting (mask if needed)
    let responseValue = value;
    const setting = await Settings.findOne({ key });
    
    if (setting.isEncrypted && typeof value === 'string' && value.length > 0) {
      responseValue = `${value.substring(0, 3)}${'•'.repeat(10)}`;
    }
    
    res.json({ 
      key,
      value: responseValue,
      type: setting.type,
      description: setting.description
    });
  } catch (error) {
    console.error(`Error updating setting ${req.params.key}:`, error);
    res.status(500).json({ error: `Failed to update setting ${req.params.key}` });
  }
});

module.exports = router;
