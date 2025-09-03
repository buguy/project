const axios = require('axios');

async function testSheetsDirectly() {
  console.log('🧪 Testing Google Sheets API directly...\n');
  
  const sheetId = '1Cw-RYG4e060Y8P7jkglqWvq04SRRtufD9WOCcKo-sB4';
  const sheetName = 'CurrentVersion';
  const apiKey = 'AIzaSyDKn-kZHyJdbC5-pye7zGli6WaJEKwWy9U';
  
  // Test the same URL our server uses
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A:O?key=${apiKey}`;
  
  console.log('🔗 Trying URL:', url);
  
  try {
    const response = await axios.get(url);
    console.log('✅ Direct Google Sheets API success!');
    console.log('📊 Rows found:', response.data.values?.length || 0);
    console.log('📋 Headers:', response.data.values?.[0]);
    
  } catch (error) {
    console.log('❌ Direct Google Sheets API failed:');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data?.error?.message);
    console.log('Code:', error.response?.data?.error?.code);
    console.log('Details:', error.response?.data?.error?.details);
    
    if (error.response?.status === 403) {
      console.log('\n🔒 PERMISSION DENIED - The sheet is not publicly accessible');
      console.log('🌐 Sheet URL:', `https://docs.google.com/spreadsheets/d/${sheetId}`);
      console.log('📝 To fix this:');
      console.log('   1. Open the Google Sheet');
      console.log('   2. Click "Share" button');
      console.log('   3. Change access to "Anyone with the link can view"');
      console.log('   4. Try again');
    } else if (error.response?.status === 404) {
      console.log('\n📂 NOT FOUND - Sheet or tab does not exist');
      console.log('   - Check that the sheet ID is correct');
      console.log('   - Check that the tab name "CurrentVersion" exists');
    } else if (error.response?.status === 400) {
      console.log('\n⚠️ BAD REQUEST - Invalid parameters');
      console.log('   - Check the API key is valid');
      console.log('   - Check sheet ID format');
    }
  }
}

testSheetsDirectly();