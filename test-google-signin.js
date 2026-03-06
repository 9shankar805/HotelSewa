const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function testGoogleSignIn() {
  console.log('\n🔵 Testing Google Sign-In...\n');

  const testCases = [
    {
      name: 'New Google User',
      data: {
        email: `googleuser${Date.now()}@gmail.com`,
        name: 'Google Test User',
        photoUrl: 'https://example.com/photo.jpg'
      }
    },
    {
      name: 'Existing Google User',
      data: {
        email: 'googleuser@gmail.com',
        name: 'Existing Google User',
        photoUrl: 'https://example.com/photo.jpg'
      }
    },
    {
      name: 'Missing Email',
      data: {
        name: 'No Email User',
        photoUrl: 'https://example.com/photo.jpg'
      },
      shouldFail: true
    },
    {
      name: 'Minimal Data',
      data: {
        email: `minimal${Date.now()}@gmail.com`
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('Data:', JSON.stringify(testCase.data, null, 2));

    try {
      const response = await axios.post(
        `${BASE_URL}/owner-auth/google-signin`,
        testCase.data
      );

      if (testCase.shouldFail) {
        console.log('❌ Test should have failed but succeeded');
        console.log('Response:', JSON.stringify(response.data, null, 2));
      } else {
        console.log('✅ Success');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        // Verify response structure
        if (response.data.success && response.data.data) {
          const { token, user } = response.data.data;
          console.log('\n✓ Token present:', !!token);
          console.log('✓ User ID:', user.id);
          console.log('✓ User email:', user.email);
          console.log('✓ User name:', user.name);
          console.log('✓ User role:', user.role);
          console.log('✓ User verified:', user.verified);
        }
      }
    } catch (error) {
      if (testCase.shouldFail) {
        console.log('✅ Correctly failed');
        console.log('Error:', error.response?.data?.message || error.message);
      } else {
        console.log('❌ Failed unexpectedly');
        console.log('Error:', error.response?.data || error.message);
      }
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Google Sign-In Tests Complete');
  console.log('='.repeat(50));
}

// Run test
testGoogleSignIn().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
