const fetch = require('node-fetch');
const FormData = require('form-data');

const API_BASE = 'http://localhost:3000/api';
const HOTEL_ID = '5a469eab-d3b7-4347-925c-26ff1cc4a1a6';

async function debugHotelUpload() {
  console.log('🔍 Debugging Hotel Upload...\n');

  try {
    const form = new FormData();
    form.append('images', Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'), 'hotel-test.png');

    const response = await fetch(`${API_BASE}/upload/hotel/${HOTEL_ID}`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Full response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugHotelUpload();
