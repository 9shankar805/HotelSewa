const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

// Simple test with actual image file
async function testUploads() {
  console.log('🧪 Testing Upload APIs with corrected URLs...\n');

  // Test 1: Single upload
  console.log('1. Testing Single Upload...');
  try {
    const FormData = require('form-data');
    const fs = require('fs');
    
    // Create a simple test image file
    const testImagePath = 'test-image.png';
    const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(testImagePath, testImageBuffer);

    const form = new FormData();
    form.append('image', fs.createReadStream(testImagePath), 'test.png');
    form.append('type', 'hotel');

    const response = await fetch(`${API_BASE}/upload/single`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Success:', result.success);
    console.log('URL:', result.data?.url);
    console.log('Port check:', result.data?.url.includes(':3000') ? '✅ Correct port' : '❌ Wrong port');
    
    // Clean up
    fs.unlinkSync(testImagePath);
    
  } catch (error) {
    console.error('❌ Single upload failed:', error.message);
  }

  // Test 2: Health check
  console.log('\n2. Testing Health...');
  try {
    const response = await fetch('http://localhost:3000/health');
    const result = await response.json();
    console.log('Health:', response.ok ? '✅ OK' : '❌ Failed', result);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }

  // Test 3: Static file access
  console.log('\n3. Testing Static Files...');
  try {
    const response = await fetch('http://localhost:3000/uploads/');
    console.log('Uploads directory:', response.status === 404 ? '✅ Protected' : '❌ Exposed');
  } catch (error) {
    console.error('❌ Static test failed:', error.message);
  }

  console.log('\n🎯 Basic tests completed!');
}

testUploads();
