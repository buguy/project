const axios = require('axios');

async function testImportEndpoint() {
  try {
    console.log('🧪 Testing import endpoint with current sheet settings...\n');
    
    // This simulates what happens when user clicks the import button
    const response = await axios.post('http://localhost:3001/api/import-google-sheet', {
      sheetId: '1Cw-RYG4e060Y8P7jkglqWvq04SRRtufD9WOCcKo-sB4',
      sheetName: 'CurrentVersion', 
      apiKey: 'AIzaSyDKn-kZHyJdbC5-pye7zGli6WaJEKwWy9U'
    }, {
      headers: { 
        Authorization: 'Bearer dummy_token_for_testing' // This will fail auth but that's expected
      }
    });
    
    console.log('✅ Import response:', response.data);
    
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('🔒 Authentication required (expected in test)');
      return;
    }
    
    console.log('📋 Import Error Details:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message);
    console.log('Details:', error.response?.data?.details);
    console.log('Sheet URL:', error.response?.data?.sheetUrl);
    
    console.log('\n✨ This is exactly what the user will see in the UI!');
  }
}

testImportEndpoint();