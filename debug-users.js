const mongoose = require('mongoose');
const User = require('./models/User');

async function debugUsers() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/bugtracker');
    console.log('✅ Connected to MongoDB');
    
    const users = await User.find({});
    console.log('👥 Users in database:', users.length);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. Username: ${user.username}, ID: ${user._id}`);
    });
    
    if (users.length === 0) {
      console.log('📝 No users found. Creating test user...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('testpass', 10);
      
      const newUser = new User({
        username: 'testuser',
        password: hashedPassword
      });
      
      await newUser.save();
      console.log('✅ Test user created successfully');
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugUsers();