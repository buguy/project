const axios = require('axios');

async function testDateOrdering() {
  try {
    console.log('📅 Testing bug ordering by date...\n');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5001/api/login', {
      username: 'testuser2',
      password: 'testpass2'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Get bugs list to check ordering
    const bugsResponse = await axios.get('http://localhost:5001/api/bugs?page=1&limit=10', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const bugs = bugsResponse.data.bugs;
    console.log('📊 Retrieved', bugs.length, 'bugs');
    
    console.log('\n📅 Bug dates (showing first 10):');
    bugs.forEach((bug, index) => {
      console.log(`${index + 1}. ${bug.title || 'No Title'} - Date: ${bug.date} - Tester: ${bug.tester}`);
    });
    
    // Check if dates are in descending order
    let isProperlyOrdered = true;
    for (let i = 0; i < bugs.length - 1; i++) {
      const currentDate = new Date(bugs[i].date);
      const nextDate = new Date(bugs[i + 1].date);
      
      if (currentDate < nextDate) {
        isProperlyOrdered = false;
        console.log(`❌ Order issue: ${bugs[i].date} should come after ${bugs[i + 1].date}`);
        break;
      }
    }
    
    if (isProperlyOrdered) {
      console.log('\n✅ Bugs are properly ordered by date (newest first)');
    } else {
      console.log('\n❌ Bugs are NOT properly ordered by date');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.status, error.response?.data?.message);
  }
}

testDateOrdering();