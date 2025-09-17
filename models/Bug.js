const mongoose = require('mongoose');

const bugSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true
  },
  tcid: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return v && v.trim().length > 0;
      },
      message: 'TCID cannot be empty'
    }
  },
  pims: {
    type: String
  },
  tester: {
    type: String,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  stage: {
    type: String,
    required: true
  },
  product_customer_likelihood: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return v && v.trim().length > 0;
      },
      message: 'Product/Customer/Likelihood cannot be empty'
    }
  },
  test_case_name: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return v && v.trim().length > 0;
      },
      message: 'Test Case Name cannot be empty'
    }
  },
  chinese: {
    type: String
  },
  title: {
    type: String,
    required: true
  },
  system_information: {
    type: String
  },
  description: {
    type: String
  },
  link: {
    type: String
  },
  notes: {
    type: String  // Notes field for comments from Excel/PIMS
  },
  meetings: {
    type: String  // Meeting notes field
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Bug', bugSchema);