const axios = require('axios');

async function testServiceAccount() {
  console.log('🔧 Testing service account authentication...\n');
  
  // Note: This test will show what error we get without proper credentials
  // User needs to provide the actual service account private key
  
  try {
    const response = await axios.post('http://localhost:5001/api/login', {
      username: 'test',
      password: 'test'
    });
    
    const token = response.data.token;
    console.log('✅ Authenticated successfully');
    
    // Test import with service account (will fail without proper credentials)
    const importResponse = await axios.post('http://localhost:5001/api/import-google-sheet', {
      sheetId: '1Cw-RYG4e060Y8P7jkglqWvq04SRRtufD9WOCcKo-sB4',
      sheetName: 'CurrentVersion'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Service account import successful!');
    console.log('📊 Result:', importResponse.data);
    
  } catch (error) {
    console.log('❌ Service account test failed:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message);
    console.log('Details:', error.response?.data?.details);
    
    if (error.message?.includes('GOOGLE_PRIVATE_KEY')) {
      console.log('\n🔑 MISSING CREDENTIALS:');
      console.log('The service account requires these environment variables:');
      console.log('- GOOGLE_PRIVATE_KEY_ID');
      console.log('- GOOGLE_PRIVATE_KEY');
      console.log('- GOOGLE_CLIENT_ID');
      console.log('\nPlease add these to your .env file from your Google service account JSON.');
    }
    
    if (error.response?.status === 403) {
      console.log('\n📋 PERMISSION ISSUE:');
      console.log('The service account needs to be granted access to the Google Sheet.');
      console.log('Share the sheet with: myname@ddmtest-310706.iam.gserviceaccount.com');
    }
  }
}

// Only run if we can login first
async function setupAndTest() {
  try {
    // Try to create test user
    await axios.post('http://localhost:5001/api/signup', {
      username: 'test',
      password: 'test'
    });
  } catch (e) {
    // User exists, continue
  }
  
  await testServiceAccount();
}

setupAndTest();