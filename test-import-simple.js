const axios = require('axios');

async function testImport() {
  try {
    console.log('🔐 Creating test user...');
    
    // Create test user
    try {
      await axios.post('http://localhost:5001/api/signup', {
        username: 'testuser',
        password: 'testpass'
      });
      console.log('✅ Test user created');
    } catch (e) {
      console.log('📝 Test user may already exist, continuing...');
    }
    
    // Login
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5001/api/login', {
      username: 'testuser',
      password: 'testpass'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Test import
    console.log('📊 Testing Google Sheets import...');
    const importResponse = await axios.post('http://localhost:5001/api/import-google-sheet', {
      sheetId: '1Cw-RYG4e060Y8P7jkglqWvq04SRRtufD9WOCcKo-sB4',
      sheetName: 'CurrentVersion'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Import successful!');
    console.log(importResponse.data);
    
  } catch (error) {
    console.log('❌ Test failed:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data);
    
    if (error.response?.data?.message?.includes('credentials') || !process.env.GOOGLE_PRIVATE_KEY) {
      console.log('\n🔑 Service account credentials are required:');
      console.log('Please add these to your .env file:');
      console.log('GOOGLE_PRIVATE_KEY_ID=your_private_key_id');
      console.log('GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nyour_key\\n-----END PRIVATE KEY-----"');
      console.log('GOOGLE_CLIENT_ID=your_client_id');
    }
  }
}

testImport();