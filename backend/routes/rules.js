const express = require('express');
const router = express.Router();
const ruleService = require('../services/ruleService');

/**
 * @route   GET /api/rules
 * @desc    Get all rules
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const rules = await ruleService.getAllRules();
    res.json(rules);
  } catch (error) {
    console.error('Error getting rules:', error);
    res.status(500).json({ error: 'Failed to get rules' });
  }
});

/**
 * @route   GET /api/rules/:id
 * @desc    Get a single rule by ID
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const rule = await ruleService.getRuleById(req.params.id);
    
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    res.json(rule);
  } catch (error) {
    console.error(`Error getting rule ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to get rule' });
  }
});

/**
 * @route   POST /api/rules
 * @desc    Create a new rule
 * @access  Public
 */
router.post('/', async (req, res) => {
  try {
    const { keyword, response, isActive, matchType, caseSensitive, priority } = req.body;
    
    if (!keyword || !response) {
      return res.status(400).json({ error: 'Keyword and response are required' });
    }
    
    const newRule = await ruleService.createRule({
      keyword,
      response,
      isActive,
      matchType,
      caseSensitive,
      priority
    });
    
    res.status(201).json(newRule);
  } catch (error) {
    console.error('Error creating rule:', error);
    res.status(500).json({ error: 'Failed to create rule' });
  }
});

/**
 * @route   PUT /api/rules/:id
 * @desc    Update an existing rule
 * @access  Public
 */
router.put('/:id', async (req, res) => {
  try {
    const { keyword, response, isActive, matchType, caseSensitive, priority } = req.body;
    
    const updatedRule = await ruleService.updateRule(req.params.id, {
      keyword,
      response,
      isActive,
      matchType,
      caseSensitive,
      priority
    });
    
    if (!updatedRule) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    res.json(updatedRule);
  } catch (error) {
    console.error(`Error updating rule ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to update rule' });
  }
});

/**
 * @route   DELETE /api/rules/:id
 * @desc    Delete a rule
 * @access  Public
 */
router.delete('/:id', async (req, res) => {
  try {
    const success = await ruleService.deleteRule(req.params.id);
    
    if (!success) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error(`Error deleting rule ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to delete rule' });
  }
});

module.exports = router;
