const mongoose = require('mongoose');
const Bug = require('./models/Bug');

const getLatestBugLink = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker');
    console.log('✅ Connected to MongoDB');
    
    // Get the most recent bug (by updatedAt)
    const latestBug = await Bug.findOne({}).sort({ updatedAt: -1 });
    
    if (latestBug) {
      console.log('\n📋 Latest Bug Information:');
      console.log('='.repeat(60));
      console.log(`ID: ${latestBug._id}`);
      console.log(`TCID: ${latestBug.tcid || 'N/A'}`);
      console.log(`Title: ${latestBug.title}`);
      console.log(`Tester: ${latestBug.tester}`);
      console.log(`Updated: ${latestBug.updatedAt}`);
      console.log(`Created: ${latestBug.createdAt}`);
      
      console.log('\n🔗 Link Content:');
      console.log('-'.repeat(60));
      if (latestBug.link && latestBug.link.trim() !== '') {
        console.log(latestBug.link);
      } else {
        console.log('[No link content]');
      }
      
      // Also show other file fields
      console.log('\n📁 File Information:');
      console.log('-'.repeat(60));
      console.log(`ZIP File: ${latestBug.zipFile || '[Empty]'}`);
      console.log(`MP4 File: ${latestBug.mp4File || '[Empty]'}`);
      
    } else {
      console.log('❌ No bugs found in database');
    }
    
    // Also get the latest bug with link content specifically
    const latestBugWithLink = await Bug.findOne({ 
      link: { $exists: true, $ne: '', $ne: null } 
    }).sort({ updatedAt: -1 });
    
    if (latestBugWithLink && latestBugWithLink._id.toString() !== latestBug._id.toString()) {
      console.log('\n\n📋 Latest Bug WITH Link Content:');
      console.log('='.repeat(60));
      console.log(`ID: ${latestBugWithLink._id}`);
      console.log(`TCID: ${latestBugWithLink.tcid || 'N/A'}`);
      console.log(`Title: ${latestBugWithLink.title}`);
      console.log(`Tester: ${latestBugWithLink.tester}`);
      console.log(`Updated: ${latestBugWithLink.updatedAt}`);
      
      console.log('\n🔗 Link Content:');
      console.log('-'.repeat(60));
      console.log(latestBugWithLink.link);
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

getLatestBugLink();