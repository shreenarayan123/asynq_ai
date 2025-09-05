const { v4: uuidv4 } = require('uuid');
const Rule = require('../models/Rule');

/**
 * Find all rules
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
 * Find rule by ID
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
      isActive: ruleData.isActive !== undefined ? ruleData.isActive : true,
      matchType: ruleData.matchType || 'contains',
      caseSensitive: ruleData.caseSensitive || false,
      priority: ruleData.priority || 0
    };
    
    const rule = new Rule(newRule);
    return await rule.save();
  } catch (error) {
    console.error('Error creating rule:', error);
    throw error;
  }
};

/**
 * Update an existing rule
 */
const updateRule = async (ruleId, ruleData) => {
  try {
    const rule = await Rule.findOne({ id: ruleId });
    
    if (!rule) {
      return null;
    }
    
    // Update only provided fields
    if (ruleData.keyword !== undefined) rule.keyword = ruleData.keyword;
    if (ruleData.response !== undefined) rule.response = ruleData.response;
    if (ruleData.isActive !== undefined) rule.isActive = ruleData.isActive;
    if (ruleData.matchType !== undefined) rule.matchType = ruleData.matchType;
    if (ruleData.caseSensitive !== undefined) rule.caseSensitive = ruleData.caseSensitive;
    if (ruleData.priority !== undefined) rule.priority = ruleData.priority;
    
    return await rule.save();
  } catch (error) {
    console.error(`Error updating rule with ID ${ruleId}:`, error);
    throw error;
  }
};

/**
 * Delete a rule
 */
const deleteRule = async (ruleId) => {
  try {
    const result = await Rule.deleteOne({ id: ruleId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error(`Error deleting rule with ID ${ruleId}:`, error);
    throw error;
  }
};

/**
 * Find a rule that matches the message
 */
const findMatchingRule = async (message) => {
  try {
    console.log(`Finding rule match for message: "${message}"`);
    
    // Get all active rules sorted by priority
    const rules = await Rule.find({ isActive: true }).sort({ priority: -1 });
    console.log(`Found ${rules.length} active rules to check against`);
    
    if (rules.length === 0) {
      console.log('No rules found in database! Creating default rules...');
      await createDefaultRules();
      // Try again with the newly created rules
      const newRules = await Rule.find({ isActive: true }).sort({ priority: -1 });
      console.log(`Created default rules, now have ${newRules.length} rules`);
      
      // Test each new rule against the message
      for (const rule of newRules) {
        console.log(`Testing rule: "${rule.keyword}" (${rule.matchType})`);
        if (doesRuleMatch(rule, message)) {
          console.log(`Rule matched: "${rule.keyword}" -> "${rule.response}"`);
          return rule;
        }
      }
    } else {
      // Test each rule against the message
      for (const rule of rules) {
        console.log(`Testing rule: "${rule.keyword}" (${rule.matchType})`);
        if (doesRuleMatch(rule, message)) {
          console.log(`Rule matched: "${rule.keyword}" -> "${rule.response}"`);
          return rule;
        }
      }
    }
    
    console.log('No matching rule found');
    return null;
  } catch (error) {
    console.error('Error finding matching rule:', error);
    return null;
  }
};

/**
 * Create default rules if none exist
 */
const createDefaultRules = async () => {
  try {
    // Default rules for common queries
    const defaultRules = [
      {
        keyword: 'hello',
        response: 'Hello! How can I assist you today?',
        isActive: true,
        matchType: 'contains',
        caseSensitive: false,
        priority: 5
      },
      {
        keyword: 'hi',
        response: 'Hi there! How may I help you?',
        isActive: true,
        matchType: 'contains',
        caseSensitive: false,
        priority: 5
      },
      {
        keyword: 'pricing',
        response: 'Our pricing starts at $10/month for basic plan. For more details, please visit our website or contact our sales team.',
        isActive: true,
        matchType: 'contains',
        caseSensitive: false,
        priority: 10
      },
      {
        keyword: 'help',
        response: 'I can help you with information about our services, pricing, support, or answer general questions. Just let me know what you need!',
        isActive: true,
        matchType: 'contains',
        caseSensitive: false,
        priority: 5
      }
    ];
    
    // Create each default rule
    for (const ruleData of defaultRules) {
      await createRule(ruleData);
      console.log(`Created default rule for keyword: "${ruleData.keyword}"`);
    }
    
    return true;
  } catch (error) {
    console.error('Error creating default rules:', error);
    return false;
  }
};

/**
 * Test if a rule matches the message text
 */
const doesRuleMatch = (rule, message) => {
  const keyword = rule.keyword;
  const text = rule.caseSensitive ? message : message.toLowerCase();
  const matchKeyword = rule.caseSensitive ? keyword : keyword.toLowerCase();
  
  let matches = false;
  switch (rule.matchType) {
    case 'exact':
      matches = text === matchKeyword;
      console.log(`Exact match test: "${text}" === "${matchKeyword}" => ${matches}`);
      return matches;
    case 'contains':
      matches = text.includes(matchKeyword);
      console.log(`Contains test: "${text}" includes "${matchKeyword}" => ${matches}`);
      return matches;
    case 'starts_with':
      matches = text.startsWith(matchKeyword);
      console.log(`Starts with test: "${text}" startsWith "${matchKeyword}" => ${matches}`);
      return matches;
    case 'ends_with':
      matches = text.endsWith(matchKeyword);
      console.log(`Ends with test: "${text}" endsWith "${matchKeyword}" => ${matches}`);
      return matches;
    case 'regex':
      try {
        const regex = new RegExp(matchKeyword, rule.caseSensitive ? '' : 'i');
        matches = regex.test(text);
        console.log(`Regex test: /${matchKeyword}/${rule.caseSensitive ? '' : 'i'} against "${text}" => ${matches}`);
        return matches;
      } catch (err) {
        console.error('Invalid regex pattern:', err);
        return false;
      }
    default:
      matches = text.includes(matchKeyword);
      console.log(`Default (contains) test: "${text}" includes "${matchKeyword}" => ${matches}`);
      return matches;
  }
};

/**
 * Update rule usage statistics
 */
const updateRuleUsage = async (ruleId) => {
  try {
    await Rule.updateOne(
      { id: ruleId },
      {
        $inc: { usageCount: 1 },
        $set: { lastUsed: new Date() }
      }
    );
  } catch (error) {
    console.error(`Error updating usage for rule ${ruleId}:`, error);
  }
};

module.exports = {
  getAllRules,
  getRuleById,
  createRule,
  updateRule,
  deleteRule,
  findMatchingRule,
  updateRuleUsage,
  createDefaultRules
};
