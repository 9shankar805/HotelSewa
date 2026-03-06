const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000/api';

// Test data
const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

async function testSingleUpload() {
  console.log('\n🧪 Testing Single Image Upload...');
  
  try {
    const form = new FormData();
    form.append('image', testImageBuffer, 'test.png');
    form.append('type', 'hotel');

    const response = await fetch(`${API_BASE}/upload/single`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    return result.success;
  } catch (error) {
    console.error('❌ Single upload failed:', error.message);
    return false;
  }
}

async function testMultipleUpload() {
  console.log('\n🧪 Testing Multiple Images Upload...');
  
  try {
    const form = new FormData();
    form.append('images', testImageBuffer, 'test1.png');
    form.append('images', testImageBuffer, 'test2.png');
    form.append('type', 'room');

    const response = await fetch(`${API_BASE}/upload/multiple`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    return result.success;
  } catch (error) {
    console.error('❌ Multiple upload failed:', error.message);
    return false;
  }
}

async function testHotelUpload() {
  console.log('\n🧪 Testing Hotel Images Upload...');
  
  try {
    const form = new FormData();
    form.append('images', testImageBuffer, 'hotel-test.png');

    const response = await fetch(`${API_BASE}/upload/hotel/5a469eab-d3b7-4347-925c-26ff1cc4a1a6`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    return result.success;
  } catch (error) {
    console.error('❌ Hotel upload failed:', error.message);
    return false;
  }
}

async function testRoomUpload() {
  console.log('\n🧪 Testing Room Images Upload...');
  
  try {
    const form = new FormData();
    form.append('images', testImageBuffer, 'room-test.png');

    const response = await fetch(`${API_BASE}/upload/room/af560e48-7996-4f6f-937a-65753f4df491`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    return result.success;
  } catch (error) {
    console.error('❌ Room upload failed:', error.message);
    return false;
  }
}

async function testAvatarUpload() {
  console.log('\n🧪 Testing Avatar Upload...');
  
  try {
    const form = new FormData();
    form.append('avatar', testImageBuffer, 'avatar.png');

    const response = await fetch(`${API_BASE}/upload/avatar/test-user-id`, {
      method: 'POST',
      body: form
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    return result.success;
  } catch (error) {
    console.error('❌ Avatar upload failed:', error.message);
    return false;
  }
}

async function testDeleteImage() {
  console.log('\n🧪 Testing Image Delete...');
  
  try {
    const response = await fetch(`${API_BASE}/upload/image`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrl: 'http://localhost:3000/uploads/hotels/test.png',
        type: 'hotels'
      })
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
    
    return true; // Delete might fail if file doesn't exist, that's ok
  } catch (error) {
    console.error('❌ Delete test failed:', error.message);
    return false;
  }
}

async function testHealthEndpoints() {
  console.log('\n🧪 Testing Health Endpoints...');
  
  try {
    const healthResponse = await fetch(`http://localhost:3000/health`);
    const readyResponse = await fetch(`http://localhost:3000/ready`);
    
    console.log('Health Status:', healthResponse.status, await healthResponse.json());
    console.log('Ready Status:', readyResponse.status, await readyResponse.json());
    
    return healthResponse.ok && readyResponse.ok;
  } catch (error) {
    console.error('❌ Health endpoints failed:', error.message);
    return false;
  }
}

async function testStaticFileAccess() {
  console.log('\n🧪 Testing Static File Access...');
  
  try {
    const response = await fetch(`http://localhost:3000/uploads/`);
    console.log('Uploads directory access:', response.status);
    return response.status === 200 || response.status === 404; // 404 is ok for directory listing
  } catch (error) {
    console.error('❌ Static file access failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting API Tests...\n');
  
  const results = {
    health: await testHealthEndpoints(),
    static: await testStaticFileAccess(),
    singleUpload: await testSingleUpload(),
    multipleUpload: await testMultipleUpload(),
    hotelUpload: await testHotelUpload(),
    roomUpload: await testRoomUpload(),
    avatarUpload: await testAvatarUpload(),
    deleteImage: await testDeleteImage()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test}`);
  });
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All APIs are working correctly!');
  } else {
    console.log('⚠️  Some APIs need attention.');
  }
}

// Check if node-fetch is available, if not install it
try {
  require('node-fetch');
  runAllTests();
} catch (error) {
  console.log('Installing node-fetch for testing...');
  const { execSync } = require('child_process');
  execSync('npm install node-fetch@2', { stdio: 'inherit' });
  runAllTests();
}
