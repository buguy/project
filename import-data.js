const mongoose = require('mongoose');
const fs = require('fs');
require('dotenv').config();

const Bug = require('./models/Bug');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker';

async function importData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Read the JSON data
    const rawData = fs.readFileSync('./data.json', 'utf8');
    const jsonData = JSON.parse(rawData);

    console.log(`Found ${jsonData.length} records to import`);

    // Clear existing data (optional - remove this if you want to keep existing data)
    await Bug.deleteMany({});
    console.log('Cleared existing bug records');

    // Map and import data
    const importedBugs = [];
    
    for (const item of jsonData) {
      const bugData = {
        status: item.Status || 'Unknown',
        tcid: item.TCID || 'N/A',
        pims: item.PIMS || '',
        tester: item.Tester || 'Unknown',
        date: item.Date || new Date().toISOString().split('T')[0],
        stage: item.Stage || 'Unknown',
        product_customer_likelihood: item['Product/Customer/Likelihood'] || 'Unknown',
        test_case_name: item.TestCaseName || 'Unknown',
        chinese: item.Chinese || '',
        title: item.Title || 'No Title',
        system_information: item['System information'] || '',
        description: item.Description || ''
      };

      const bug = new Bug(bugData);
      await bug.save();
      importedBugs.push(bug);
    }

    console.log(`Successfully imported ${importedBugs.length} bug records`);
    
    // Display sample of imported data
    console.log('\nSample imported records:');
    importedBugs.slice(0, 3).forEach((bug, index) => {
      console.log(`${index + 1}. ${bug.title} (Status: ${bug.status}, Tester: ${bug.tester})`);
    });

  } catch (error) {
    console.error('Error importing data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

importData();