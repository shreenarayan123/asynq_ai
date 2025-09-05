import express from 'express';
import Settings from '../models/Settings.js';
import * as aiService from '../services/aiService.js';

const router = express.Router();

// Get all settings
router.get('/', async (req, res) => {
  try {
    const allSettings = await Settings.find();
    const formattedSettings = {};

    allSettings.forEach(setting => {
      formattedSettings[setting.key] = {
        value: setting.value,
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

// Update multiple settings
router.put('/', async (req, res) => {
  try {
    const updates = req.body;
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No settings provided' });
    }

    const updatePromises = Object.keys(updates).map(async (key) => {
      const value = updates[key];

      if (key === 'openaiApiKey' && value) {
        await aiService.updateApiKey(value);
      }

      const existingSetting = await Settings.findOne({ key });
      if (existingSetting) {
        existingSetting.value = value;
        return existingSetting.save();
      } else {
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

    const updatedSettings = await Settings.find();
    const formattedSettings = {};
    updatedSettings.forEach(setting => {
      formattedSettings[setting.key] = {
        value: setting.value,
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

// Update a specific setting
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    if (key === 'openaiApiKey') {
      await aiService.updateApiKey(value);
    }

    let setting = await Settings.findOne({ key });
    if (setting) {
      setting.value = value;
      await setting.save();
    } else {
      let type = 'string';
      if (typeof value === 'boolean') type = 'boolean';
      else if (typeof value === 'number') type = 'number';
      else if (typeof value === 'object') type = 'object';

      setting = await Settings.create({
        key,
        value,
        type,
        description: `Setting for ${key}`
      });
    }

    res.json({
      key,
      value: setting.value,
      type: setting.type,
      description: setting.description
    });
  } catch (error) {
    console.error(`Error updating setting ${req.params.key}:`, error);
    res.status(500).json({ error: `Failed to update setting ${req.params.key}` });
  }
});

export default router;
