import Message from '../models/Message.js';

/**
 * Check if a string contains only emojis
 */
const isOnlyEmojis = (text) => {
  const emojiRegex = /^[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F9B0}-\u{1F9B3}]+$/u;
  return emojiRegex.test(text.trim());
};

/**
 * Check if a string contains any emojis
 */
const containsEmoji = (text) => {
  const emojiRegex = /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F9B0}-\u{1F9B3}]/u;
  return emojiRegex.test(text);
};

/**
 * Get the type of message for different handling
 */
const getMessageType = (text) => {
  const normalizedText = text.trim().toLowerCase();
  
  if (isOnlyEmojis(text)) {
    return 'emoji_only';
  }
  
  if (normalizedText.length <= 5) {
    return 'short_text';
  }
  
  if (containsEmoji(text)) {
    return 'text_with_emoji';
  }
  
  return 'regular_text';
};

/**
 * Clean and normalize message text
 */
const normalizeMessage = (text) => {
  return text.trim();
};

/**
 * Save a message while handling potential duplicates
 */
const saveMessage = async (messageData) => {
  try {
    // Check if message already exists
    const existingMessage = await Message.findOne({
      whatsappMessageId: messageData.whatsappMessageId
    });
    
    if (existingMessage) {
      console.log('Message already exists:', messageData.whatsappMessageId);
      return existingMessage;
    }
    
    // Create new message if it doesn't exist
    const newMessage = new Message(messageData);
    const savedMessage = await newMessage.save();
    console.log('New message saved:', savedMessage.id);
    return savedMessage;
  } catch (error) {
    console.error('Error saving message:', error);
    // If it's a duplicate key error, try to find and return the existing message
    if (error.code === 11000) {
      return await Message.findOne({
        whatsappMessageId: messageData.whatsappMessageId
      });
    }
    throw error;
  }
};

/**
 * Update message reply status
 */
const updateMessageReply = async (messageId, replyId) => {
  try {
    await Message.findByIdAndUpdate(messageId, {
      isReplied: true,
      replyId: replyId
    });
    return true;
  } catch (error) {
    console.error('Error updating message reply status:', error);
    return false;
  }
};

export {
  saveMessage,
  updateMessageReply,
  isOnlyEmojis,
  containsEmoji,
  getMessageType,
  normalizeMessage
};
