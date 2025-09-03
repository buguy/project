const mongoose = require('mongoose');
const Bug = require('./models/Bug');

const updateSpecificBug = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker');
    console.log('✅ Connected to MongoDB');
    
    // Find the bug with PIMS-376407
    const targetBug = await Bug.findOne({ pims: { $regex: /376407/i } });
    
    if (targetBug) {
      console.log('📋 Found target bug in database:');
      console.log(`   ID: ${targetBug._id}`);
      console.log(`   PIMS: ${targetBug.pims}`);
      console.log(`   Title: ${targetBug.title}`);
      console.log(`   Current Link: ${targetBug.link || '[Empty]'}`);
      
      // The link content from Excel file
      const linkContent = `"\\\\SDQA-SEVER\\Windows\\Log\\DDPM Win 2.1.2\\ASUS-FX516PM.evtx"
"\\\\SDQA-SEVER\\Windows\\Video\\DDPM Win 2.1.2\\Connecting ASUS-FX516PM to U5226KW through HDMI port causes the PC to restart.mp4"
"\\\\SDQA-SEVER\\Windows\\Picture\\DDPM Windows 2.1.2\\system information.jpg"`;

      // Update the bug with link content
      const updatedBug = await Bug.findByIdAndUpdate(
        targetBug._id,
        { 
          link: linkContent,
          updatedAt: new Date()
        },
        { new: true }
      );
      
      if (updatedBug) {
        console.log('\n🎉 Successfully updated bug with link content!');
        console.log('Updated link content:');
        console.log('='.repeat(70));
        console.log(updatedBug.link);
        console.log('='.repeat(70));
        
        console.log(`\n📊 Update Summary:`);
        console.log(`   Bug ID: ${updatedBug._id}`);
        console.log(`   PIMS: ${updatedBug.pims}`);
        console.log(`   Updated At: ${updatedBug.updatedAt}`);
        console.log(`   Link Content: ✅ Added (3 file paths)`);
        
        // Parse and show individual file paths
        const filePaths = updatedBug.link.split('\n').filter(line => line.trim());
        console.log(`\n📂 Individual File Paths:`);
        filePaths.forEach((path, index) => {
          const cleanPath = path.replace(/^"|"$/g, '').trim();
          console.log(`   ${index + 1}. ${cleanPath}`);
        });
        
      } else {
        console.log('❌ Failed to update bug');
      }
      
    } else {
      console.log('❌ Bug with PIMS-376407 not found in database');
    }
    
  } catch (error) {
    console.error('❌ Update error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
};

console.log('🚀 Starting update for PIMS-376407...');
updateSpecificBug();