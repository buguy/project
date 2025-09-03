const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Path to the Excel file
const excelFilePath = 'C:\\Users\\user\\Downloads\\Windows DDM2.0 Buglist (1).xlsx';
const outputJsonPath = path.join(__dirname, 'imported-bugs.json');

try {
  // Check if file exists
  if (!fs.existsSync(excelFilePath)) {
    console.error('Excel file not found:', excelFilePath);
    process.exit(1);
  }

  // Read the Excel file
  console.log('Reading Excel file:', excelFilePath);
  const workbook = XLSX.readFile(excelFilePath);
  
  // Get the first sheet name
  const sheetName = workbook.SheetNames[0];
  console.log('Processing sheet:', sheetName);
  
  // Convert sheet to JSON
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  console.log('Found', jsonData.length, 'rows of data');
  
  // Display first few rows for verification
  if (jsonData.length > 0) {
    console.log('\nFirst row data:');
    console.log(JSON.stringify(jsonData[0], null, 2));
    
    if (jsonData.length > 1) {
      console.log('\nColumn headers detected:');
      console.log(Object.keys(jsonData[0]));
    }
  }
  
  // Save to JSON file
  fs.writeFileSync(outputJsonPath, JSON.stringify(jsonData, null, 2));
  console.log('\nJSON data saved to:', outputJsonPath);
  
  // Show summary
  console.log('\nConversion completed successfully!');
  console.log('Total records:', jsonData.length);
  
} catch (error) {
  console.error('Error processing Excel file:', error.message);
  process.exit(1);
}