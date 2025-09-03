const mongoose = require('mongoose');
const Bug = require('./models/Bug');

const checkDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker');
    console.log('✅ Connected to MongoDB');
    
    // Get database stats
    const totalCount = await Bug.countDocuments();
    console.log(`📊 Total bug records in database: ${totalCount}`);
    
    // Check for link field in schema
    console.log('\n🔍 Checking Bug model schema:');
    const schema = Bug.schema.paths;
    console.log('- Link field in schema:', schema.link ? '✅ YES' : '❌ NO');
    
    // Get all bugs and check their structure
    const allBugs = await Bug.find({}).limit(5);
    console.log(`\n📋 Sample of bug records (first 5):`);
    
    allBugs.forEach((bug, index) => {
      console.log(`\n${index + 1}. Bug ID: ${bug._id}`);
      console.log(`   TCID: ${bug.tcid || 'N/A'}`);
      console.log(`   Title: ${bug.title ? bug.title.substring(0, 50) + '...' : 'No title'}`);
      console.log(`   Tester: ${bug.tester || 'N/A'}`);
      console.log(`   Has 'link' field: ${bug.link !== undefined ? '✅ YES' : '❌ NO'}`);
      console.log(`   Link value: ${bug.link || '[Empty]'}`);
      console.log(`   ZipFile: ${bug.zipFile || '[Empty]'}`);
      console.log(`   Mp4File: ${bug.mp4File || '[Empty]'}`);
    });
    
    // Count bugs with non-empty links
    const bugsWithLinks = await Bug.find({ 
      link: { $exists: true, $ne: '', $ne: null } 
    });
    
    console.log(`\n🔗 Bugs with link information: ${bugsWithLinks.length}`);
    
    if (bugsWithLinks.length > 0) {
      console.log('\nDetailed link information:');
      bugsWithLinks.forEach((bug, index) => {
        console.log(`\n${index + 1}. TCID: ${bug.tcid || 'N/A'}`);
        console.log(`   Title: ${bug.title.substring(0, 60)}...`);
        console.log(`   Link: ${bug.link}`);
      });
    }
    
    // Check recent updates
    const recentBugs = await Bug.find({}).sort({ updatedAt: -1 }).limit(3);
    console.log(`\n⏰ Most recently updated bugs:`);
    recentBugs.forEach((bug, index) => {
      console.log(`${index + 1}. ${bug.title.substring(0, 50)}... (Updated: ${bug.updatedAt})`);
    });
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

checkDatabase();