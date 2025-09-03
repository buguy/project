require('dotenv').config();
const mongoose = require('mongoose');
const Bug = require('./models/Bug');

async function testNewOrdering() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker';
    await mongoose.connect(mongoURI);
    
    console.log('Testing new _id-based ordering...\n');
    
    // Get the latest 5 bugs using _id sorting (newest first)
    const latestBugs = await Bug.find()
      .sort({ _id: -1 })
      .limit(5)
      .select('title _id');
    
    console.log('Latest bugs using _id sorting (newest first):');
    latestBugs.forEach((bug, i) => {
      const creationTime = bug._id.getTimestamp();
      console.log(`${i+1}. ${creationTime.toISOString()} - ${bug.title.substring(0, 50)}...`);
    });
    
    // Create a new test bug to verify it appears first
    console.log(`\nCreating a test bug to verify ordering...`);
    const testBug = new Bug({
      status: 'Test',
      tcid: 'TEST-001',
      tester: 'Test User',
      date: new Date().toISOString().split('T')[0],
      stage: 'Testing',
      product_customer_likelihood: 'High',
      test_case_name: 'Pagination Order Test',
      title: '[TEST] This should appear at the top of the list'
    });
    
    await testBug.save();
    console.log('✅ Test bug created with ID:', testBug._id);
    
    // Check if test bug appears first
    const topBug = await Bug.findOne().sort({ _id: -1 });
    console.log('\nTop bug after test creation:');
    console.log('Title:', topBug.title);
    console.log('Created:', topBug._id.getTimestamp().toISOString());
    
    if (topBug.title.includes('[TEST]')) {
      console.log('✅ SUCCESS: Latest bug appears first!');
    } else {
      console.log('❌ ISSUE: Latest bug is not appearing first');
    }
    
    await mongoose.connection.close();
    console.log('\nOrdering test completed!');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testNewOrdering();