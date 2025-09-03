const mongoose = require('mongoose');
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

const verifyUpdates = async () => {
  try {
    // Get all bugs from the database
    const allBugs = await Bug.find({});
    console.log(`Total bugs in database: ${allBugs.length}`);
    
    // Count bugs with link information
    const bugsWithLinks = await Bug.find({ link: { $exists: true, $ne: '' } });
    console.log(`Bugs with link information: ${bugsWithLinks.length}`);
    
    // Show the bugs that have link information
    console.log('\n=== Bugs with Link Information ===');
    bugsWithLinks.forEach((bug, index) => {
      console.log(`${index + 1}. TCID: ${bug.tcid || 'N/A'}`);
      console.log(`   Title: ${bug.title.substring(0, 80)}${bug.title.length > 80 ? '...' : ''}`);
      console.log(`   Tester: ${bug.tester}`);
      console.log(`   Link: ${bug.link.substring(0, 100)}${bug.link.length > 100 ? '...' : ''}`);
      console.log('');
    });
    
    // Show bugs without link information
    const bugsWithoutLinks = await Bug.find({ $or: [{ link: { $exists: false } }, { link: '' }] });
    console.log(`\n=== Bugs without Link Information ===`);
    console.log(`Count: ${bugsWithoutLinks.length}`);
    
    if (bugsWithoutLinks.length > 0 && bugsWithoutLinks.length <= 10) {
      bugsWithoutLinks.forEach((bug, index) => {
        console.log(`${index + 1}. TCID: ${bug.tcid || 'N/A'} - ${bug.title.substring(0, 60)}${bug.title.length > 60 ? '...' : ''}`);
      });
    } else if (bugsWithoutLinks.length > 10) {
      console.log('(Showing first 10 only)');
      bugsWithoutLinks.slice(0, 10).forEach((bug, index) => {
        console.log(`${index + 1}. TCID: ${bug.tcid || 'N/A'} - ${bug.title.substring(0, 60)}${bug.title.length > 60 ? '...' : ''}`);
      });
    }
    
  } catch (error) {
    console.error('Error verifying updates:', error);
  }
};

const main = async () => {
  console.log('Verifying link updates...');
  await connectDB();
  await verifyUpdates();
  console.log('Verification completed!');
  process.exit(0);
};

main().catch(console.error);