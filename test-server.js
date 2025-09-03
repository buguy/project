const axios = require('axios');

async function testServer() {
  try {
    console.log('🔗 Testing server connection...');
    
    // Test if server is responding
    const response = await axios.get('http://localhost:5001');
    console.log('✅ Server is responding');
    console.log('Response:', response.status);
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is not running on port 5001');
    } else if (error.response?.status === 404) {
      console.log('✅ Server is running (404 is expected for GET /)');
    } else {
      console.log('❌ Server error:', error.message);
    }
  }
  
  // Test signup endpoint
  try {
    console.log('🔐 Testing signup endpoint...');
    const signupResponse = await axios.post('http://localhost:5001/api/signup', {
      username: 'testuser2',
      password: 'testpass2'
    });
    console.log('✅ Signup successful:', signupResponse.data.message);
    
  } catch (error) {
    console.log('📝 Signup response:', error.response?.status, error.response?.data?.message);
  }
  
  // Test login endpoint  
  try {
    console.log('🔐 Testing login endpoint...');
    const loginResponse = await axios.post('http://localhost:5001/api/login', {
      username: 'testuser',
      password: 'testpass'
    });
    console.log('✅ Login successful!');
    console.log('Token received:', loginResponse.data.token ? 'Yes' : 'No');
    
  } catch (error) {
    console.log('❌ Login failed:', error.response?.status, error.response?.data?.message);
  }
}

testServer();