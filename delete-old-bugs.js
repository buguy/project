const mongoose = require('mongoose');
require('dotenv').config();

const Bug = require('./models/Bug');

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker';

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    // Delete bugs with dates from 2022-2023
    // This includes bugs where the date field starts with "2022" or "2023"
    const result = await Bug.deleteMany({
      $or: [
        { date: { $regex: /^2022/ } },
        { date: { $regex: /^2023/ } }
      ]
    });

    console.log(`Deleted ${result.deletedCount} bugs from 2022-2023`);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
