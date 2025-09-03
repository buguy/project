require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Bug = require('./models/Bug');

const jsonFilePath = path.join(__dirname, 'buglist-data.json');

async function importData() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker';
    console.log('Connecting to MongoDB:', mongoURI.replace(/\/\/.*@/, '//***:***@'));
    
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB successfully!');

    // Check if JSON file exists
    if (!fs.existsSync(jsonFilePath)) {
      console.error('JSON file not found:', jsonFilePath);
      process.exit(1);
    }

    // Read JSON data
    console.log('Reading JSON data from:', jsonFilePath);
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    console.log('Loaded', jsonData.length, 'bug records');

    // Get current count in database
    const existingCount = await Bug.countDocuments();
    console.log('Existing bugs in database:', existingCount);

    if (existingCount > 0) {
      console.log('\nWarning: Database already contains bug records.');
      console.log('Do you want to:');
      console.log('1. Clear existing data and import new data');
      console.log('2. Add new data to existing data');
      console.log('3. Cancel import');
      
      // For automation, we'll add to existing data
      console.log('Proceeding with option 2: Adding to existing data');
    }

    // Import data in batches to avoid memory issues
    const batchSize = 100;
    let importedCount = 0;
    let errorCount = 0;

    for (let i = 0; i < jsonData.length; i += batchSize) {
      const batch = jsonData.slice(i, i + batchSize);
      
      try {
        // Filter out records with missing required fields
        const validRecords = batch.filter(record => {
          const isValid = record.status && record.tester && record.date && 
                         record.test_case_name && record.title;
          if (!isValid) {
            console.log(`Skipping invalid record at index ${i + batch.indexOf(record)}:`, 
                       { status: record.status, tester: record.tester, title: record.title });
            errorCount++;
          }
          return isValid;
        });

        if (validRecords.length > 0) {
          await Bug.insertMany(validRecords, { ordered: false });
          importedCount += validRecords.length;
          console.log(`Imported batch ${Math.floor(i/batchSize) + 1}: ${validRecords.length} records`);
        }
      } catch (error) {
        if (error.code === 11000) {
          // Duplicate key errors
          console.log(`Batch ${Math.floor(i/batchSize) + 1}: Some duplicate records skipped`);
          // Count successful inserts from the error details
          const successCount = error.result?.insertedCount || 0;
          importedCount += successCount;
        } else {
          console.error(`Error in batch ${Math.floor(i/batchSize) + 1}:`, error.message);
          errorCount += batch.length;
        }
      }
    }

    // Final summary
    const finalCount = await Bug.countDocuments();
    console.log('\n=== Import Summary ===');
    console.log('Records processed:', jsonData.length);
    console.log('Records imported:', importedCount);
    console.log('Records with errors:', errorCount);
    console.log('Total bugs in database now:', finalCount);

    // Show some sample records
    const sampleBugs = await Bug.find().limit(3).select('status tcid tester title');
    console.log('\nSample imported records:');
    sampleBugs.forEach((bug, index) => {
      console.log(`${index + 1}. [${bug.status}] ${bug.title} (Tester: ${bug.tester})`);
    });

  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nMongoDB connection closed.');
  }
}

// Run the import
importData();