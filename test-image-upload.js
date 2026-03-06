const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const http = require('http');

// Create a test image file (simple 1x1 pixel PNG)
const testImageBuffer = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
  0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00,
  0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
]);

// Test single image upload
function testSingleImageUpload() {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('image', testImageBuffer, {
      filename: 'test-exterior.png',
      contentType: 'image/png'
    });
    form.append('type', 'hotels');

    const options = {
      hostname: 'localhost',
      port: 5555,
      path: '/api/upload/single',
      method: 'POST',
      headers: {
        ...form.getHeaders()
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          console.log(`✅ Single Upload Status: ${res.statusCode}`);
          console.log(`📝 Response: ${JSON.stringify(response, null, 2)}`);
          resolve(response);
        } catch (e) {
          console.log(`❌ Failed to parse response: ${e.message}`);
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Request error: ${e.message}`);
      reject(e);
    });

    form.pipe(req);
  });
}

// Test multiple image upload
function testMultipleImageUpload() {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    
    // Add multiple test images
    for (let i = 1; i <= 3; i++) {
      form.append('images', testImageBuffer, {
        filename: `test-gallery-${i}.png`,
        contentType: 'image/png'
      });
    }
    form.append('type', 'hotels');

    const options = {
      hostname: 'localhost',
      port: 5555,
      path: '/api/upload/multiple',
      method: 'POST',
      headers: {
        ...form.getHeaders()
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          console.log(`✅ Multiple Upload Status: ${res.statusCode}`);
          console.log(`📝 Response: ${JSON.stringify(response, null, 2)}`);
          resolve(response);
        } catch (e) {
          console.log(`❌ Failed to parse response: ${e.message}`);
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      console.error(`❌ Request error: ${e.message}`);
      reject(e);
    });

    form.pipe(req);
  });
}

// Check if upload folders exist
function checkUploadFolders() {
  const folders = ['uploads/general', 'uploads/hotels', 'uploads/rooms', 'uploads/users'];
  
  console.log('📁 Checking upload folders:');
  folders.forEach(folder => {
    const exists = fs.existsSync(folder);
    console.log(`  ${exists ? '✅' : '❌'} ${folder}`);
  });
}

// Run tests
async function runImageUploadTests() {
  try {
    console.log('🧪 Testing Image Upload Functionality...\n');
    
    // Check folders
    checkUploadFolders();
    console.log('');
    
    // Test single upload
    console.log('📸 Testing single image upload...');
    await testSingleImageUpload();
    console.log('');
    
    // Test multiple upload
    console.log('📸 Testing multiple image upload...');
    await testMultipleImageUpload();
    console.log('');
    
    // Check folders again to see if files were created
    console.log('📁 Checking folders after upload:');
    checkUploadFolders();
    
    console.log('\n🎉 Image upload tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

runImageUploadTests();
