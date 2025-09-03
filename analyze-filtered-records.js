const fs = require('fs');
const path = require('path');

const jsonFilePath = path.join(__dirname, 'buglist-data.json');

try {
  const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
  console.log('Total records in JSON file:', jsonData.length);
  
  let validCount = 0;
  let invalidCount = 0;
  let missingFields = {
    status: 0,
    tester: 0, 
    date: 0,
    test_case_name: 0,
    title: 0
  };
  
  jsonData.forEach((record, index) => {
    const isValid = record.status && record.tester && record.date && 
                   record.test_case_name && record.title;
    
    if (isValid) {
      validCount++;
    } else {
      invalidCount++;
      
      // Count missing required fields
      if (!record.status) missingFields.status++;
      if (!record.tester) missingFields.tester++;
      if (!record.date) missingFields.date++;
      if (!record.test_case_name) missingFields.test_case_name++;
      if (!record.title) missingFields.title++;
      
      // Show first few invalid records
      if (invalidCount <= 5) {
        console.log(`\nInvalid record ${index + 1}:`, {
          status: record.status || '(missing)',
          tester: record.tester || '(missing)', 
          title: record.title || '(missing)',
          test_case_name: record.test_case_name || '(missing)'
        });
      }
    }
  });
  
  console.log('\n=== Validation Results ===');
  console.log('Valid records:', validCount);
  console.log('Invalid records:', invalidCount);
  console.log('Expected import count:', validCount);
  
  console.log('\n=== Missing Required Fields ===');
  Object.entries(missingFields).forEach(([field, count]) => {
    if (count > 0) {
      console.log(`- ${field}: ${count} records`);
    }
  });
  
  // Check for empty/null values in critical fields
  let emptyStatuses = 0;
  let emptyTesters = 0;
  let emptyTitles = 0;
  
  jsonData.forEach(record => {
    if (record.status === '' || record.status === null) emptyStatuses++;
    if (record.tester === '' || record.tester === null || record.tester === 'Unknown') emptyTesters++;
    if (record.title === '' || record.title === null) emptyTitles++;
  });
  
  console.log('\n=== Empty Field Analysis ===');
  console.log('Empty status fields:', emptyStatuses);
  console.log('Empty/Unknown tester fields:', emptyTesters);
  console.log('Empty title fields:', emptyTitles);
  
} catch (error) {
  console.error('Error analyzing records:', error.message);
}