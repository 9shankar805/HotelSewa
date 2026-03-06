const axios = require('axios');

async function testAdminEndpoints() {
  const API_BASE = 'http://localhost:4000/api';
  
  console.log('Testing Admin API Endpoints...\n');
  
  try {
    console.log('1. Testing /admin/users...');
    const usersRes = await axios.get(`${API_BASE}/admin/users`);
    console.log(`✓ Users: ${usersRes.data.length} found`);
    console.log(usersRes.data);
  } catch (error) {
    console.log(`✗ Users endpoint failed: ${error.message}`);
  }
  
  try {
    console.log('\n2. Testing /admin/hotels/pending...');
    const hotelsRes = await axios.get(`${API_BASE}/admin/hotels/pending`);
    console.log(`✓ Hotels: ${hotelsRes.data.length} found`);
    console.log(hotelsRes.data);
  } catch (error) {
    console.log(`✗ Hotels endpoint failed: ${error.message}`);
  }
}

testAdminEndpoints();
