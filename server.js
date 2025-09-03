const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();

const User = require('./models/User');
const Bug = require('./models/Bug');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Auth routes
app.post('/api/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: user._id, username: user.username }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: { id: user._id, username: user.username }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bug routes
app.get('/api/bugs', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const totalBugs = await Bug.countDocuments();
    const totalPages = Math.ceil(totalBugs / limit);

    // Get paginated bugs - sort by updatedAt to show most recently updated/imported first
    const bugs = await Bug.find()
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      bugs,
      pagination: {
        currentPage: page,
        totalPages,
        totalBugs,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      }
    });
  } catch (error) {
    console.error('Get bugs error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post('/api/bugs', authenticateToken, async (req, res) => {
  try {
    const {
      status, tcid, pims, tester, date, stage, product_customer_likelihood,
      test_case_name, chinese, title, system_information, description, link, zipFile, mp4File
    } = req.body;

    const bug = new Bug({
      status, tcid, pims, tester, date, stage, product_customer_likelihood,
      test_case_name, chinese, title, system_information, description, link, zipFile, mp4File,
      updatedAt: new Date()
    });

    await bug.save();
    res.status(201).json({ message: 'Bug record created', id: bug._id });
  } catch (error) {
    console.error('Create bug error:', error);
    res.status(500).json({ message: 'Error creating bug record' });
  }
});

app.put('/api/bugs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status, tcid, pims, tester, date, stage, product_customer_likelihood,
      test_case_name, chinese, title, system_information, description, link, zipFile, mp4File
    } = req.body;

    const bug = await Bug.findByIdAndUpdate(
      id,
      {
        status, tcid, pims, tester, date, stage, product_customer_likelihood,
        test_case_name, chinese, title, system_information, description, link, zipFile, mp4File,
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!bug) {
      return res.status(404).json({ message: 'Bug record not found' });
    }

    res.json({ message: 'Bug record updated' });
  } catch (error) {
    console.error('Update bug error:', error);
    res.status(500).json({ message: 'Error updating bug record' });
  }
});

app.delete('/api/bugs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const bug = await Bug.findByIdAndDelete(id);
    if (!bug) {
      return res.status(404).json({ message: 'Bug record not found' });
    }

    res.json({ message: 'Bug record deleted' });
  } catch (error) {
    console.error('Delete bug error:', error);
    res.status(500).json({ message: 'Error deleting bug record' });
  }
});

// Google Sheets Import route
app.post('/api/import-google-sheet', authenticateToken, async (req, res) => {
  const { google } = require('googleapis');
  const { GoogleAuth } = require('google-auth-library');
  
  try {
    const { sheetId, sheetName } = req.body;
    
    if (!sheetId || !sheetName) {
      return res.status(400).json({ 
        message: 'Sheet ID and sheet name are required' 
      });
    }
    
    // Check if service account credentials are provided
    
    if (!process.env.GOOGLE_PRIVATE_KEY_ID || 
        !process.env.GOOGLE_PRIVATE_KEY || 
        !process.env.GOOGLE_CLIENT_ID ||
        process.env.GOOGLE_PRIVATE_KEY.includes('your_private_key_here') ||
        process.env.GOOGLE_PRIVATE_KEY_ID.includes('your_private_key_id_here')) {
      
      return res.status(400).json({
        message: 'Google service account credentials not configured',
        details: 'Please add your Google service account credentials to the .env file:\n\nGOOGLE_PRIVATE_KEY_ID=your_actual_private_key_id\nGOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nyour_actual_private_key\\n-----END PRIVATE KEY-----"\nGOOGLE_CLIENT_ID=your_actual_client_id\n\nThen share the Google Sheet with: myname@ddmtest-310706.iam.gserviceaccount.com',
        sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}`,
        serviceAccountEmail: 'myname@ddmtest-310706.iam.gserviceaccount.com'
      });
    }

    // Configure service account authentication
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    const auth = new GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: 'ddmtest-310706',
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: 'myname@ddmtest-310706.iam.gserviceaccount.com',
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/myname%40ddmtest-310706.iam.gserviceaccount.com`
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Get spreadsheet data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:O`,
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: 'No data found in the sheet' });
    }
    
    // Skip header row and process data
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    console.log('Headers found:', headers);
    console.log('Data rows:', dataRows.length);
    
    // Map Google Sheet data to bug schema
    const bugs = dataRows.map((row, index) => {
      try {
        // Create a mapping object from headers to values
        const rowData = {};
        headers.forEach((header, i) => {
          rowData[header] = row[i] || '';
        });
        
        // Handle date conversion if needed
        let dateValue = rowData['Date'] || new Date().toISOString().split('T')[0];
        if (typeof dateValue === 'number') {
          // Excel serial date conversion
          const excelEpoch = new Date(1900, 0, 1);
          const date = new Date(excelEpoch.getTime() + (dateValue - 1) * 24 * 60 * 60 * 1000);
          dateValue = date.toISOString().split('T')[0];
        }
        
        return {
          status: rowData['Status'] || 'pending',
          tcid: rowData['TCID'] || '',
          pims: rowData['PIMS'] || '',
          tester: rowData['Tester'] || 'Unknown',
          date: dateValue,
          stage: rowData['Stage'] || '',
          product_customer_likelihood: rowData['Product/Customer/Likelihood'] || '',
          test_case_name: rowData['TestCaseName'] || rowData['Test Case Name'] || `Test Case ${index + 1}`,
          chinese: rowData['Chinese'] || '',
          title: rowData['Title'] || `Bug ${index + 1}`,
          system_information: rowData['System information'] || rowData['System Information'] || '',
          description: rowData['Description'] || '',
          link: rowData['Link'] || rowData['Links'] || '',
          zipFile: rowData['ZipFile'] || rowData['Zip File'] || '',
          mp4File: rowData['Mp4File'] || rowData['Mp4 File'] || rowData['Video File'] || ''
        };
      } catch (error) {
        console.error(`Error processing row ${index + 1}:`, error);
        return null;
      }
    }).filter(bug => bug !== null);
    
    console.log('Processed bugs:', bugs.length);
    
    // Import bugs using upsert mechanism to handle both new and existing bugs
    const batchSize = 100;
    let importedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < bugs.length; i += batchSize) {
      const batch = bugs.slice(i, i + batchSize);
      
      try {
        // Filter out records with missing required fields or no PIMS
        const validBugs = batch.filter(bug => {
          return bug.status && bug.tester && bug.date && bug.test_case_name && bug.title && 
                 bug.pims && bug.pims.trim() !== '';
        });
        
        // Process each bug individually with upsert
        for (const bug of validBugs) {
          try {
            // Use TCID as unique identifier, fallback to title if TCID is empty
            const uniqueQuery = bug.tcid && bug.tcid.trim() !== '' 
              ? { tcid: bug.tcid }
              : { title: bug.title, tester: bug.tester, date: bug.date };
            
            const result = await Bug.updateOne(
              uniqueQuery,
              { 
                $set: { 
                  ...bug, 
                  updatedAt: new Date() 
                },
                $setOnInsert: { 
                  _id: new mongoose.Types.ObjectId(),
                  createdAt: new Date()
                }
              },
              { 
                upsert: true,
                new: true
              }
            );
            
            if (result.upsertedCount > 0) {
              importedCount++;
            } else if (result.modifiedCount > 0) {
              updatedCount++;
            }
          } catch (bugError) {
            console.error(`Error processing bug:`, bugError.message);
            errorCount++;
          }
        }
        
        errorCount += batch.length - validBugs.length;
      } catch (error) {
        console.error(`Batch processing error:`, error.message);
        errorCount += batch.length;
      }
    }
    
    res.json({
      message: 'Google Sheet import completed',
      totalRows: dataRows.length,
      imported: importedCount,
      updated: updatedCount,
      errors: errorCount,
      headers: headers
    });
    
  } catch (error) {
    console.error('Google Sheets import error:', error);
    
    if (error.message.includes('permission') || error.message.includes('PERMISSION_DENIED')) {
      return res.status(403).json({ 
        message: 'Google Sheet access denied',
        details: 'The sheet needs to be publicly shared. Please:\n1. Open the Google Sheet\n2. Click "Share" button\n3. Change access to "Anyone with the link can view"\n4. Try importing again',
        sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}`
      });
    } else if (error.message.includes('API key')) {
      return res.status(401).json({ 
        message: 'Invalid API key',
        details: 'The Google Sheets API key may be invalid or expired.'
      });
    } else if (error.message.includes('not found') || error.message.includes('404')) {
      return res.status(404).json({ 
        message: 'Sheet or tab not found',
        details: `Could not find sheet "${sheetName}" in the Google Sheet. Please verify the sheet name.`
      });
    } else if (error.message.includes('400')) {
      return res.status(400).json({
        message: 'Invalid sheet parameters',
        details: 'Please check that the Sheet ID and sheet name are correct.'
      });
    }
    
    res.status(500).json({ 
      message: 'Import failed', 
      details: error.message,
      troubleshooting: 'Please ensure the Google Sheet is publicly accessible and the API key is valid.'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
