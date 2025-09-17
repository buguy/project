const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

// Validate required environment variables
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET environment variable is required');
  process.exit(1);
}

const User = require('./models/User');
const Bug = require('./models/Bug');
const OperationLog = require('./models/OperationLog');

// Helper function to parse dates in different formats
const parseDate = (dateStr) => {
  if (!dateStr) return new Date(0); // Default to epoch for invalid dates
  
  // Handle different date formats
  if (dateStr.includes('/')) {
    // Check if it's YYYY/MM/DD or M/DD/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD format
        return new Date(parts[0], parts[1] - 1, parts[2]);
      } else {
        // M/DD/YYYY format
        return new Date(parts[2], parts[0] - 1, parts[1]);
      }
    }
  } else if (dateStr.includes('-')) {
    // YYYY-MM-DD format
    return new Date(dateStr);
  }
  
  // Try to parse as-is if no known format matches
  return new Date(dateStr);
};

// Helper function to log operations
const logOperation = async (user, operation, target, targetTitle, details, req, bugData = null) => {
  try {
    const log = new OperationLog({
      user,
      operation,
      target,
      targetTitle,
      details,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      // Store additional bug data for formatting
      bugData: bugData ? {
        pims: bugData.pims,
        tester: bugData.tester,
        date: bugData.date,
        tcid: bugData.tcid
      } : null
    });
    await log.save();

    // Check log size and cleanup if necessary
    await cleanupLogsIfNeeded();
  } catch (error) {
    console.error('Error logging operation:', error);
  }
};

// Helper function to cleanup logs if they exceed 10MB
const cleanupLogsIfNeeded = async () => {
  try {
    // Get total size of logs collection (approximate)
    const stats = await mongoose.connection.db.stats();
    const logsCollection = await mongoose.connection.db.collection('operationlogs').stats();
    
    // If size exceeds 10MB (10 * 1024 * 1024 bytes)
    if (logsCollection.size > 10 * 1024 * 1024) {
      // Delete oldest logs, keeping only the latest 1000
      const logs = await OperationLog.find().sort({ timestamp: -1 }).skip(1000);
      if (logs.length > 0) {
        const idsToDelete = logs.map(log => log._id);
        await OperationLog.deleteMany({ _id: { $in: idsToDelete } });
        console.log(`Cleaned up ${idsToDelete.length} old operation logs`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up logs:', error);
  }
};

const app = express();
const PORT = process.env.PORT || 5001;

// Configure CORS with specific origins
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL || 'https://yourdomain.com'
    : 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
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

// Get current user info
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ username: user.username, id: user._id });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Input validation middleware
const validateBugInput = (req, res, next) => {
  const { title, tester, status, tcid, date, stage, product_customer_likelihood, test_case_name } = req.body;
  
  // Validate required fields (matching Bug schema)
  if (!title || typeof title !== 'string' || title.length > 1000) {
    return res.status(400).json({ message: 'Invalid title: must be a non-empty string with max 1000 characters' });
  }
  
  if (!tester || typeof tester !== 'string' || tester.length > 200) {
    return res.status(400).json({ message: 'Invalid tester: must be a non-empty string with max 200 characters' });
  }
  
  if (!status || typeof status !== 'string' || status.length > 100) {
    return res.status(400).json({ message: 'Invalid status: must be a non-empty string with max 100 characters' });
  }
  
  if (!tcid || typeof tcid !== 'string' || tcid.trim().length === 0) {
    return res.status(400).json({ message: 'Invalid tcid: must be a non-empty string' });
  }
  
  if (!date || typeof date !== 'string') {
    return res.status(400).json({ message: 'Invalid date: must be a non-empty string' });
  }
  
  if (!stage || typeof stage !== 'string') {
    return res.status(400).json({ message: 'Invalid stage: must be a non-empty string' });
  }
  
  if (!product_customer_likelihood || typeof product_customer_likelihood !== 'string' || product_customer_likelihood.trim().length === 0) {
    return res.status(400).json({ message: 'Invalid product_customer_likelihood: must be a non-empty string' });
  }
  
  if (!test_case_name || typeof test_case_name !== 'string' || test_case_name.trim().length === 0) {
    return res.status(400).json({ message: 'Invalid test_case_name: must be a non-empty string' });
  }
  
  // Validate optional string fields
  const optionalStringFields = ['pims', 'chinese', 'system_information', 'description', 
                               'link', 'comments'];
  
  for (const field of optionalStringFields) {
    if (req.body[field] && typeof req.body[field] !== 'string') {
      return res.status(400).json({ message: `Invalid ${field}: must be a string` });
    }
  }
  
  next();
};

// Bug routes
app.get('/api/bugs', authenticateToken, async (req, res) => {
  try {
    // Check if we should fetch all bugs (for filtering)
    const fetchAll = req.query.all === 'true';
    
    // Extract search parameters
    const { search, pims, tester, status, stage, startDate, endDate } = req.query;
    
    // Build search query
    let searchQuery = {};
    
    // Search in title, chinese, description, or notes
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      searchQuery.$or = [
        { title: searchRegex },
        { chinese: searchRegex },
        { description: searchRegex },
        { notes: searchRegex },
        { system_information: searchRegex }
      ];
    }
    
    // PIMS search (partial match)
    if (pims && pims.trim()) {
      searchQuery.pims = new RegExp(pims.trim(), 'i');
    }
    
    // Exact matches for dropdowns
    if (tester && tester.trim()) {
      searchQuery.tester = tester.trim();
    }
    
    if (status && status.trim()) {
      searchQuery.status = status.trim();
    }
    
    if (stage && stage.trim()) {
      searchQuery.stage = stage.trim();
    }
    
    // Date range filtering
    if (startDate || endDate) {
      // We need to handle mixed date formats, so we'll do this in post-processing
      // for now, we'll filter all dates and process them after retrieval
    }
    
    // Get total count for pagination info
    const totalBugs = await Bug.countDocuments(searchQuery);

    if (fetchAll) {
      // Return all bugs without pagination - sort by date (latest first)
      let bugs = await Bug.find(searchQuery);
      
      // Filter by date range if provided (after retrieval due to mixed formats)
      if (startDate || endDate) {
        bugs = bugs.filter(bug => {
          const bugDate = parseDate(bug.date);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;
          
          return (!start || bugDate >= start) && (!end || bugDate <= end);
        });
      }
      
      // Sort bugs with custom date parsing to handle mixed formats
      bugs.sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA; // Descending order (latest first)
      });

      res.json({
        bugs,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalBugs,
          hasNextPage: false,
          hasPrevPage: false,
          nextPage: null,
          prevPage: null
        }
      });
    } else {
      // Normal pagination
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 15;
      const skip = (page - 1) * limit;
      const totalPages = Math.ceil(totalBugs / limit);

      // Get all bugs for sorting, then paginate
      let allBugs = await Bug.find(searchQuery);
      
      // Filter by date range if provided (after retrieval due to mixed formats)
      if (startDate || endDate) {
        allBugs = allBugs.filter(bug => {
          const bugDate = parseDate(bug.date);
          const start = startDate ? new Date(startDate) : null;
          const end = endDate ? new Date(endDate) : null;
          
          return (!start || bugDate >= start) && (!end || bugDate <= end);
        });
      }
      
      // Sort bugs with custom date parsing to handle mixed formats
      allBugs.sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA; // Descending order (latest first)
      });
      
      // Apply pagination after sorting and filtering
      const bugs = allBugs.slice(skip, skip + limit);
      
      // Recalculate pagination info based on filtered results
      const filteredTotal = allBugs.length;
      const filteredTotalPages = Math.ceil(filteredTotal / limit);

      res.json({
        bugs,
        pagination: {
          currentPage: page,
          totalPages: filteredTotalPages,
          totalBugs: filteredTotal,
          hasNextPage: page < filteredTotalPages,
          hasPrevPage: page > 1,
          nextPage: page < filteredTotalPages ? page + 1 : null,
          prevPage: page > 1 ? page - 1 : null
        }
      });
    }
  } catch (error) {
    console.error('Get bugs error:', error);
    res.status(500).json({ message: 'Database error' });
  }
});

// Get unique filter options from all bugs
app.get('/api/bugs/filters', authenticateToken, async (req, res) => {
  try {
    // Get unique testers
    const testers = await Bug.distinct('tester');
    const statuses = await Bug.distinct('status');
    const stages = await Bug.distinct('stage');
    
    res.json({
      testers: testers.filter(t => t && t.trim()).sort(),
      statuses: statuses.filter(s => s && s.trim()).sort(),
      stages: stages.filter(st => st && st.trim()).sort()
    });
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({ message: 'Error fetching filter options' });
  }
});

app.post('/api/bugs', authenticateToken, validateBugInput, async (req, res) => {
  try {
    const {
      status, tcid, pims, tester, date, stage, product_customer_likelihood,
      test_case_name, chinese, title, system_information, description, link, notes, meetings
    } = req.body;

    const bug = new Bug({
      status, tcid, pims, tester, date, stage, product_customer_likelihood,
      test_case_name, chinese, title, system_information, description, link, notes, meetings
    });

    await bug.save();
    
    // Log the operation
    await logOperation(
      req.user.username, 
      'CREATE', 
      bug._id.toString(), 
      title, 
      `Created bug: ${tcid} - ${title}`, 
      req,
      { pims, tester, date, tcid }
    );
    
    res.status(201).json({ message: 'Bug record created', id: bug._id });
  } catch (error) {
    console.error('Create bug error:', error);
    res.status(500).json({ message: 'Error creating bug record' });
  }
});

app.put('/api/bugs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Create update object with only provided fields (supports partial updates)
    const updateData = {};
    const allowedFields = [
      'status', 'tcid', 'pims', 'tester', 'date', 'stage', 'product_customer_likelihood',
      'test_case_name', 'chinese', 'title', 'system_information', 'description', 'link', 'notes', 'meetings'
    ];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Get the original bug before updating for comparison
    const originalBug = await Bug.findById(id);
    if (!originalBug) {
      return res.status(404).json({ message: 'Bug record not found' });
    }

    const bug = await Bug.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    // Determine operation type and log accordingly
    let operation = 'UPDATE';
    let details = `Updated bug: ${originalBug.tcid} - ${originalBug.title}`;
    
    if (updateData.notes && updateData.notes !== originalBug.notes) {
      operation = 'COMMENT';
      details = `Added comment to bug: ${originalBug.tcid} - ${originalBug.title}`;
    } else if (updateData.meetings && updateData.meetings !== originalBug.meetings) {
      operation = 'MEETING';
      details = `Added meeting notes to bug: ${originalBug.tcid} - ${originalBug.title}`;
    }

    // Log the operation
    await logOperation(
      req.user.username, 
      operation, 
      bug._id.toString(), 
      originalBug.title, 
      details, 
      req,
      { 
        pims: originalBug.pims, 
        tester: originalBug.tester, 
        date: originalBug.date, 
        tcid: originalBug.tcid 
      }
    );

    res.json({ message: 'Bug record updated' });
  } catch (error) {
    console.error('Update bug error:', error);
    res.status(500).json({ message: 'Error updating bug record' });
  }
});

app.delete('/api/bugs/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get bug info before deleting for logging
    const bug = await Bug.findById(id);
    if (!bug) {
      return res.status(404).json({ message: 'Bug record not found' });
    }

    await Bug.findByIdAndDelete(id);
    
    // Log the operation
    await logOperation(
      req.user.username, 
      'DELETE', 
      id, 
      bug.title, 
      `Deleted bug: ${bug.tcid} - ${bug.title}`, 
      req,
      { 
        pims: bug.pims, 
        tester: bug.tester, 
        date: bug.date, 
        tcid: bug.tcid 
      }
    );

    res.json({ message: 'Bug record deleted' });
  } catch (error) {
    console.error('Delete bug error:', error);
    res.status(500).json({ message: 'Error deleting bug record' });
  }
});

// Operation logs endpoints
app.get('/api/logs', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await OperationLog.find()
      .sort({ timestamp: -1 })
      .limit(limit);
    
    res.json(logs);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ message: 'Error fetching operation logs' });
  }
});

app.post('/api/logs', authenticateToken, async (req, res) => {
  try {
    const { operation, target, targetTitle, details, bugData } = req.body;
    
    await logOperation(
      req.user.username,
      operation,
      target,
      targetTitle,
      details,
      req,
      bugData
    );
    
    res.status(201).json({ message: 'Log created' });
  } catch (error) {
    console.error('Create log error:', error);
    res.status(500).json({ message: 'Error creating log' });
  }
});

app.get('/api/logs/download', authenticateToken, async (req, res) => {
  try {
    const logs = await OperationLog.find()
      .sort({ timestamp: -1 })
      .limit(1000); // Download up to 1000 latest logs
    
    // Convert logs to text format using the specified format
    let logText = 'Operation Logs Export\n';
    logText += '===================\n\n';
    
    logs.forEach(log => {
      // Format: CRUD Action..PIMS(if exist) Tester Date
      const action = log.operation;
      const pims = log.bugData?.pims ? `PIMS-${log.bugData.pims}` : '';
      const tester = log.bugData?.tester || log.user;
      const date = log.timestamp.toLocaleString();
      
      // First line
      const firstLine = `${action}${pims ? `_${pims}` : ''}_${tester}_${date}`;
      logText += `${firstLine}\n`;
      
      // Second line: Title (remove prefix [...])
      let title = log.targetTitle || log.target;
      title = title.replace(/^\[[^\]]*\]\s*/, '');
      logText += `${title}\n\n`;
    });
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', 'attachment; filename="operation_logs.txt"');
    res.send(logText);
  } catch (error) {
    console.error('Download logs error:', error);
    res.status(500).json({ message: 'Error downloading logs' });
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
        serviceAccountEmail: process.env.GOOGLE_CLIENT_EMAIL
      });
    }

    // Configure service account authentication
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    
    const auth = new GoogleAuth({
      credentials: {
        type: 'service_account',
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: privateKey,
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: 'https://accounts.google.com/o/oauth2/auth',
        token_uri: 'https://oauth2.googleapis.com/token',
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    // Get spreadsheet data - expanded to include more columns for notes
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:Z`,
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
        
        // Map column C specifically for PIMS notes (Column C is index 2)
        rowData['ColumnC'] = row[2] || '';
        
        // Extract comments/notes from Column C (PIMS column)
        // If Column C contains PIMS data with notes, we need to extract the notes part
        let pimsColumnData = row[2] || '';
        let extractedComments = '';
        
        // Check if Column C contains note patterns (looking for common note indicators)
        if (pimsColumnData && typeof pimsColumnData === 'string') {
          // Look for patterns like "PIMS-123456, note content" or notes after certain keywords
          const notePatterns = [
            /(?:update|note|info|comment|remark|fail|pass)[:：]\s*(.+)/i,
            /(?:\d+\/\d+\s+update|note|info)[:：]?\s*(.+)/i,
            /(?:BIOS|bios)[:：]\s*(.+)/i,
            /(?:fail|error|issue)[:：]?\s*(.+)/i
          ];
          
          for (const pattern of notePatterns) {
            const match = pimsColumnData.match(pattern);
            if (match && match[1]) {
              extractedComments = match[1].trim();
              break;
            }
          }
          
          // If no pattern matched but there's content after PIMS-XXXXXX, extract it
          if (!extractedComments) {
            const pimsMatch = pimsColumnData.match(/PIMS-\d+[,\s]*(.+)/i);
            if (pimsMatch && pimsMatch[1]) {
              extractedComments = pimsMatch[1].trim();
            }
          }
        }
        
        rowData['ExtractedComments'] = extractedComments;
        
        // Debug: Log first few rows to see what we're getting
        if (index < 5) {
          console.log(`Row ${index + 1} - Column C (PIMS):`, pimsColumnData);
          console.log(`Row ${index + 1} - Extracted Comments:`, extractedComments);
        }
        
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
          comments: rowData['ExtractedComments'] || rowData['Note'] || rowData['Notes'] || rowData['Comment'] || rowData['Comments'] || rowData['PIMS Note'] || rowData['ColumnC'] || ''
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
        // Filter out records with missing required fields
        const validBugs = batch.filter(bug => {
          return bug.status && bug.tester && bug.date && bug.test_case_name && bug.title && 
                 bug.tcid && bug.tcid.trim() !== '' &&
                 bug.stage && bug.stage.trim() !== '' &&
                 bug.product_customer_likelihood && bug.product_customer_likelihood.trim() !== '';
        });
        
        // Process each bug individually with upsert
        for (const bug of validBugs) {
          try {
            // Use composite unique identifier to handle duplicate TCIDs properly
            // Combine multiple fields to ensure each bug is truly unique
            const uniqueQuery = bug.tcid && bug.tcid.trim() !== '' 
              ? { 
                  tcid: bug.tcid,
                  title: bug.title,
                  tester: bug.tester
                }
              : { title: bug.title, tester: bug.tester, date: bug.date };
            
            const result = await Bug.updateOne(
              uniqueQuery,
              { 
                $set: bug,
                $setOnInsert: { 
                  _id: new mongoose.Types.ObjectId()
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

// Translation endpoint using Claude API
app.post('/api/translate', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Text to translate is required' });
    }

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Translate the following Chinese text to English using formal, professional language suitable for technical bug reports. Avoid personal pronouns (I, you, we). Keep the same prefix [] and use objective, technical descriptions. Then on the next line (no blank line) provide the original Traditional Chinese text: ${text}`
      }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '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',
        'anthropic-version': '2023-06-01'
      }
    });

    const translation = response.data.content[0].text.trim();

    res.json({ translation });
  } catch (error) {
    console.error('Translation error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Translation failed',
      error: error.response?.data?.error?.message || error.message
    });
  }
});

app.post('/api/correct-grammar', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Text to correct is required' });
    }

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-haiku-20240307',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Fix only obvious spelling and grammar errors in this text. Return the text with identical formatting - same line breaks, same spacing, same structure. Do not add line breaks, do not remove line breaks, do not change any formatting whatsoever. Text to fix:\n\n${text}`
      }]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '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',
        'anthropic-version': '2023-06-01'
      }
    });

    let correctedText = response.data.content[0].text.trim();

    // Preserve original line break structure
    const originalLines = text.split('\n');
    const correctedLines = correctedText.split('\n');

    // If the number of lines changed, try to restore original structure
    if (originalLines.length !== correctedLines.length) {
      // Simple approach: if original had "Result: \nExpectation:" structure, preserve it
      correctedText = correctedText.replace(/Result:\s*\n+Expectation:/g, 'Result: \nExpectation:');
      correctedText = correctedText.replace(/Result:\s+Expectation:/g, 'Result: \nExpectation:');
    }

    res.json({ correctedText });
  } catch (error) {
    console.error('Grammar correction error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Grammar correction failed',
      error: error.response?.data?.error?.message || error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
