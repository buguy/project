require('dotenv').config();
const mongoose = require('mongoose');
const Bug = require('./models/Bug');

async function cleanup() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker';
    await mongoose.connect(mongoURI);
    
    // Remove the test bug
    await Bug.deleteOne({ title: { $regex: '^\\[TEST\\]' } });
    console.log('✅ Test bug removed');
    
    // Verify final order
    const topBugs = await Bug.find().sort({ _id: -1 }).limit(3).select('title');
    console.log('\nCurrent top 3 bugs:');
    topBugs.forEach((bug, i) => console.log(`${i+1}. ${bug.title.substring(0, 60)}...`));
    
    await mongoose.connection.close();
    console.log('\n✅ Bug ordering verification complete!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

cleanup();