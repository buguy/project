const mongoose = require('mongoose');

const bugSchema = new mongoose.Schema({
  status: {
    type: String,
    required: true
  },
  tcid: {
    type: String,
    required: true
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
    required: true
  },
  test_case_name: {
    type: String,
    required: true
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
  zipFile: {
    type: String  // URL or path to zip file
  },
  mp4File: {
    type: String  // URL or path to mp4 file
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Bug', bugSchema);