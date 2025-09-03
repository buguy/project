require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Bug = require('./models/Bug');

const jsonFilePath = path.join(__dirname, 'buglist-data.json');

async function reimportWithDetails() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker';
    await mongoose.connect(mongoURI);
    
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    console.log('Loaded', jsonData.length, 'records from JSON');
    
    const initialCount = await Bug.countDocuments();
    console.log('Initial database count:', initialCount);
    
    // Clear existing data to get accurate count
    console.log('\nClearing existing data for clean import...');
    await Bug.deleteMany({});
    const afterClear = await Bug.countDocuments();
    console.log('Database cleared. Count:', afterClear);
    
    // Import with detailed error tracking
    let successCount = 0;
    let errorCount = 0;
    let errors = [];
    
    const batchSize = 50; // Smaller batch for better error tracking
    
    for (let i = 0; i < jsonData.length; i += batchSize) {
      const batch = jsonData.slice(i, i + batchSize);
      
      try {
        const result = await Bug.insertMany(batch, { 
          ordered: false, // Continue even if some fail
          lean: true
        });
        successCount += result.length;
        console.log(`Batch ${Math.floor(i/batchSize) + 1}: ${result.length}/${batch.length} imported`);
        
      } catch (error) {
        // Handle bulk write errors
        if (error.name === 'BulkWriteError') {
          const inserted = error.result?.insertedCount || 0;
          successCount += inserted;
          
          error.writeErrors?.forEach(writeError => {
            errorCount++;
            errors.push({
              index: i + writeError.index,
              error: writeError.errmsg,
              record: batch[writeError.index]
            });
          });
          
          console.log(`Batch ${Math.floor(i/batchSize) + 1}: ${inserted}/${batch.length} imported, ${error.writeErrors?.length || 0} errors`);
        } else {
          console.error(`Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
          errorCount += batch.length;
        }
      }
    }
    
    const finalCount = await Bug.countDocuments();
    
    console.log('\n=== Final Import Results ===');
    console.log('Records attempted:', jsonData.length);
    console.log('Records imported:', successCount);
    console.log('Records with errors:', errorCount);
    console.log('Final database count:', finalCount);
    
    if (errors.length > 0) {
      console.log('\n=== Sample Errors ===');
      errors.slice(0, 5).forEach((err, i) => {
        console.log(`${i+1}. Index ${err.index}: ${err.error}`);
        console.log(`   Record: ${err.record.title?.substring(0, 50)}...`);
      });
    }
    
    await mongoose.connection.close();
    
  } catch (error) {
    console.error('Import failed:', error.message);
    process.exit(1);
  }
}

reimportWithDetails();