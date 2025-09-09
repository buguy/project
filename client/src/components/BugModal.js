import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BugModal.css';

const BugModal = ({ bug, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    status: '',
    tcid: '',
    pims: '',
    tester: '',
    date: '',
    stage: '',
    product_customer_likelihood: '',
    test_case_name: '',
    chinese: '',
    title: '',
    system_information: '',
    description: '',
    link: '',
    zipFile: '',
    mp4File: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get current user from JWT token
    const getCurrentUser = () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.username;
        } catch (error) {
          console.error('Error decoding token:', error);
          return '';
        }
      }
      return '';
    };

    if (bug) {
      setFormData({
        status: bug.status || '',
        tcid: bug.tcid || '',
        pims: bug.pims || '',
        tester: bug.tester || '',
        date: bug.date || '',
        stage: bug.stage || '',
        product_customer_likelihood: bug.product_customer_likelihood || '',
        test_case_name: bug.test_case_name || '',
        chinese: bug.chinese || '',
        title: bug.title || '',
        system_information: bug.system_information || '',
        description: bug.description || '',
        link: bug.link || '',
        zipFile: bug.zipFile || '',
        mp4File: bug.mp4File || ''
      });
    } else {
      // Set defaults for new bug: current date, current user as tester, and default status
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
      const currentUser = getCurrentUser();
      setFormData(prev => ({ 
        ...prev, 
        date: today,
        tester: currentUser,
        status: 'Not Ready for PIMS'
      }));
    }
  }, [bug]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      if (bug) {
        await axios.put(`/api/bugs/${bug.id}`, formData, config);
      } else {
        await axios.post('/api/bugs', formData, config);
      }

      onSave();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save bug');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>{bug ? 'Edit Bug Record' : 'Add New Bug Record'}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="bug-form">
          <div className="form-row">
            <div className="form-group required">
              <label>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="">Select Status</option>
                <option value="Close">Close</option>
                <option value="Fail">Fail</option>
                <option value="Pending">Pending</option>
                <option value="Pass">Pass</option>
                <option value="Client Comments">Client Comments</option>
                <option value="Ready for Test">Ready for Test</option>
                <option value="Ready for PIMS">Ready for PIMS</option>
                <option value="Not Ready for PIMS">Not Ready for PIMS</option>
              </select>
            </div>
            <div className="form-group">
              <label>TCID</label>
              <input
                type="text"
                name="tcid"
                value={formData.tcid}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>PIMS</label>
              <input
                type="text"
                name="pims"
                value={formData.pims}
                onChange={handleChange}
              />
            </div>
            <div className="form-group required">
              <label>Tester</label>
              <input
                type="text"
                name="tester"
                value={formData.tester}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group required">
              <label>Date</label>
              <input
                type="text"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group required">
              <label>Stage</label>
              <input
                type="text"
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-group required">
            <label>Product/Customer/Likelihood</label>
            <select
              name="product_customer_likelihood"
              value={formData.product_customer_likelihood}
              onChange={handleChange}
              required
            >
              <option value="">Select Product/Customer/Likelihood</option>
              <option value="1_High/High/Frequent">1_High/High/Frequent</option>
              <option value="2_Medium/Medium/Remote">2_Medium/Medium/Remote</option>
              <option value="2_Low/Low/Frequent">2_Low/Low/Frequent</option>
              <option value="2_Medium/Low/Remote">2_Medium/Low/Remote</option>
              <option value="2_Low/High/Reasonably Probable">2_Low/High/Reasonably Probable</option>
              <option value="3_Low/Low/Remote">3_Low/Low/Remote</option>
            </select>
          </div>

          <div className="form-group">
            <label>Test Case Name</label>
            <input
              type="text"
              name="test_case_name"
              value={formData.test_case_name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Chinese</label>
            <input
              type="text"
              name="chinese"
              value={formData.chinese}
              onChange={handleChange}
            />
          </div>

          <div className="form-group required">
            <label>Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>System Information</label>
            <textarea
              name="system_information"
              value={formData.system_information}
              onChange={handleChange}
              rows="4"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="6"
            />
          </div>

          <div className="form-group">
            <label>Link</label>
            <input
              type="url"
              name="link"
              value={formData.link}
              onChange={handleChange}
            />
          </div>


          {error && <div className="error">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="save-btn">
              {loading ? 'Saving...' : (bug ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BugModal;