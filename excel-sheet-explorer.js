const XLSX = require('xlsx');
const fs = require('fs');

const excelFilePath = 'C:\\Users\\user\\Downloads\\Windows DDM2.0 Buglist (1).xlsx';

try {
  if (!fs.existsSync(excelFilePath)) {
    console.error('Excel file not found:', excelFilePath);
    process.exit(1);
  }

  console.log('Reading Excel file:', excelFilePath);
  const workbook = XLSX.readFile(excelFilePath);
  
  console.log('Available sheets:');
  workbook.SheetNames.forEach((sheetName, index) => {
    console.log(`${index + 1}. ${sheetName}`);
    
    // Get sample data from each sheet
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`   Rows: ${jsonData.length}`);
    if (jsonData.length > 0 && jsonData[0].length > 0) {
      console.log(`   Headers: ${jsonData[0].join(', ')}`);
    }
    
    // Show first data row (not header)
    if (jsonData.length > 1) {
      console.log(`   Sample: ${jsonData[1].join(', ')}`);
    }
    console.log('');
  });
  
  // Look for bug-related sheets
  const bugSheets = workbook.SheetNames.filter(name => 
    name.toLowerCase().includes('bug') || 
    name.toLowerCase().includes('defect') || 
    name.toLowerCase().includes('issue') ||
    name.toLowerCase().includes('test')
  );
  
  if (bugSheets.length > 0) {
    console.log('Potential bug-related sheets found:');
    bugSheets.forEach(sheet => console.log(`- ${sheet}`));
  }
  
} catch (error) {
  console.error('Error:', error.message);
}