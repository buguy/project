const { google } = require('googleapis');

async function testGoogleSheetsAccess() {
  try {
    console.log('Testing Google Sheets API access...');
    
    const sheetId = '1Cw-RYG4e060Y8P7jkglqWvq04SRRtufD9WOCcKo-sB4';
    const sheetName = 'CurrentVersion';
    const apiKey = 'AIzaSyDKn-kZHyJdbC5-pye7zGli6WaJEKwWy9U';
    
    // Initialize Google Sheets API
    const sheets = google.sheets({ version: 'v4', auth: apiKey });
    
    // Try to fetch a small range first to test access
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A1:E5`, // Just first 5 rows and columns
    });
    
    const rows = response.data.values;
    console.log('✅ Successfully connected to Google Sheets!');
    console.log('Sample data retrieved:');
    console.log('Headers:', rows[0]);
    console.log('Row count:', rows.length);
    console.log('Sample row:', rows[1]);
    
    return true;
  } catch (error) {
    console.error('❌ Google Sheets access failed:');
    console.error('Error:', error.message);
    console.error('Status:', error.response?.status);
    console.error('Details:', error.response?.data);
    return false;
  }
}

testGoogleSheetsAccess();