const mongoose = require('mongoose');
const Bug = require('./models/Bug');

const getLatestBugWithLink = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker');
    console.log('✅ Connected to MongoDB');
    
    // Get the most recent bug that has link content
    const latestBugWithLink = await Bug.findOne({ 
      link: { $exists: true, $ne: '', $ne: null } 
    }).sort({ updatedAt: -1 });
    
    if (latestBugWithLink) {
      console.log('\n📋 Latest Bug WITH Link Content:');
      console.log('='.repeat(70));
      console.log(`Bug ID: ${latestBugWithLink._id}`);
      console.log(`TCID: ${latestBugWithLink.tcid || 'N/A'}`);
      console.log(`Title: ${latestBugWithLink.title}`);
      console.log(`Tester: ${latestBugWithLink.tester}`);
      console.log(`Status: ${latestBugWithLink.status}`);
      console.log(`Stage: ${latestBugWithLink.stage}`);
      console.log(`Date: ${latestBugWithLink.date}`);
      console.log(`Updated: ${latestBugWithLink.updatedAt}`);
      console.log(`Created: ${latestBugWithLink.createdAt}`);
      
      console.log('\n🔗 FULL Link Content:');
      console.log('='.repeat(70));
      console.log(latestBugWithLink.link);
      
      console.log('\n📝 Description:');
      console.log('-'.repeat(70));
      console.log(latestBugWithLink.description || '[No description]');
      
      console.log('\n📁 File URLs:');
      console.log('-'.repeat(70));
      console.log(`ZIP File URL: ${latestBugWithLink.zipFile || '[Empty]'}`);
      console.log(`MP4 File URL: ${latestBugWithLink.mp4File || '[Empty]'}`);
      
      // Parse the link content to show individual file paths
      if (latestBugWithLink.link) {
        const linkLines = latestBugWithLink.link.split('\n').filter(line => line.trim());
        console.log('\n📂 Individual File Paths in Link:');
        console.log('-'.repeat(70));
        linkLines.forEach((line, index) => {
          const cleanLine = line.replace(/^"|"$/g, '').trim(); // Remove quotes
          if (cleanLine) {
            console.log(`${index + 1}. ${cleanLine}`);
          }
        });
      }
      
    } else {
      console.log('❌ No bugs with link content found in database');
    }
    
    // Also show all bugs with links
    const allBugsWithLinks = await Bug.find({ 
      link: { $exists: true, $ne: '', $ne: null } 
    }).sort({ updatedAt: -1 });
    
    console.log(`\n📊 Total bugs with link content: ${allBugsWithLinks.length}`);
    
    if (allBugsWithLinks.length > 1) {
      console.log('\n📋 All Bugs with Links:');
      console.log('-'.repeat(70));
      allBugsWithLinks.forEach((bug, index) => {
        console.log(`${index + 1}. TCID: ${bug.tcid || 'N/A'} - ${bug.title.substring(0, 60)}...`);
        console.log(`   Updated: ${bug.updatedAt}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

getLatestBugWithLink();