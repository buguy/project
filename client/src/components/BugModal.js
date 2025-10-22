import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BugModal.css';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography
} from '@mui/material';

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deletingMeetingIndex, setDeletingMeetingIndex] = useState(null);
  const [deletingCommentIndex, setDeletingCommentIndex] = useState(null);
  const [fixingGrammar, setFixingGrammar] = useState(false);

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
    console.log('🟡 useEffect triggered - bug updated:', bug?.notes?.substring(0, 100));
    console.log('🟡 Full bug object:', bug);

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
      console.log('🟡 Setting formData with bug.notes:', bug.notes?.substring(0, 100));
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

  // Convert Mac path to Windows path format
  const convertMacToWindowsPath = (path) => {
    // Remove leading/trailing whitespace
    let converted = path.trim();

    // Check if it's a Mac path (starts with /Volumes/)
    if (converted.startsWith('/Volumes/')) {
      // Remove /Volumes/ prefix
      converted = converted.replace(/^\/Volumes\//, '');

      // Split by the first slash to separate server/share from the rest
      const parts = converted.split('/');
      if (parts.length >= 2) {
        // First part is the server/share name (e.g., "Windows")
        const shareName = parts[0];
        // Rest is the path
        const restPath = parts.slice(1).join('\\');

        // Construct Windows UNC path
        converted = `"\\\\SDQA-SEVER\\${shareName}\\${restPath}"`;
      }
    }
    // Check if it's already a Windows path but missing quotes
    else if (converted.startsWith('\\\\') && !converted.startsWith('"')) {
      converted = `"${converted}"`;
    }

    return converted;
  };

  const handleLinkChange = (id, value) => {
    setLinkFields(prev =>
      prev.map(field =>
        field.id === id ? { ...field, value } : field
      )
    );
  };

  // Auto-convert path on paste
  const handleLinkPaste = (id, e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const convertedPath = convertMacToWindowsPath(pastedText);

    setLinkFields(prev =>
      prev.map(field =>
        field.id === id ? { ...field, value: convertedPath } : field
      )
    );
  };

  // Convert all link paths at once
  const convertAllLinkPaths = () => {
    setLinkFields(prev =>
      prev.map(field => ({
        ...field,
        value: convertMacToWindowsPath(field.value)
      }))
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
    console.log('🔵 handleSubmit called');
    console.log('🔵 isCommentMode:', isCommentMode);
    console.log('🔵 newComment:', newComment);
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      if (isCommentMode) {
        console.log('🔵 In comment mode');
        // Comment mode: append new comment to existing notes
        if (!newComment.trim()) {
          console.log('🔴 Comment is empty');
          setError('Please enter a comment');
          setLoading(false);
          return;
        }
        console.log('🟢 Comment validation passed');

        const currentUser = await getCurrentUser();
        const timestamp = new Date().toLocaleString();
        const commentWithHeader = `[${timestamp} - ${currentUser}]: ${newComment.trim()}`;

        const updatedNotes = bug.notes
          ? `${commentWithHeader}\n\n${bug.notes}`
          : commentWithHeader;

        const submitData = {
          notes: updatedNotes
        };

        console.log('🟢 Sending API request to update bug:', bug._id);
        const response = await axios.put(`/api/bugs/${bug._id}`, submitData, config);
        console.log('🟢 API request successful');

        // Use the updated bug object from server response
        const updatedBugLocal = response.data.bug || {
          ...bug,
          notes: updatedNotes
        };

        // Clear form and reset state
        setError('');
        setNewComment('');

        // Pass the updated bug back to parent with comment flag but don't close modal
        console.log('🟢 Calling onSave with updated bug:', updatedBugLocal.notes?.substring(0, 100));
        onSave(updatedBugLocal, true, false); // false = don't close modal
        console.log('🟢 onSave completed');
        return;
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

        const response = await axios.put(`/api/bugs/${bug._id}`, submitData, config);

        // Use the updated bug object from server response
        const updatedBugLocal = response.data.bug || {
          ...bug,
          meetings: updatedMeetings
        };

        // Clear form and reset state
        setError('');
        setNewMeeting('');

        // Pass the updated bug back to parent with meeting flag but don't close modal
        onSave(updatedBugLocal, true, false); // false = don't close modal
        return;
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

        let savedBug;
        if (bug) {
          const response = await axios.put(`/api/bugs/${bug._id}`, submitData, config);
          savedBug = response.data.bug || { ...bug, ...submitData };
        } else {
          const response = await axios.post('/api/bugs', submitData, config);
          console.log('Create bug response:', response.data);

          // Ensure we have the complete bug object from the server
          if (response.data.bug && response.data.bug._id) {
            savedBug = response.data.bug;
          } else {
            // Fallback: construct bug object from response and submitted data
            savedBug = {
              _id: response.data.id,
              ...submitData,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          }
        }

        console.log('Saved bug object:', savedBug);
        onSave(savedBug);
      }
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

  const fixCommentGrammar = async () => {
    if (!newComment.trim()) {
      setError('Please enter a comment to fix grammar');
      return;
    }

    setFixingGrammar(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/correct-grammar', {
        text: newComment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const correctedText = response.data.correctedText;
      setNewComment(correctedText);
    } catch (error) {
      console.error('Grammar correction error:', error);
      setError(error.response?.data?.message || 'Failed to fix grammar. Please try again.');
    } finally {
      setFixingGrammar(false);
    }
  };

  const handleDeleteMeeting = async (indexToDelete) => {
    setDeletingMeetingIndex(indexToDelete);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Split meetings into array, remove the one at indexToDelete, and rejoin
      const meetingsArray = bug.meetings.split('\n\n').filter(meeting => meeting.trim());
      const updatedMeetingsArray = meetingsArray.filter((_, index) => index !== indexToDelete);
      const updatedMeetings = updatedMeetingsArray.join('\n\n');

      const submitData = {
        meetings: updatedMeetings
      };

      const response = await axios.put(`/api/bugs/${bug._id}`, submitData, config);

      // Use the updated bug object from server response
      const updatedBugLocal = response.data.bug || {
        ...bug,
        meetings: updatedMeetings
      };

      // Pass the updated bug back to parent with meeting flag but don't close modal
      onSave(updatedBugLocal, true, false); // false = don't close modal
    } catch (error) {
      console.error('Delete meeting error:', error);
      setError(error.response?.data?.message || 'Failed to delete meeting note');
    } finally {
      setDeletingMeetingIndex(null);
    }
  };

  const handleDeleteComment = async (indexToDelete) => {
    setDeletingCommentIndex(indexToDelete);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      // Split comments into array, remove the one at indexToDelete, and rejoin
      const commentsArray = bug.notes.split('\n\n').filter(comment => comment.trim());
      const updatedCommentsArray = commentsArray.filter((_, index) => index !== indexToDelete);
      const updatedComments = updatedCommentsArray.join('\n\n');

      const submitData = {
        notes: updatedComments
      };

      const response = await axios.put(`/api/bugs/${bug._id}`, submitData, config);

      // Use the updated bug object from server response
      const updatedBugLocal = response.data.bug || {
        ...bug,
        notes: updatedComments
      };

      // Pass the updated bug back to parent with comment flag but don't close modal
      onSave(updatedBugLocal, true, false); // false = don't close modal
    } catch (error) {
      console.error('Delete comment error:', error);
      setError(error.response?.data?.message || 'Failed to delete comment');
    } finally {
      setDeletingCommentIndex(null);
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
          <h3>{isCommentMode ? 'Comments' : (isMeetingMode ? 'Meeting Notes' : (bug ? 'Edit Bug Record' : 'Add New Bug Record'))}</h3>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="bug-form">
          {isCommentMode ? (
            <div className="comments-layout">
              {/* Bug Context Section */}
              <div className="bug-context-section">
                <div className="bug-title-row">
                  <h4 className="bug-title-compact">{bug.title}</h4>
                  <div className="bug-id-badge">
                    {bug.pims || bug.tcid || 'No ID'}
                  </div>
                </div>
                <div className="bug-meta-compact">
                  <span className="meta-item">
                    <span className="meta-label">Status:</span>
                    <span className={`status-badge status-${bug.status.toLowerCase()}`}>
                      {bug.status}
                    </span>
                  </span>
                  <span className="meta-item">
                    <span className="meta-label">Tester:</span>
                    <span className="meta-value">{bug.tester}</span>
                  </span>
                </div>
              </div>

              {/* Comments History Section */}
              <div className="comments-history-section">
                <div className="section-header">
                  <div className="section-title">
                    <span className="section-icon">💬</span>
                    Comment History
                  </div>
                  {bug.notes && (
                    <div className="comments-count">
                      {bug.notes.split('[').length - 1} comments
                    </div>
                  )}
                </div>

                <div className="comments-history-container">
                  {bug.notes ? (
                    <div className="comments-timeline">
                      {bug.notes.split('\n\n').filter(comment => comment.trim()).map((comment, index) => (
                        <div key={index} className="comment-item">
                          <div className="comment-content" style={{ whiteSpace: 'pre-line' }}>
                            {comment.trim()}
                          </div>
                          <button
                            type="button"
                            className="delete-comment-btn"
                            onClick={() => handleDeleteComment(index)}
                            disabled={deletingCommentIndex === index}
                            title="Delete this comment"
                          >
                            {deletingCommentIndex === index ? '...' : '×'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-comments-placeholder">
                      <span className="placeholder-icon">📝</span>
                      <span className="placeholder-text">No comments yet. Add the first comment below.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Add New Comment Section */}
              <div className="add-comment-section">
                <div className="section-header">
                  <div className="section-title">
                    <span className="section-icon">✏️</span>
                    Add New Comment
                  </div>
                  <button
                    type="button"
                    className="grammar-fix-btn"
                    disabled={fixingGrammar || !newComment.trim()}
                    onClick={fixCommentGrammar}
                    title="Fix grammar using AI"
                  >
                    {fixingGrammar ? 'Fixing...' : 'Grammar Fix'}
                  </button>
                </div>

                <div className="comment-input-container">
                  <textarea
                    className="comment-input"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows="4"
                    placeholder="Type your comment here..."
                  />
                  <div className="input-helper">
                    <button
                      type="button"
                      className="add-comment-btn"
                      disabled={loading || !newComment.trim()}
                      onClick={(e) => handleSubmit(e)}
                    >
                      {loading ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : isMeetingMode ? (
            <div className="comments-layout">
              {/* Bug Context Section */}
              <div className="bug-context-section">
                <div className="bug-title-row">
                  <h4 className="bug-title-compact">{bug.title}</h4>
                  <div className="bug-id-badge">
                    {bug.pims || bug.tcid || 'No ID'}
                  </div>
                </div>
                <div className="bug-meta-compact">
                  <span className="meta-item">
                    <span className="meta-label">Status:</span>
                    <span className={`status-badge status-${bug.status.toLowerCase()}`}>
                      {bug.status}
                    </span>
                  </span>
                  <span className="meta-item">
                    <span className="meta-label">Tester:</span>
                    <span className="meta-value">{bug.tester}</span>
                  </span>
                </div>
              </div>

              {/* Meeting History Section */}
              <div className="comments-history-section">
                <div className="section-header">
                  <div className="section-title">
                    <span className="section-icon">📝</span>
                    Meeting History
                  </div>
                  {bug.meetings && (
                    <div className="comments-count">
                      {bug.meetings.split('[').length - 1} meetings
                    </div>
                  )}
                </div>

                <div className="comments-history-container">
                  {bug.meetings ? (
                    <div className="comments-timeline">
                      {bug.meetings.split('\n\n').filter(meeting => meeting.trim()).map((meeting, index) => (
                        <div key={index} className="comment-item">
                          <div className="comment-content" style={{ whiteSpace: 'pre-line' }}>
                            {meeting.trim()}
                          </div>
                          <button
                            type="button"
                            className="delete-comment-btn"
                            onClick={() => handleDeleteMeeting(index)}
                            disabled={deletingMeetingIndex === index}
                            title="Delete this meeting note"
                          >
                            {deletingMeetingIndex === index ? '...' : '×'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="no-comments-placeholder">
                      <span className="placeholder-icon">📋</span>
                      <span className="placeholder-text">No meeting notes yet. Add the first meeting notes below.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Add New Meeting Section */}
              <div className="add-comment-section">
                <div className="section-header">
                  <div className="section-title">
                    <span className="section-icon">✏️</span>
                    Add New Meeting Notes
                  </div>
                </div>

                <div className="comment-input-container">
                  <textarea
                    className="comment-input"
                    value={newMeeting}
                    onChange={(e) => setNewMeeting(e.target.value)}
                    rows="4"
                    placeholder="Type your meeting notes here..."
                  />
                  <div className="input-helper">
                    <button
                      type="button"
                      className="add-comment-btn"
                      disabled={loading || !newMeeting.trim()}
                      onClick={(e) => handleSubmit(e)}
                    >
                      {loading ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
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

          <div className="form-divider"></div>

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
                  onClick={convertAllLinkPaths}
                  className="convert-all-paths-btn"
                  title="Convert all paths to Windows format"
                  disabled={linkFields.length === 0}
                                    >
                  Convert Path
                </button>
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
                      onPaste={(e) => handleLinkPaste(field.id, e)}
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


            </>
          )}

          {error && <div className="error">{error}</div>}

          <div className="form-actions">
            {isCommentMode || isMeetingMode ? (
              <button
                type="button"
                onClick={() => {
                  const textToCheck = isCommentMode ? newComment.trim() : newMeeting.trim();
                  if (textToCheck) {
                    setShowConfirmDialog(true);
                  } else {
                    onClose();
                  }
                }}
                className="cancel-btn-center"
              >
                Cancel
              </button>
            ) : (
              <>
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
                  {loading ? 'Saving...' : (bug ? 'Update' : 'Create')}
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Material UI Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" component="h4" sx={{ fontWeight: 600, color: '#1e293b' }}>
            Unsaved Changes
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body1" sx={{ color: '#475569', lineHeight: 1.5 }}>
            You have unsaved {isCommentMode ? 'comment' : 'meeting notes'}. Are you sure you want to cancel?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setShowConfirmDialog(false)}
            variant="outlined"
            sx={{
              color: '#64748b',
              borderColor: '#cbd5e1',
              '&:hover': {
                backgroundColor: '#f8fafc',
                borderColor: '#94a3b8'
              }
            }}
          >
            Keep Editing
          </Button>
          <Button
            onClick={() => {
              setShowConfirmDialog(false);
              onClose();
            }}
            variant="contained"
            color="error"
            sx={{
              backgroundColor: '#ef4444',
              '&:hover': {
                backgroundColor: '#dc2626',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }
            }}
          >
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default BugModal;