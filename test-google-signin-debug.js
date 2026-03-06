// Test Google Sign-In API endpoint
const fetch = require('node-fetch');

async function testGoogleSignIn() {
  try {
    console.log('🧪 Testing Google Sign-In API...');
    
    // Mock Google user data (similar to what Flutter sends)
    const googleUserData = {
      email: 'testuser@gmail.com',
      name: 'Test User',
      photoUrl: 'https://lh3.googleusercontent.com/a/default-user',
      idToken: 'mock-google-id-token-12345',
      accessToken: 'mock-google-access-token-12345'
    };

    console.log('📤 Sending data:', JSON.stringify(googleUserData, null, 2));

    const response = await fetch('http://localhost:4000/api/owner-auth/google-signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(googleUserData),
    });

    const result = await response.json();
    
    console.log('📥 Response Status:', response.status);
    console.log('📥 Response Body:', JSON.stringify(result, null, 2));

    if (result.success) {
      console.log('✅ Google Sign-In test successful!');
      console.log('👤 User Name:', result.data.user.name);
      console.log('📧 User Email:', result.data.user.email);
      console.log('📱 User Phone:', result.data.user.phone);
      console.log('🖼️ Profile Image:', result.data.user.profileImage);
    } else {
      console.log('❌ Google Sign-In test failed:', result.message);
    }
  } catch (error) {
    console.error('🔴 Test failed with error:', error.message);
  }
}

testGoogleSignIn();
