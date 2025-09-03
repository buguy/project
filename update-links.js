const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import the Bug model
const Bug = require('./models/Bug');

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const updateBugLinks = async () => {
  try {
    // Read the extracted bug data
    const bugDataPath = 'C:\\Users\\user\\Downloads\\bug_data_with_links.json';
    
    if (!fs.existsSync(bugDataPath)) {
      console.error('Bug data file not found:', bugDataPath);
      process.exit(1);
    }
    
    const bugData = JSON.parse(fs.readFileSync(bugDataPath, 'utf8'));
    console.log(`Loaded ${bugData.length} bug records from Excel file`);
    
    let updateCount = 0;
    let createCount = 0;
    let skippedCount = 0;
    
    for (const excelBug of bugData) {
      try {
        // Skip records without meaningful data
        if (!excelBug.title && !excelBug.tcid && !excelBug.tester) {
          skippedCount++;
          continue;
        }
        
        // Try to find existing bug by TCID first, then by title and tester
        let existingBug = null;
        
        if (excelBug.tcid && excelBug.tcid !== 'nan' && excelBug.tcid.trim() !== '') {
          existingBug = await Bug.findOne({ tcid: excelBug.tcid.trim() });
        }
        
        if (!existingBug && excelBug.title && excelBug.tester) {
          existingBug = await Bug.findOne({ 
            title: { $regex: new RegExp(excelBug.title.substring(0, 50), 'i') },
            tester: excelBug.tester
          });
        }
        
        if (existingBug) {
          // Update existing bug with link information
          const updateData = {};
          
          if (excelBug.link && excelBug.link.trim() !== '') {
            updateData.link = excelBug.link.trim();
          }
          
          // Also update other fields if they're missing or different
          if (excelBug.tcid && excelBug.tcid !== 'nan' && (!existingBug.tcid || existingBug.tcid.trim() === '')) {
            updateData.tcid = excelBug.tcid.trim();
          }
          
          if (Object.keys(updateData).length > 0) {
            await Bug.findByIdAndUpdate(existingBug._id, updateData);
            updateCount++;
            console.log(`✓ Updated bug: ${existingBug.title.substring(0, 60)}... (TCID: ${updateData.tcid || existingBug.tcid})`);
          }
        } else {
          // Create new bug record if it doesn't exist
          const newBugData = {
            status: excelBug.status || 'Open',
            tcid: excelBug.tcid && excelBug.tcid !== 'nan' ? excelBug.tcid.trim() : '',
            pims: excelBug.pims || '',
            tester: excelBug.tester || '',
            date: excelBug.date || new Date().toISOString().split('T')[0].replace(/-/g, '/'),
            stage: excelBug.stage || '',
            product_customer_likelihood: excelBug.product_customer_likelihood || '',
            test_case_name: excelBug.test_case_name || '',
            chinese: excelBug.chinese || '',
            title: excelBug.title || '',
            system_information: excelBug.system_information || '',
            description: excelBug.description || '',
            link: excelBug.link || '',
            zipFile: '',
            mp4File: ''
          };
          
          // Only create if we have required fields
          if (newBugData.title && newBugData.tester && newBugData.date && newBugData.stage && newBugData.product_customer_likelihood && newBugData.test_case_name) {
            const newBug = new Bug(newBugData);
            await newBug.save();
            createCount++;
            console.log(`✓ Created new bug: ${newBugData.title.substring(0, 60)}... (TCID: ${newBugData.tcid})`);
          } else {
            skippedCount++;
            console.log(`⚠ Skipped incomplete bug record: ${excelBug.title?.substring(0, 60) || 'No title'}`);
          }
        }
        
      } catch (error) {
        console.error(`Error processing bug record:`, error.message);
        skippedCount++;
      }
    }
    
    console.log('\n=== Update Summary ===');
    console.log(`Updated existing bugs: ${updateCount}`);
    console.log(`Created new bugs: ${createCount}`);
    console.log(`Skipped records: ${skippedCount}`);
    console.log(`Total processed: ${updateCount + createCount + skippedCount}`);
    
  } catch (error) {
    console.error('Error updating bug links:', error);
  }
};

const main = async () => {
  console.log('Starting bug links update process...');
  
  await connectDB();
  await updateBugLinks();
  
  console.log('Bug links update completed!');
  process.exit(0);
};

// Run the script
main().catch(console.error);