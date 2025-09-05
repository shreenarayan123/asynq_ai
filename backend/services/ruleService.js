import { v4 as uuidv4 } from 'uuid';
import Rule from '../models/Rule.js';

/**
 * Get all rules
 */
const getAllRules = async () => {
  try {
    return await Rule.find().sort({ priority: -1, createdAt: -1 });
  } catch (error) {
    console.error('Error getting rules:', error);
    return [];
  }
};

/**
 * Get rule by ID
 */
const getRuleById = async (ruleId) => {
  try {
    return await Rule.findOne({ id: ruleId });
  } catch (error) {
    console.error(`Error getting rule with ID ${ruleId}:`, error);
    return null;
  }
};

/**
 * Create a new rule
 */
const createRule = async (ruleData) => {
  try {
    const newRule = {
      id: uuidv4(),
      keyword: ruleData.keyword,
      response: ruleData.response,
      isActive: ruleData.isActive ?? true,
      matchType: ruleData.matchType || 'contains'
    };
    return await new Rule(newRule).save();
  } catch (error) {
    console.error('Error creating rule:', error);
    throw error;
  }
};

/**
 * Update rule
 */
const updateRule = async (ruleId, ruleData) => {
  try {
    const rule = await Rule.findOne({ id: ruleId });
    if (!rule) return null;

    Object.assign(rule, ruleData);
    return await rule.save();
  } catch (error) {
    console.error(`Error updating rule ${ruleId}:`, error);
    throw error;
  }
};

/**
 * Delete rule
 */
const deleteRule = async (ruleId) => {
  try {
    const result = await Rule.deleteOne({ id: ruleId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error(`Error deleting rule ${ruleId}:`, error);
    throw error;
  }
};

/**
 * Find matching rule for a message
 */
const findMatchingRule = async (message) => {
  try {
    const rules = await Rule.find({ isActive: true }).sort({ priority: -1 });
    if (!rules.length) {
      await createDefaultRules();
      return findMatchingRule(message);
    }
    return rules.find(rule => doesRuleMatch(rule, message)) || null;
  } catch (error) {
    console.error('Error finding matching rule:', error);
    return null;
  }
};

/**
 * Create default rules
 */
const createDefaultRules = async () => {
  const defaults = [
    { keyword: 'hello', response: 'Hii bro' },
    { keyword: 'hi', response: 'Hola' },
    { keyword: 'pricing', response: 'Our pricing starts at $10/month.' },
    { keyword: 'help', response: 'for what' }
  ];
  for (const data of defaults) {
    await createRule({ ...data, isActive: true, matchType: 'contains' });
  }
};

/**
 * Check if rule matches message
 */
const doesRuleMatch = (rule, message) => {
  const text = rule.caseSensitive ? message : message.toLowerCase();
  const keyword = rule.caseSensitive ? rule.keyword : rule.keyword.toLowerCase();

  switch (rule.matchType) {
    case 'exact': return text === keyword;
    case 'contains': return text.includes(keyword);
    case 'starts_with': return text.startsWith(keyword);
    case 'ends_with': return text.endsWith(keyword);
    case 'regex':
      try {
        return new RegExp(keyword, rule.caseSensitive ? '' : 'i').test(text);
      } catch {
        return false;
      }
    default: return text.includes(keyword);
  }
};

/**
 * Update rule usage stats
 */
const updateRuleUsage = async (ruleId) => {
  try {
    await Rule.updateOne(
      { id: ruleId },
      { $inc: { usageCount: 1 }, $set: { lastUsed: new Date() } }
    );
  } catch (error) {
    console.error(`Error updating usage for rule ${ruleId}:`, error);
  }
};

export {
  getAllRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
  findMatchingRule,
  updateRuleUsage,
  createDefaultRules
};
