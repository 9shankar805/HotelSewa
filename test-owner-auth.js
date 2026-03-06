const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

// Test data
const testUser = {
  name: 'Test Owner',
  email: `testowner${Date.now()}@example.com`,
  password: 'password123',
  phone: '+1234567890'
};

let authToken = '';

async function testRegister() {
  console.log('\n🔵 Testing Registration...');
  try {
    const response = await axios.post(`${BASE_URL}/owner-auth/register`, testUser);
    console.log('✅ Registration successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('🔑 Token saved:', authToken.substring(0, 20) + '...');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Registration failed:', error.response?.data || error.message);
    return false;
  }
}

async function testLogin() {
  console.log('\n🔵 Testing Login...');
  try {
    const response = await axios.post(`${BASE_URL}/owner-auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    console.log('✅ Login successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('🔑 Token saved:', authToken.substring(0, 20) + '...');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetProfile() {
  console.log('\n🔵 Testing Get Profile...');
  try {
    const response = await axios.get(`${BASE_URL}/owner-auth/profile`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('✅ Get profile successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Get profile failed:', error.response?.data || error.message);
    return false;
  }
}

async function testUpdateProfile() {
  console.log('\n🔵 Testing Update Profile...');
  try {
    const response = await axios.put(`${BASE_URL}/owner-auth/profile`, {
      name: 'Updated Test Owner',
      phone: '+9876543210'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('✅ Update profile successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Update profile failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetProfileWithoutAuth() {
  console.log('\n🔵 Testing Get Profile Without Auth (should fail)...');
  try {
    const response = await axios.get(`${BASE_URL}/owner-auth/profile`);
    console.log('❌ Should have failed but succeeded:', response.data);
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly rejected unauthorized request');
      return true;
    }
    console.error('❌ Unexpected error:', error.response?.data || error.message);
    return false;
  }
}

async function testLogout() {
  console.log('\n🔵 Testing Logout...');
  try {
    const response = await axios.post(`${BASE_URL}/owner-auth/logout`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('✅ Logout successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Logout failed:', error.response?.data || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Owner Auth API Tests...');
  console.log('Base URL:', BASE_URL);
  
  const results = {
    register: false,
    login: false,
    getProfile: false,
    updateProfile: false,
    unauthorizedAccess: false,
    logout: false
  };

  // Test registration
  results.register = await testRegister();
  
  if (!results.register) {
    console.log('\n⚠️ Registration failed, trying to login with existing user...');
    results.login = await testLogin();
    if (!results.login) {
      console.log('\n❌ Cannot proceed without authentication');
      return;
    }
  }

  // Test protected endpoints
  results.getProfile = await testGetProfile();
  results.updateProfile = await testUpdateProfile();
  results.unauthorizedAccess = await testGetProfileWithoutAuth();
  results.logout = await testLogout();

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(50));
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r).length;
  console.log('\n' + '='.repeat(50));
  console.log(`Total: ${passedTests}/${totalTests} tests passed`);
  console.log('='.repeat(50));
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
