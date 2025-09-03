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
      // Set default date to today
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
      setFormData(prev => ({ ...prev, date: today }));
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
            <div className="form-group">
              <label>Status *</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="">Select Status</option>
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
              </select>
            </div>
            <div className="form-group">
              <label>TCID *</label>
              <input
                type="text"
                name="tcid"
                value={formData.tcid}
                onChange={handleChange}
                placeholder="e.g., 171637.011"
                required
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
                placeholder="e.g., PIMS-365742"
              />
            </div>
            <div className="form-group">
              <label>Tester *</label>
              <input
                type="text"
                name="tester"
                value={formData.tester}
                onChange={handleChange}
                placeholder="e.g., Christin"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input
                type="text"
                name="date"
                value={formData.date}
                onChange={handleChange}
                placeholder="e.g., 2025/06/12"
                required
              />
            </div>
            <div className="form-group">
              <label>Stage *</label>
              <input
                type="text"
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                placeholder="e.g., DDPM Win 2.1.1.1"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Product/Customer/Likelihood *</label>
            <input
              type="text"
              name="product_customer_likelihood"
              value={formData.product_customer_likelihood}
              onChange={handleChange}
              placeholder="e.g., 2_Low/Low/Frequent"
              required
            />
          </div>

          <div className="form-group">
            <label>Test Case Name *</label>
            <input
              type="text"
              name="test_case_name"
              value={formData.test_case_name}
              onChange={handleChange}
              placeholder="e.g., Network KVM Connectivity #15"
              required
            />
          </div>

          <div className="form-group">
            <label>Chinese</label>
            <input
              type="text"
              name="chinese"
              value={formData.chinese}
              onChange={handleChange}
              placeholder="Chinese description"
            />
          </div>

          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Brief title of the issue"
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
              placeholder="DDPM version, PC model, OS version, Graphics Chipset, Monitor, Input Source, etc."
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="6"
              placeholder="Detailed description of the test case and steps"
            />
          </div>

          <div className="form-group">
            <label>Link</label>
            <input
              type="url"
              name="link"
              value={formData.link}
              onChange={handleChange}
              placeholder="https://example.com/related-link"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>ZIP File URL</label>
              <input
                type="url"
                name="zipFile"
                value={formData.zipFile}
                onChange={handleChange}
                placeholder="https://example.com/files/bug-evidence.zip"
              />
            </div>
            <div className="form-group">
              <label>MP4 File URL</label>
              <input
                type="url"
                name="mp4File"
                value={formData.mp4File}
                onChange={handleChange}
                placeholder="https://example.com/files/bug-video.mp4"
              />
            </div>
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