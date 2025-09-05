#!/usr/bin/env node

/**
 * Test script to generate a QR code and ensure the QR code generation is working properly
 */

require('dotenv').config();
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

async function testQrGeneration() {
  try {
    console.log('Testing QR code generation...');
    
    // Generate QR code for a test string
    const testData = 'This is a test QR code for WhatsApp Auto-Reply Bot';
    
    // Generate as a data URL
    console.log('Generating data URL...');
    const dataUrl = await qrcode.toDataURL(testData);
    console.log('Data URL generated, length:', dataUrl.length);
    
    // Generate as a file
    console.log('Generating QR code image file...');
    const qrImagePath = path.join(__dirname, 'test-qr.png');
    await qrcode.toFile(qrImagePath, testData);
    console.log(`QR code image saved to: ${qrImagePath}`);
    
    // Generate to terminal
    console.log('Generating QR code in terminal:');
    const terminalQr = await qrcode.toString(testData, { type: 'terminal' });
    console.log(terminalQr);
    
    console.log('All QR code generation tests passed successfully!');
    return true;
  } catch (error) {
    console.error('QR code generation test failed:', error);
    return false;
  }
}

// Run the test
testQrGeneration()
  .then(success => {
    console.log('Test completed with result:', success);
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
