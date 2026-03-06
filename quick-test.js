const fetch = require('node-fetch');
const FormData = require('form-data');

const API_BASE = 'http://localhost:3000/api';

// Use existing hotel ID
const HOTEL_ID = '5a469eab-d3b7-4347-925c-26ff1cc4a1a6';
const USER_ID = '2fe78aaa-75c9-4b3e-adc0-e6c5c20f2761';

async function quickTest() {
  console.log('🧪 Quick Test with Real Data\n');

  // Test hotel upload with existing hotel
  console.log('1. Testing Hotel Upload...');
  try {
    const form = new FormData();
    form.append('images', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'), 'hotel-test.png');

    const response = await fetch(`${API_BASE}/upload/hotel/${HOTEL_ID}`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    if (result.success) {
      console.log('✅ Hotel upload working!');
    } else {
      console.log('❌ Hotel upload failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Hotel upload error:', error.message);
  }

  // Test avatar upload
  console.log('\n2. Testing Avatar Upload...');
  try {
    const form = new FormData();
    form.append('avatar', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'), 'avatar.png');

    const response = await fetch(`${API_BASE}/upload/avatar/${USER_ID}`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Success:', result.success);
    console.log('Message:', result.message);
    if (result.success) {
      console.log('✅ Avatar upload working!');
    } else {
      console.log('❌ Avatar upload failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Avatar upload error:', error.message);
  }

  console.log('\n🎯 Quick test completed!');
}

quickTest();
