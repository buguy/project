require('dotenv').config();
const mongoose = require('mongoose');
const Bug = require('./models/Bug');

async function checkDatabase() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker';
    await mongoose.connect(mongoURI);
    
    console.log('Connected to MongoDB');
    
    const totalCount = await Bug.countDocuments();
    console.log('Total bugs in database:', totalCount);
    
    // Check if we can find records with different patterns
    const statusCounts = await Bug.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\nBugs by status:');
    statusCounts.forEach(item => {
      console.log(`- ${item._id}: ${item.count}`);
    });
    
    // Check for potential duplicates
    const duplicates = await Bug.aggregate([
      {
        $group: {
          _id: { title: '$title', tester: '$tester' },
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      { $match: { count: { $gt: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    console.log('\nPotential duplicate records found:', duplicates.length);
    if (duplicates.length > 0) {
      console.log('Sample duplicates:');
      duplicates.forEach((dup, i) => {
        console.log(`${i+1}. "${dup._id.title}" (${dup.count} copies)`);
      });
    }
    
    // Check import timestamp to see recent imports
    const recentBugs = await Bug.find().sort({ createdAt: -1 }).limit(5);
    console.log('\nMost recent bug records:');
    recentBugs.forEach((bug, i) => {
      console.log(`${i+1}. [${bug.status}] ${bug.title.substring(0, 50)}... (${bug.createdAt})`);
    });
    
    await mongoose.connection.close();
    console.log('\nDatabase check completed');
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();