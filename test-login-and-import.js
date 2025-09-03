const axios = require('axios');

async function testWithAuth() {
  let token;
  
  // First try to signup, then login
  try {
    console.log('🔐 Creating/logging in test user...');
    
    // Try signup first
    try {
      const signupResponse = await axios.post('http://localhost:5001/api/signup', {
        username: 'test',
        password: 'test'
      });
      token = signupResponse.data.token;
      console.log('✅ New test user created and logged in');
    } catch (signupError) {
      // User exists, try login
      const loginResponse = await axios.post('http://localhost:5001/api/login', {
        username: 'test',
        password: 'test'
      });
      token = loginResponse.data.token;
      console.log('✅ Existing test user logged in');
    }
    
    // Now test the import with valid authentication
    console.log('🧪 Testing import endpoint with valid auth...\n');
    
    const response = await axios.post('http://localhost:5001/api/import-google-sheet', {
      sheetId: '1Cw-RYG4e060Y8P7jkglqWvq04SRRtufD9WOCcKo-sB4',
      sheetName: 'CurrentVersion', 
      apiKey: 'AIzaSyDKn-kZHyJdbC5-pye7zGli6WaJEKwWy9U'
    }, {
      headers: { 
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('✅ Import response:', response.data);
    
  } catch (error) {
    
    console.log('📋 Import Error Details:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message);
    console.log('Details:', error.response?.data?.details);
    console.log('Sheet URL:', error.response?.data?.sheetUrl);
    console.log('Troubleshooting:', error.response?.data?.troubleshooting);
    
    console.log('\n✨ This is exactly what the user will see in the UI!');
  }
}

testWithAuth();