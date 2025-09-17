const mongoose = require('mongoose');

const operationLogSchema = new mongoose.Schema({
  user: {
    type: String,
    required: true
  },
  operation: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'COMMENT', 'MEETING', 'COPY']
  },
  target: {
    type: String,
    required: true // Bug ID or other target identifier
  },
  targetTitle: {
    type: String // Bug title for easier reading
  },
  details: {
    type: String // Additional operation details
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  bugData: {
    pims: String,
    tester: String,
    date: String,
    tcid: String
  }
}, {
  timestamps: true
});

// Index for efficient querying
operationLogSchema.index({ timestamp: -1 });
operationLogSchema.index({ user: 1, timestamp: -1 });

module.exports = mongoose.model('OperationLog', operationLogSchema);