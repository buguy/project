// Using built-in fetch instead of axios

async function testPublicSheetAccess() {
  try {
    console.log('Testing public Google Sheets access...');
    
    const sheetId = '1Cw-RYG4e060Y8P7jkglqWvq04SRRtufD9WOCcKo-sB4';
    const sheetName = 'CurrentVersion';
    const apiKey = 'AIzaSyDKn-kZHyJdbC5-pye7zGli6WaJEKwWy9U';
    
    // Try direct HTTP access to Google Sheets API
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A1:E5?key=${apiKey}`;
    
    console.log('Making request to:', url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Successfully accessed Google Sheets via HTTP!');
      console.log('Headers:', data.values[0]);
      console.log('Sample data:', data.values[1]);
    } else {
      throw new Error(data.error?.message || 'Request failed');
    }
    
    return true;
  } catch (error) {
    console.error('❌ HTTP access failed:');
    console.error('Message:', error.message);
    
    if (error.message.includes('permission') || error.message.includes('403')) {
      console.log('\n📋 Possible solutions:');
      console.log('1. Make sure the Google Sheet is publicly shared');
      console.log('2. Enable Google Sheets API for this API key');
      console.log('3. Check if the sheet ID and name are correct');
    }
    
    return false;
  }
}

testPublicSheetAccess();