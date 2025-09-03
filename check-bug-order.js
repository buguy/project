require('dotenv').config();
const mongoose = require('mongoose');
const Bug = require('./models/Bug');

async function checkBugOrder() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker';
    await mongoose.connect(mongoURI);
    
    console.log('Checking bug ordering...\n');
    
    // Get the first 5 bugs with current sorting (createdAt: -1)
    const latestBugs = await Bug.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt updatedAt');
    
    console.log('Current sorting (createdAt: -1) - Latest first:');
    latestBugs.forEach((bug, i) => {
      console.log(`${i+1}. ${bug.title.substring(0, 50)}...`);
      console.log(`   Created: ${bug.createdAt}`);
      console.log(`   Updated: ${bug.updatedAt}\n`);
    });
    
    // Check if there are any recent bugs (created today)
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todayBugs = await Bug.find({
      createdAt: { $gte: todayStart }
    }).countDocuments();
    
    console.log(`Bugs created today: ${todayBugs}`);
    
    // Get oldest bugs for comparison
    const oldestBugs = await Bug.find()
      .sort({ createdAt: 1 })
      .limit(3)
      .select('title createdAt');
    
    console.log(`\nOldest bugs in database:`);
    oldestBugs.forEach((bug, i) => {
      console.log(`${i+1}. ${bug.createdAt} - ${bug.title.substring(0, 40)}...`);
    });
    
    await mongoose.connection.close();
    console.log(`\nBug ordering check completed!`);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkBugOrder();