const axios = require('axios');

async function testImportWithNewUser() {
  try {
    console.log('🔐 Testing login with newly created user...');
    const loginResponse = await axios.post('http://localhost:5001/api/login', {
      username: 'testuser2',
      password: 'testpass2'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful with new user');
    
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
    console.log('Message:', error.response?.data?.message);
    console.log('Details:', error.response?.data?.details);
    
    if (error.response?.data?.message?.includes('credentials') || 
        error.response?.data?.message?.includes('private key') ||
        error.response?.data?.message?.includes('GOOGLE')) {
      console.log('\n🔑 NEXT STEPS:');
      console.log('1. The service account authentication is implemented');
      console.log('2. You need to add the Google service account credentials to .env:');
      console.log('   GOOGLE_PRIVATE_KEY_ID=your_key_id');
      console.log('   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nyour_key\\n-----END PRIVATE KEY-----"');
      console.log('   GOOGLE_CLIENT_ID=your_client_id');
      console.log('3. Share the Google Sheet with: myname@ddmtest-310706.iam.gserviceaccount.com');
      console.log('4. The import button will work once credentials are added');
    }
  }
}

testImportWithNewUser();