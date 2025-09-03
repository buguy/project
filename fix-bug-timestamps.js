require('dotenv').config();
const mongoose = require('mongoose');
const Bug = require('./models/Bug');

async function fixBugTimestamps() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker';
    await mongoose.connect(mongoURI);
    
    console.log('Fixing bug timestamps...');
    
    // Get all bugs without createdAt timestamps
    const bugsWithoutTimestamps = await Bug.find({
      $or: [
        { createdAt: { $exists: false } },
        { createdAt: null },
        { updatedAt: { $exists: false } },
        { updatedAt: null }
      ]
    });
    
    console.log('Found', bugsWithoutTimestamps.length, 'bugs without timestamps');
    
    if (bugsWithoutTimestamps.length > 0) {
      // Method 1: Use the _id creation time for realistic timestamps
      const updates = [];
      
      bugsWithoutTimestamps.forEach((bug, index) => {
        // Extract timestamp from MongoDB ObjectId
        const objectIdTimestamp = bug._id.getTimestamp();
        
        // Add some variation to make it more realistic (spread over last few days)
        const baseTime = objectIdTimestamp.getTime();
        const variation = Math.random() * 24 * 60 * 60 * 1000; // Random hours within a day
        const adjustedTime = new Date(baseTime + variation);
        
        updates.push({
          updateOne: {
            filter: { _id: bug._id },
            update: {
              $set: {
                createdAt: adjustedTime,
                updatedAt: adjustedTime
              }
            }
          }
        });
      });
      
      console.log('Updating timestamps for all bugs...');
      await Bug.bulkWrite(updates);
      console.log('✅ Successfully updated timestamps for', updates.length, 'bugs');
    }
    
    // Verify the fix by checking sorting
    console.log('\nVerifying latest bugs with new timestamps:');
    const latestBugs = await Bug.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt');
    
    latestBugs.forEach((bug, i) => {
      console.log(`${i+1}. ${bug.createdAt} - ${bug.title.substring(0, 50)}...`);
    });
    
    await mongoose.connection.close();
    console.log('\nTimestamp fix completed!');
    
  } catch (error) {
    console.error('Error fixing timestamps:', error.message);
  }
}

fixBugTimestamps();