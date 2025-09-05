/**
 * Utility functions for debugging and testing
 */

const fs = require('fs');
const path = require('path');

/**
 * Save QR code data URL to a file for debugging purposes
 */
const saveQrCodeToFile = (qrCodeDataUrl) => {
  if (!qrCodeDataUrl) {
    console.log('No QR code data URL provided');
    return false;
  }
  
  try {
    // Create debug directory if it doesn't exist
    const debugDir = path.join(__dirname, '../debug');
    if (!fs.existsSync(debugDir)) {
      fs.mkdirSync(debugDir, { recursive: true });
    }
    
    // Write the QR code to a text file
    const qrFilePath = path.join(debugDir, 'qr-data-url.txt');
    fs.writeFileSync(qrFilePath, qrCodeDataUrl);
    
    // If it's a data URL, also save as image
    if (qrCodeDataUrl.startsWith('data:image')) {
      const base64Data = qrCodeDataUrl.split(',')[1];
      if (base64Data) {
        const buffer = Buffer.from(base64Data, 'base64');
        const imgFilePath = path.join(debugDir, 'qr-code.png');
        fs.writeFileSync(imgFilePath, buffer);
        console.log(`QR code saved as image: ${imgFilePath}`);
      }
    }
    
    console.log(`QR code data URL saved to: ${qrFilePath}`);
    return true;
  } catch (err) {
    console.error('Error saving QR code to file:', err);
    return false;
  }
};

/**
 * Test function to generate a simple QR code and save it to file
 */
const generateTestQrCode = async () => {
  try {
    const qrcode = require('qrcode');
    const testText = 'https://example.com/test-qr-code';
    
    // Generate QR code as data URL
    const qrDataUrl = await qrcode.toDataURL(testText);
    
    // Save to file
    return saveQrCodeToFile(qrDataUrl);
  } catch (err) {
    console.error('Error generating test QR code:', err);
    return false;
  }
};

module.exports = {
  saveQrCodeToFile,
  generateTestQrCode
};
