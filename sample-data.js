const mongoose = require('mongoose');
require('dotenv').config();

const Bug = require('./models/Bug');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker';

const sampleBug = {
  status: "Pass",
  tcid: "171637.011",
  pims: "PIMS-365742",
  tester: "Christin",
  date: "2025/06/12",
  stage: "DDPM Win 2.1.1.1",
  product_customer_likelihood: "2_Low/Low/Frequent",
  test_case_name: "Network KVM Connectivity #15",
  chinese: "[DDPM Win 2.1.1]: hybrid pbp on 且未連線的情況下螢幕圖示顯示4格",
  title: "[DDPM Win 2.1.1]: In Hybrid PBP, when not connected, the monitor icon shows a 2x2 grid icon.",
  system_information: `DDPM version: 2.1.1.2
PC1 model : ASUS-FX516PM
OS version : Windows 10 Home 22H2 (19045.5965)
Graphics Chipset  : Intel(R) Iris(R) Xe Graphics
Monitor1 / FW : U5226KW/12T111
Input Source : C to DP (Connect to ASUS-FX516PM)`,
  description: `Testcase : Network KVM Connectivity #15
1. DUT connects to PC1 
2. In OSD, Go to PBP > PIP/PBP  > Hybrid
3. Check the monitor icon display when PC1 is not connected`
};

async function insertSampleData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const bug = new Bug(sampleBug);
    await bug.save();
    
    console.log('Sample bug record inserted with ID:', bug._id);
  } catch (error) {
    console.error('Error inserting sample data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

insertSampleData();