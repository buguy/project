const axios = require('axios');

async function testFrontendAuth() {
  try {
    console.log('🔐 Testing frontend authentication flow...\n');
    
    // Step 1: Login to get a fresh token
    console.log('1. Logging in...');
    const loginResponse = await axios.post('http://localhost:5001/api/login', {
      username: 'testuser2',
      password: 'testpass2'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('📋 Token preview:', token.substring(0, 50) + '...');
    
    // Step 2: Test accessing protected route (bugs list)
    console.log('\n2. Testing protected route (bugs list)...');
    const bugsResponse = await axios.get('http://localhost:5001/api/bugs?page=1&limit=5', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Bugs API working');
    console.log('📊 Found', bugsResponse.data.bugs.length, 'bugs');
    
    // Step 3: Test Google Sheets import
    console.log('\n3. Testing Google Sheets import...');
    const importResponse = await axios.post('http://localhost:5001/api/import-google-sheet', {
      sheetId: '1Cw-RYG4e060Y8P7jkglqWvq04SRRtufD9WOCcKo-sB4',
      sheetName: 'CurrentVersion'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Import successful!');
    console.log('📊 Import result:', importResponse.data);
    
  } catch (error) {
    console.log('❌ Authentication test failed:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔍 Token Issue Detected:');
      console.log('This suggests either:');
      console.log('- JWT token is malformed');
      console.log('- JWT secret mismatch between client and server');
      console.log('- Token has expired');
      console.log('- Authorization header format is incorrect');
    }
  }
}

testFrontendAuth();