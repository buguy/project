const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelFilePath = 'C:\\Users\\user\\Downloads\\Windows DDM2.0 Buglist (1).xlsx';
const outputJsonPath = path.join(__dirname, 'buglist-data.json');

try {
  if (!fs.existsSync(excelFilePath)) {
    console.error('Excel file not found:', excelFilePath);
    process.exit(1);
  }

  console.log('Reading Excel file:', excelFilePath);
  const workbook = XLSX.readFile(excelFilePath);
  
  // Use the BugList sheet
  const sheetName = 'BugList';
  if (!workbook.SheetNames.includes(sheetName)) {
    console.error('BugList sheet not found!');
    process.exit(1);
  }
  
  console.log('Processing sheet:', sheetName);
  
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log('Found', jsonData.length, 'bug records');
  
  // Map Excel columns to our database schema
  const mappedData = jsonData.map((row, index) => {
    // Handle the date conversion if needed
    let dateValue = row['Date'];
    if (typeof dateValue === 'number') {
      // Excel serial date conversion
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (dateValue - 1) * 24 * 60 * 60 * 1000);
      dateValue = date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    } else if (dateValue && typeof dateValue === 'string') {
      // Keep string dates as is
      dateValue = dateValue;
    } else {
      // Default date if missing
      dateValue = new Date().toISOString().split('T')[0];
    }

    return {
      status: row['Status'] || 'pending',
      tcid: row['TCID'] || '',
      pims: row['PIMS'] || '',
      tester: row['Tester'] || 'Unknown',
      date: dateValue,
      stage: row['Stage'] || '',
      product_customer_likelihood: row['Product/Customer/Likelihood'] || '',
      test_case_name: row['TestCaseName'] || `Test Case ${index + 1}`,
      chinese: row['Chinese'] || '',
      title: row['Title'] || 'Untitled Bug',
      system_information: row['System information'] || '',
      description: row['Description'] || ''
    };
  });
  
  // Show sample mapped data
  if (mappedData.length > 0) {
    console.log('\nSample mapped record:');
    console.log(JSON.stringify(mappedData[0], null, 2));
  }
  
  // Save mapped data to JSON file
  fs.writeFileSync(outputJsonPath, JSON.stringify(mappedData, null, 2));
  console.log('\nMapped bug data saved to:', outputJsonPath);
  
  // Summary
  console.log('\nConversion completed successfully!');
  console.log('Total bug records:', mappedData.length);
  console.log('Schema mapping:');
  console.log('- Status → status');
  console.log('- TCID → tcid'); 
  console.log('- PIMS → pims');
  console.log('- Tester → tester');
  console.log('- Date → date');
  console.log('- Stage → stage');
  console.log('- Product/Customer/Likelihood → product_customer_likelihood');
  console.log('- TestCaseName → test_case_name');
  console.log('- Chinese → chinese');
  console.log('- Title → title');
  console.log('- System information → system_information');
  console.log('- Description → description');
  
} catch (error) {
  console.error('Error processing Excel file:', error.message);
  process.exit(1);
}