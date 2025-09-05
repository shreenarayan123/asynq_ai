const Message = require('../models/Message');

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

module.exports = {
  saveMessage,
  updateMessageReply
};
