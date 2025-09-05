const fs = require('fs');
const path = require('path');

/**
 * Clear WhatsApp session to force new QR code generation
 */
const clearWhatsAppSession = () => {
  const sessionDir = path.resolve(__dirname, '../.wwebjs_auth');
  
  if (fs.existsSync(sessionDir)) {
    console.log('Clearing WhatsApp session directory:', sessionDir);
    fs.rmSync(sessionDir, { recursive: true, force: true });
    console.log('Session directory cleared successfully');
    return true;
  } else {
    console.log('No session directory found at:', sessionDir);
    return false;
  }
};

module.exports = {
  clearWhatsAppSession
};
