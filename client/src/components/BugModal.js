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
    notes: '',
    meetings: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkFields, setLinkFields] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newMeeting, setNewMeeting] = useState('');
  const [translating, setTranslating] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [chineseTranslation, setChineseTranslation] = useState('');

  // Check if PIMS starts with "PIMS-" to disable fields
  const isPimsLocked = formData.pims && formData.pims.toLowerCase().startsWith('pims-');
  const isCommentMode = bug?.isCommentMode;
  const isMeetingMode = bug?.isMeetingMode;

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  useEffect(() => {
    // Get current user from server endpoint
    const getCurrentUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await axios.get('/api/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          return response.data.username;
        } catch (error) {
          console.error('Error fetching user info:', error);
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
        notes: bug.notes || '',
        meetings: bug.meetings || ''
      });


      // Initialize link fields from existing bug data
      if (bug.link) {
        const links = bug.link.split('\n').filter(link => link.trim());
        setLinkFields(links.map((link, index) => ({ id: index + 1, value: link.trim() })));
      }
    } else {
      // Set defaults for new bug: current date, current user as tester, default status, and system info template
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
      
      // Get current user and set form defaults
      const setDefaults = async () => {
        const currentUser = await getCurrentUser();
        const defaultSystemInfo = `DDPM version: 
PC1: 
PC2: 

Monitor1 / FW: 
Input1 Source: `;
        
        const defaultDescription = `Testcase: 
1. 
2. 

Result: 
Expectation: `;
        
        setFormData(prev => ({
          ...prev,
          date: today,
          tester: currentUser,
          status: 'Not Ready for PIMS',
          product_customer_likelihood: '3_Low/Low/Remote',
          system_information: defaultSystemInfo,
          description: defaultDescription,
          chinese: '[DDPM Win 2.2.0]: ',
          title: '[DDPM Win 2.2.0]: '
        }));
        
        setLinkFields([]);
      };
      
      setDefaults();
    }
  }, [bug]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // TCID validation - only allow alphanumeric characters, hyphens, underscores, and periods
    if (name === 'tcid') {
      const tcidPattern = /^[a-zA-Z0-9._-]*$/;
      if (!tcidPattern.test(value)) {
        return; // Don't update if invalid characters
      }
    }

    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleLinkChange = (id, value) => {
    setLinkFields(prev => 
      prev.map(field => 
        field.id === id ? { ...field, value } : field
      )
    );
  };

  const correctGrammar = async () => {
    if (!formData.description.trim()) {
      setError('Please enter description text to correct');
      return;
    }

    setCorrecting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/correct-grammar', {
        text: formData.description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const correctedText = response.data.correctedText;

      setFormData(prev => ({
        ...prev,
        description: correctedText
      }));
    } catch (error) {
      console.error('Grammar correction error:', error);
      setError(error.response?.data?.message || 'Grammar correction failed. Please try again.');
    } finally {
      setCorrecting(false);
    }
  };

  const addLinkField = () => {
    const newId = linkFields.length > 0 ? Math.max(...linkFields.map(f => f.id)) + 1 : 1;
    setLinkFields(prev => [...prev, { id: newId, value: '' }]);
  };

  const removeLinkField = (id) => {
    setLinkFields(prev => prev.filter(field => field.id !== id));
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

      if (isCommentMode) {
        // Comment mode: append new comment to existing notes
        if (!newComment.trim()) {
          setError('Please enter a comment');
          setLoading(false);
          return;
        }

        const currentUser = await getCurrentUser();
        const timestamp = new Date().toLocaleString();
        const commentWithHeader = `[${timestamp} - ${currentUser}]: ${newComment.trim()}`;
        
        const updatedNotes = bug.notes 
          ? `${commentWithHeader}\n\n${bug.notes}`
          : commentWithHeader;

        const submitData = {
          notes: updatedNotes
        };

        await axios.put(`/api/bugs/${bug._id}`, submitData, config);
      } else if (isMeetingMode) {
        // Meeting mode: append new meeting note to existing meetings
        if (!newMeeting.trim()) {
          setError('Please enter meeting notes');
          setLoading(false);
          return;
        }

        const currentUser = await getCurrentUser();
        const timestamp = new Date().toLocaleString();
        const meetingWithHeader = `[${timestamp} - ${currentUser}]: ${newMeeting.trim()}`;

        const updatedMeetings = bug.meetings
          ? `${meetingWithHeader}\n\n${bug.meetings}`
          : meetingWithHeader;

        const submitData = {
          meetings: updatedMeetings
        };

        await axios.put(`/api/bugs/${bug._id}`, submitData, config);
      } else {
        // Regular edit/create mode
        const combinedLinks = linkFields
          .map(field => field.value.trim())
          .filter(link => link)
          .join('\n');

        const submitData = {
          ...formData,
          link: combinedLinks
        };

        if (bug) {
          await axios.put(`/api/bugs/${bug._id}`, submitData, config);
        } else {
          await axios.post('/api/bugs', submitData, config);
        }
      }

      onSave();
    } catch (error) {
      console.error('Form submission error:', error);
      setError(error.response?.data?.message || 'Failed to save bug');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get('/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        return response.data.username;
      } catch (error) {
        console.error('Error fetching user info:', error);
        return 'Unknown User';
      }
    }
    return 'Unknown User';
  };

  const translateChineseToEnglish = async () => {
    if (!formData.chinese.trim()) {
      setError('Please enter Chinese text to translate');
      return;
    }

    setTranslating(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/translate', {
        text: formData.chinese
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const translation = response.data.translation;
      const lines = translation.split('\n').filter(line => line.trim());

      const englishLine = lines[0] || translation;
      const chineseLine = lines[1] || '';

      // Remove the prefix from Chinese line
      const chineseWithoutPrefix = chineseLine.replace(/^\[DDPM Win 2\.2\.0\]:\s*/, '');

      setFormData(prev => ({
        ...prev,
        title: englishLine
      }));

      setChineseTranslation(chineseWithoutPrefix);
    } catch (error) {
      console.error('Translation error:', error);
      setError(error.response?.data?.message || 'Translation failed. Please try again.');
    } finally {
      setTranslating(false);
    }
  };


  const handleOverlayClick = (e) => {
    // Prevent closing when clicking outside the form
    // Users must use the close button or cancel button to close the modal
    e.preventDefault();
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h3>{isCommentMode ? 'Add Comment' : (isMeetingMode ? 'Add Meeting Notes' : (bug ? 'Edit Bug Record' : 'Add New Bug Record'))}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="bug-form">
          {isCommentMode ? (
            <>
              <div className="comment-mode-info">
                <div className="bug-info-display">
                  <h4>{bug.title}</h4>
                  <div className="bug-meta-display">
                    <span><strong>TCID:</strong> {bug.tcid}</span>
                    <span><strong>Status:</strong> {bug.status}</span>
                    <span><strong>Tester:</strong> {bug.tester}</span>
                    <span><strong>PIMS:</strong> {bug.pims || 'N/A'}</span>
                  </div>
                </div>
                
                {bug.notes && (
                  <div className="existing-comments">
                    <label>Existing Comments:</label>
                    <div className="comments-display">
                      {bug.notes}
                    </div>
                  </div>
                )}
                
                <div className="form-group required">
                  <label>New Comment</label>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows="4"
                    placeholder="Enter your comment..."
                    required
                  />
                </div>
              </div>
            </>
          ) : isMeetingMode ? (
            <>
              <div className="meeting-mode-info">
                <div className="bug-info-display">
                  <h4>{bug.title}</h4>
                  <div className="bug-meta-display">
                    <span><strong>TCID:</strong> {bug.tcid}</span>
                    <span><strong>Status:</strong> {bug.status}</span>
                    <span><strong>Tester:</strong> {bug.tester}</span>
                    <span><strong>PIMS:</strong> {bug.pims || 'N/A'}</span>
                  </div>
                </div>
                
                {bug.meetings && (
                  <div className="existing-meetings">
                    <label>Existing Meeting Notes:</label>
                    <div className="meetings-display">
                      {bug.meetings}
                    </div>
                  </div>
                )}
                
                <div className="form-group required">
                  <label>New Meeting Notes</label>
                  <textarea
                    value={newMeeting}
                    onChange={(e) => setNewMeeting(e.target.value)}
                    rows="4"
                    placeholder="Enter meeting notes..."
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <>
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
                    pattern="[a-zA-Z0-9._-]*"
                    title="TCID can only contain letters, numbers, periods, hyphens, and underscores"
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

          <div className="form-group required">
            <label>Test Case Name</label>
            <input
              type="text"
              name="test_case_name"
              value={formData.test_case_name}
              onChange={handleChange}
                            required
            />
          </div>

          <div className="form-group">
            <div className="chinese-field-header">
              <label>Chinese</label>
              <button
                type="button"
                onClick={translateChineseToEnglish}
                disabled={translating || !formData.chinese.trim()}
                className="translate-btn"
                title="Translate Chinese to English using AI"
              >
{translating ? 'Translating...' : 'AI Translate'}
              </button>
            </div>
            <input
              type="text"
              name="chinese"
              value={formData.chinese}
              onChange={handleChange}
              placeholder="Enter Chinese text here..."
                          />
          </div>

          <div className="form-group required">
            <div className="title-field-header">
              <div className="title-label-section">
                <label>Title</label>
                {chineseTranslation && (
                  <span className="chinese-translation-display">
                    {chineseTranslation}
                  </span>
                )}
              </div>
            </div>
            <textarea
              name="title"
              value={formData.title}
              onChange={handleChange}
              rows="2"
              style={{ resize: 'vertical', minHeight: '2.5rem' }}
              placeholder="Enter bug title..."
                            required
            />
          </div>

          <div className="form-group">
            <label>System Information</label>
            <textarea
              name="system_information"
              value={formData.system_information}
              onChange={handleChange}
              rows="6"
                          />
          </div>

          <div className="form-group">
            <div className="description-field-header">
              <label>Description</label>
              <button
                type="button"
                onClick={correctGrammar}
                disabled={correcting || !formData.description.trim()}
                className="grammar-btn"
                title="Correct grammar using AI"
              >
                {correcting ? 'Correcting...' : 'Fix Grammar'}
              </button>
            </div>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="6"
            />
          </div>

          <div className="form-group">
            <div className="links-section">
              <div className="links-header">
                <label>Links</label>
                <button
                  type="button"
                  onClick={addLinkField}
                  className="add-link-btn"
                  title="Add Link"
                                  >
                  +
                </button>
              </div>
              
              {linkFields.length === 0 ? (
                <div className="no-links-message">
                  Click the + button to add link fields
                </div>
              ) : (
                linkFields.map((field) => (
                  <div key={field.id} className="link-field-row">
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) => handleLinkChange(field.id, e.target.value)}
                      placeholder="&quot;\\sdqa-server\Windows\Log&quot;"
                                          />
                    <button
                      type="button"
                      onClick={() => removeLinkField(field.id)}
                      className="remove-link-btn"
                                          >
                      <span className="remove-icon">×</span>
                      <span className="remove-text">Remove Link</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

              <div className="form-group">
                <label>Comments</label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Add comments or notes..."
                />
              </div>

              {bug && (
                <div className="form-group">
                  <label>Meeting Notes</label>
                  <textarea
                    name="meetings"
                    value={formData.meetings}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Add meeting notes..."
                  />
                </div>
              )}

            </>
          )}

          {error && <div className="error">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button 
              type="button" 
              onClick={(e) => {
                handleSubmit(e);
              }}
              disabled={loading} 
              className="save-btn"
            >
              {loading ? 'Saving...' : (isCommentMode ? 'Add Comment' : (isMeetingMode ? 'Add Meeting Notes' : (bug ? 'Update' : 'Create')))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BugModal;