async function debugSheetAccess() {
  try {
    console.log('🔍 Debugging Google Sheets access...\n');
    
    const sheetId = '1Cw-RYG4e060Y8P7jkglqWvq04SRRtufD9WOCcKo-sB4';
    const sheetName = 'CurrentVersion';
    const apiKey = 'AIzaSyDKn-kZHyJdbC5-pye7zGli6WaJEKwWy9U';
    
    // Test 1: Check if we can access the sheet metadata
    console.log('📊 Test 1: Checking sheet metadata...');
    const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?key=${apiKey}`;
    
    try {
      const metadataResponse = await fetch(metadataUrl);
      const metadataData = await metadataResponse.json();
      
      if (metadataResponse.ok) {
        console.log('✅ Sheet metadata accessible!');
        console.log('Title:', metadataData.properties?.title);
        console.log('Sheet names:', metadataData.sheets?.map(s => s.properties?.title));
      } else {
        console.log('❌ Metadata access failed:', metadataData.error?.message);
      }
    } catch (err) {
      console.log('❌ Metadata request failed:', err.message);
    }
    
    // Test 2: Try to access specific sheet data
    console.log('\n📋 Test 2: Checking sheet data access...');
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}!A1:E5?key=${apiKey}`;
    
    try {
      const dataResponse = await fetch(dataUrl);
      const data = await dataResponse.json();
      
      if (dataResponse.ok) {
        console.log('✅ Sheet data accessible!');
        console.log('Headers:', data.values?.[0]);
        console.log('Rows found:', data.values?.length || 0);
      } else {
        console.log('❌ Data access failed:', data.error?.message);
        console.log('Error details:', JSON.stringify(data.error, null, 2));
      }
    } catch (err) {
      console.log('❌ Data request failed:', err.message);
    }
    
    // Test 3: Check a different range format
    console.log('\n🔧 Test 3: Trying different range format...');
    const altDataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:E5?key=${apiKey}`;
    
    try {
      const altResponse = await fetch(altDataUrl);
      const altData = await altResponse.json();
      
      if (altResponse.ok) {
        console.log('✅ Alternative format works!');
        console.log('Data:', altData.values?.[0]);
      } else {
        console.log('❌ Alternative format also failed:', altData.error?.message);
      }
    } catch (err) {
      console.log('❌ Alternative request failed:', err.message);
    }
    
    // Test 4: Check if it's a permission issue vs sheet issue
    console.log('\n🔍 Test 4: Diagnosing the issue...');
    console.log('Sheet URL for manual verification:');
    console.log(`https://docs.google.com/spreadsheets/d/${sheetId}/edit#gid=1186959335`);
    
    console.log('\n📋 Next steps:');
    console.log('1. Verify the sheet is publicly accessible');
    console.log('2. Check if API key has Google Sheets API enabled');
    console.log('3. Confirm sheet name "CurrentVersion" exists');
    console.log('4. Try accessing the sheet URL manually');
    
  } catch (error) {
    console.error('🚨 Debug script failed:', error.message);
  }
}

debugSheetAccess();