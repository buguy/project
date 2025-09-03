const mongoose = require('mongoose');
const Bug = require('./models/Bug');

const findSpecificBug = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker');
    console.log('✅ Connected to MongoDB');
    
    // Search for bug with PIMS-376407
    const targetBug = await Bug.findOne({ 
      pims: { $regex: /376407/i }
    });
    
    if (targetBug) {
      console.log('\n📋 Found Bug with PIMS-376407:');
      console.log('='.repeat(70));
      console.log(`Bug ID: ${targetBug._id}`);
      console.log(`TCID: ${targetBug.tcid || 'N/A'}`);
      console.log(`PIMS: ${targetBug.pims}`);
      console.log(`Title: ${targetBug.title}`);
      console.log(`Tester: ${targetBug.tester}`);
      console.log(`Status: ${targetBug.status}`);
      console.log(`Stage: ${targetBug.stage}`);
      console.log(`Date: ${targetBug.date}`);
      console.log(`Updated: ${targetBug.updatedAt}`);
      console.log(`Created: ${targetBug.createdAt}`);
      
      console.log('\n🔗 Link Content:');
      console.log('='.repeat(70));
      if (targetBug.link && targetBug.link.trim() !== '') {
        console.log(targetBug.link);
      } else {
        console.log('[No link content]');
      }
      
      console.log('\n📁 File Information:');
      console.log('-'.repeat(70));
      console.log(`ZIP File: ${targetBug.zipFile || '[Empty]'}`);
      console.log(`MP4 File: ${targetBug.mp4File || '[Empty]'}`);
      
      if (targetBug.description) {
        console.log('\n📝 Description:');
        console.log('-'.repeat(70));
        console.log(targetBug.description);
      }
      
    } else {
      console.log('❌ Bug with PIMS-376407 not found');
      
      // Let's check what PIMS numbers we do have
      console.log('\n📊 All PIMS numbers in database:');
      const allBugs = await Bug.find({}, { pims: 1, title: 1, updatedAt: 1 }).sort({ updatedAt: -1 });
      allBugs.forEach((bug, index) => {
        console.log(`${index + 1}. PIMS: ${bug.pims || '[Empty]'} - ${bug.title.substring(0, 50)}... (Updated: ${bug.updatedAt})`);
      });
    }
    
    // Also get the absolute latest bug by creation/update time
    console.log('\n📋 Most Recent Bug (by update time):');
    const latestBug = await Bug.findOne({}).sort({ updatedAt: -1 });
    if (latestBug) {
      console.log('='.repeat(70));
      console.log(`Bug ID: ${latestBug._id}`);
      console.log(`TCID: ${latestBug.tcid || 'N/A'}`);
      console.log(`PIMS: ${latestBug.pims || '[Empty]'}`);
      console.log(`Title: ${latestBug.title}`);
      console.log(`Updated: ${latestBug.updatedAt}`);
      console.log(`Has Link: ${latestBug.link && latestBug.link.trim() !== '' ? 'YES' : 'NO'}`);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

findSpecificBug();