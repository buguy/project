const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');
const archiver = require('archiver');
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

// Optimized log cleanup - only run periodically, not on every operation
let logCleanupCounter = 0;
const LOG_CLEANUP_INTERVAL = 100; // Run cleanup every 100 operations

const cleanupLogsIfNeeded = async () => {
  try {
    logCleanupCounter++;

    // Only run cleanup every LOG_CLEANUP_INTERVAL operations
    if (logCleanupCounter % LOG_CLEANUP_INTERVAL !== 0) {
      return;
    }

    // Count documents instead of getting collection stats for better performance
    const totalLogs = await OperationLog.countDocuments();

    // If more than 2000 logs, keep only the latest 1000
    if (totalLogs > 2000) {
      const logsToKeep = await OperationLog.find()
        .sort({ timestamp: -1 })
        .limit(1000)
        .select('_id');

      const idsToKeep = logsToKeep.map(log => log._id);
      const result = await OperationLog.deleteMany({
        _id: { $nin: idsToKeep }
      });

      console.log(`Cleaned up ${result.deletedCount} old operation logs`);
    }
  } catch (error) {
    console.error('Error cleaning up logs:', error);
  }
};

const app = express();
const PORT = process.env.PORT || 5000;

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

// Connect to MongoDB with optimized connection pooling
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker';
mongoose.connect(MONGODB_URI, {
  maxPoolSize: 10,        // Increase pool size for concurrent requests
  minPoolSize: 2,         // Maintain minimum connections
  maxIdleTimeMS: 10000,   // Close idle connections after 10s
  serverSelectionTimeoutMS: 5000, // Fail fast if server unavailable
  socketTimeoutMS: 45000,  // Socket timeout
  family: 4                // Use IPv4
})
  .then(() => console.log('Connected to MongoDB with optimized connection pool'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

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
  
  // TCID is optional, but if provided, must be a valid string
  if (tcid !== undefined && tcid !== null && tcid !== '' && typeof tcid !== 'string') {
    return res.status(400).json({ message: 'Invalid tcid: must be a string' });
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

// Bug routes - OPTIMIZED with limited fetch
app.get('/api/bugs', authenticateToken, async (req, res) => {
  try {
    // Extract search parameters
    const { search, pims, tester, status, stage, startDate, endDate } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const fetchAll = req.query.all === 'true';

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

    // Date range filtering (note: requires dates in consistent format for optimal performance)
    if (startDate || endDate) {
      // For string dates, we'll filter after retrieval
      // This is a temporary solution - ideally dates should be Date objects in DB
    }

    // PERFORMANCE OPTIMIZATION: Limit maximum documents fetched when not fetching all
    const MAX_FETCH_LIMIT = fetchAll ? 0 : limit * 2; // 0 means no limit when fetchAll is true

    // Use MongoDB sorting and limiting for better performance
    let queryBuilder = Bug.find(searchQuery)
      .sort({ createdAt: -1, _id: -1 }) // Sort by createdAt first (indexed), then _id
      .lean(); // Use lean() for better performance (returns plain objects)

    // Only apply limit if not fetching all
    if (MAX_FETCH_LIMIT > 0) {
      queryBuilder = queryBuilder.limit(MAX_FETCH_LIMIT);
    }

    let bugs = await queryBuilder;

    // Filter by date range if provided (after retrieval due to mixed formats)
    if (startDate || endDate) {
      bugs = bugs.filter(bug => {
        const bugDate = parseDate(bug.date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        return (!start || bugDate >= start) && (!end || bugDate <= end);
      });
    }

    // Sort by date field (handles mixed date formats)
    bugs.sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateB - dateA; // Descending order (latest first)
    });

    const totalBugs = bugs.length;

    if (fetchAll) {
      // Return all fetched bugs
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
      // Apply pagination
      const skip = (page - 1) * limit;
      const paginatedBugs = bugs.slice(skip, skip + limit);
      const totalPages = Math.ceil(totalBugs / limit);

      res.json({
        bugs: paginatedBugs,
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalBugs: totalBugs,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          nextPage: page < totalPages ? page + 1 : null,
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

    res.status(201).json({ message: 'Bug record created', id: bug._id, bug: bug });
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

    res.json({ message: 'Bug record updated', bug });
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

// Translation endpoint using Gemini API
app.post('/api/translate', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Text to translate is required' });
    }

    const GEMINI_API_KEY = 'AIzaSyCJw1El-XzIlAnmvMwyhVkv0Ll0j8xPcdQ';
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Translate the following Chinese text to English using formal, professional language suitable for technical bug reports. Avoid personal pronouns (I, you, we). Keep the same prefix [] and use objective, technical descriptions. Then on the next line (no blank line) provide the original Traditional Chinese text: ${text}`
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const translation = response.data.candidates[0].content.parts[0].text.trim();

    res.json({ translation });
  } catch (error) {
    console.error('Translation error:', error.response?.data || error.message);
    res.status(500).json({
      message: 'Translation failed',
      error: error.response?.data?.error?.message || error.message
    });
  }
});

// Grammar correction endpoint using Gemini API
app.post('/api/correct-grammar', authenticateToken, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Text to correct is required' });
    }

    const GEMINI_API_KEY = 'AIzaSyCJw1El-XzIlAnmvMwyhVkv0Ll0j8xPcdQ';
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Fix only obvious spelling and grammar errors in this text. Return the text with identical formatting - same line breaks, same spacing, same structure. Do not add line breaks, do not remove line breaks, do not change any formatting whatsoever. Text to fix:\n\n${text}`
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    let correctedText = response.data.candidates[0].content.parts[0].text.trim();

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

// Database backup endpoint
app.get('/api/backup', authenticateToken, async (req, res) => {
  try {
    console.log('Starting database backup...');

    // Get all collections data
    const bugsRaw = await Bug.find({}).lean();
    const usersRaw = await User.find({}).select('-password').lean(); // Exclude passwords
    const logsRaw = await OperationLog.find({}).lean();

    // Manually convert ObjectId to string for proper JSON serialization
    const convertIds = (doc) => {
      if (doc._id) {
        doc._id = doc._id.toString();
      }
      // Also check for any other potential ObjectId fields if they exist in schemas
      // For now, only _id is confirmed as an ObjectId from the lean query
      return doc;
    };

    const bugs = bugsRaw.map(convertIds);
    const users = usersRaw.map(convertIds);
    const logs = logsRaw.map(convertIds);

    console.log(`Backup data retrieved: ${bugs.length} bugs, ${users.length} users, ${logs.length} logs`);

    // Set headers for ZIP file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="bugtracker.zip"');

    // Create archiver instance
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      throw err;
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add JSON files to the archive
    archive.append(JSON.stringify(bugs, null, 2), { name: 'bugs.json' });
    archive.append(JSON.stringify(users, null, 2), { name: 'users.json' });
    archive.append(JSON.stringify(logs, null, 2), { name: 'operationlogs.json' });

    // Log the backup operation
    await logOperation(
      req.user.username,
      'DATABASE_BACKUP',
      'bugtracker',
      'Database backup created: bugtracker.zip',
      `Backed up ${bugs.length} bugs, ${users.length} users, ${logs.length} logs`,
      req
    );

    // Finalize the archive (finish appending files and close the stream)
    await archive.finalize();

    console.log('Backup ZIP created successfully');
  } catch (error) {
    console.error('Database backup error:', error);
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Error creating database backup',
        error: error.message
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
