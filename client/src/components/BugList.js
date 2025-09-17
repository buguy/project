import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import BugModal from './BugModal';
import LogsPage from './LogsPage';
import ConfirmationModal from './ConfirmationModal';
import './BugList.css';

const BugList = () => {
  const [bugs, setBugs] = useState([]);
  const [filteredBugs, setFilteredBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBug, setEditingBug] = useState(null);
  const [expandedBugId, setExpandedBugId] = useState(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [filteredPage, setFilteredPage] = useState(1);
  const itemsPerPage = 15;
  
  // Import states
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTester, setSelectedTester] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPims, setSelectedPims] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Operation logs states
  const [operationLogs, setOperationLogs] = useState([]);
  const [showLogsPage, setShowLogsPage] = useState(false);
  
  // Confirmation modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState({
    title: '',
    message: '',
    type: 'default',
    onConfirm: null
  });
  
  // Filter options from backend
  const [filterOptions, setFilterOptions] = useState({
    testers: [],
    statuses: [],
    stages: []
  });

  // Debounce timeout reference
  const debounceTimeout = React.useRef(null);

  useEffect(() => {
    fetchBugs(currentPage);
  }, [currentPage]);

  // Fetch filter options and logs on component mount
  useEffect(() => {
    fetchFilterOptions();
    fetchOperationLogs();
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/bugs/filters', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFilterOptions(response.data);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchOperationLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/logs?limit=50', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOperationLogs(response.data);
    } catch (error) {
      console.error('Error fetching operation logs:', error);
    }
  };

  const fetchBugs = async (page = 1, fetchAll = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = {
        ...(fetchAll ? { all: 'true' } : { page, limit: 15 }),
        // Add search parameters
        ...(searchQuery && { search: searchQuery }),
        ...(selectedPims && { pims: selectedPims }),
        ...(selectedTester && { tester: selectedTester }),
        ...(selectedStatus && { status: selectedStatus }),
        ...(selectedStage && { stage: selectedStage }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      };
      
      const response = await axios.get('/api/bugs', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setBugs(response.data.bugs);
      setFilteredBugs(response.data.bugs);
      setPagination(response.data.pagination);
      
    } catch (error) {
      setError('Failed to fetch bugs');
    } finally {
      setLoading(false);
    }
  };

  // Manual search function (triggered by button click or Enter key)
  const performSearch = useCallback(() => {
    const hasFilters = searchQuery || selectedTester || selectedStatus || selectedPims || selectedStage || startDate || endDate;
    
    if (hasFilters) {
      fetchBugs(1, true);
    } else {
      fetchBugs(1, false);
    }
    setCurrentPage(1);
  }, [searchQuery, selectedTester, selectedStatus, selectedPims, selectedStage, startDate, endDate]);

  // Trigger immediate search ONLY for dropdown changes (Tester, Status, Stage, dates)
  useEffect(() => {
    if (loading) return; 
    
    const hasFilters = searchQuery || selectedTester || selectedStatus || selectedPims || selectedStage || startDate || endDate;
    
    if (hasFilters) {
      fetchBugs(1, true);
    } else {
      fetchBugs(1, false);
    }
    setCurrentPage(1);
  }, [selectedTester, selectedStatus, selectedStage, startDate, endDate]);

  const handleAddBug = () => {
    setEditingBug(null);
    setShowModal(true);
  };

  const handleEditBug = (bug) => {
    setEditingBug(bug);
    setShowModal(true);
  };

  const handleCommentBug = (bug) => {
    setEditingBug({ ...bug, isCommentMode: true });
    setShowModal(true);
  };

  const handleMeetingBug = (bug) => {
    setEditingBug({ ...bug, isMeetingMode: true });
    setShowModal(true);
  };

  const handleCopyBug = async (bug) => {
    setConfirmModalConfig({
      title: 'Copy Bug',
      message: `Are you sure you want to copy the bug: "${bug.title}"?\n\nThis will create a duplicate with updated tester and date.`,
      type: 'warning',
      confirmText: 'Copy Bug',
      onConfirm: () => performCopyBug(bug)
    });
    setShowConfirmModal(true);
  };

  const performCopyBug = async (bug) => {
    setShowConfirmModal(false);
    
    try {
      const token = localStorage.getItem('token');
      
      // Get current user
      const userResponse = await axios.get('/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const currentUser = userResponse.data.username;
      
      // Get current date in the same format as the original bug
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
      
      // Create a copy of the bug with updated tester and date
      const bugCopy = {
        ...bug,
        tester: currentUser,
        date: today,
        // Remove the _id and timestamps to create a new record
        _id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        __v: undefined
      };
      
      // Create the new bug
      const response = await axios.post('/api/bugs', bugCopy, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Log the copy operation with bug data
      await axios.post('/api/logs', {
        operation: 'COPY',
        target: response.data.id,
        targetTitle: bug.title,
        details: `Copied bug: ${bug.tcid} - ${bug.title}`,
        bugData: {
          pims: bug.pims,
          tester: currentUser, // Use the current user as tester for the copy
          date: today,
          tcid: bug.tcid
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh the bug list to show the new bug at the top
      // Clear any active filters to ensure the new bug is visible
      if (hasActiveFilters()) {
        clearFilters();
      } else {
        fetchBugs(1);
        setCurrentPage(1);
      }
      fetchOperationLogs(); // Refresh logs after copy
    } catch (error) {
      console.error('Copy bug error:', error);
      setError('Failed to copy bug');
    }
  };

  const handleDeleteBug = async (bug) => {
    setConfirmModalConfig({
      title: 'Delete Bug',
      message: `Are you sure you want to DELETE the bug: "${bug.title}"?\n\nThis action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete Bug',
      onConfirm: () => performDeleteBug(bug)
    });
    setShowConfirmModal(true);
  };

  const performDeleteBug = async (bug) => {
    setShowConfirmModal(false);
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/bugs/${bug._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBugs();
      fetchOperationLogs(); // Refresh logs after delete
    } catch (error) {
      setError('Failed to delete bug');
    }
  };

  const handleBugSaved = () => {
    setShowModal(false);
    setEditingBug(null);
    fetchBugs(currentPage);
    fetchOperationLogs(); // Refresh logs after any bug operation
  };

  const handlePageChange = (page) => {
    if (hasActiveFilters()) {
      setFilteredPage(page);
    } else {
      setCurrentPage(page);
    }
    setExpandedBugId(null); // Clear expanded state when changing pages
  };

  const handlePrevPage = () => {
    const paginationInfo = getFilteredPaginationInfo();
    if (paginationInfo.hasPrevPage) {
      handlePageChange(paginationInfo.currentPage - 1);
    }
  };

  const handleNextPage = () => {
    const paginationInfo = getFilteredPaginationInfo();
    if (paginationInfo.hasNextPage) {
      handlePageChange(paginationInfo.currentPage + 1);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return searchQuery || selectedTester || selectedStatus || selectedPims || selectedStage || startDate || endDate;
  };
  
  // Get bugs for current page when filters are active
  const getDisplayedBugs = () => {
    if (!hasActiveFilters()) {
      return filteredBugs; // Show server-side paginated results
    }
    
    // Client-side pagination for filtered results
    const startIndex = (filteredPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredBugs.slice(startIndex, endIndex);
  };
  
  // Get pagination info for filtered results
  const getFilteredPaginationInfo = () => {
    if (!hasActiveFilters()) {
      return {
        totalPages: pagination.totalPages || 1,
        currentPage: pagination.currentPage || 1,
        totalItems: pagination.totalBugs || bugs.length,
        hasNextPage: pagination.hasNextPage,
        hasPrevPage: pagination.hasPrevPage
      };
    }
    
    const totalPages = Math.ceil(filteredBugs.length / itemsPerPage);
    return {
      totalPages: totalPages,
      currentPage: filteredPage,
      totalItems: filteredBugs.length,
      hasNextPage: filteredPage < totalPages,
      hasPrevPage: filteredPage > 1
    };
  };

  const getPageNumbers = () => {
    const pages = [];
    const paginationInfo = getFilteredPaginationInfo();
    const totalPages = paginationInfo.totalPages;
    const currentPageNum = paginationInfo.currentPage;
    
    // Show 5 pages at a time
    let startPage = Math.max(1, currentPageNum - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Adjust start if we're near the end
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const handleGoogleSheetImport = async () => {
    if (isImporting) return;
    
    setIsImporting(true);
    setImportStatus('Connecting to Google Sheets...');
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/import-google-sheet', {
        sheetId: '1Cw-RYG4e060Y8P7jkglqWvq04SRRtufD9WOCcKo-sB4',
        sheetName: 'CurrentVersion'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const result = response.data;
      const statusMsg = `Import completed! ${result.imported} new bugs imported, ${result.updated || 0} bugs updated, ${result.errors} errors`;
      setImportStatus(statusMsg);
      
      // Refresh the bug list
      setTimeout(() => {
        fetchBugs(1);
        setCurrentPage(1);
        setImportStatus('');
      }, 2000);
      
    } catch (error) {
      console.error('Import error:', error);
      const errorData = error.response?.data;
      let errorMsg = errorData?.message || 'Import failed';
      
      // Add detailed instructions for permission errors
      if (errorData?.details) {
        errorMsg = `${errorMsg}\n\n${errorData.details}`;
      }
      
      if (errorData?.sheetUrl) {
        errorMsg += `\n\nSheet URL: ${errorData.sheetUrl}`;
      }
      
      setImportStatus(`❌ ${errorMsg}`);
      
      // Show error longer for permission issues
      const timeout = errorData?.details ? 15000 : 5000;
      setTimeout(() => {
        setImportStatus('');
      }, timeout);
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'close': return 'status-close';
      case 'ready for pims': return 'status-ready';
      case 'pass': return 'status-pass';
      case 'fail': return 'status-fail';
      default: return 'status-default';
    }
  };

  const formatSystemInfo = (info) => {
    if (!info) return '';
    return info
      .replace(/\n/g, '<br>')
      .replace(/^([^:\n]+):/gm, '<span class="system-label">$1</span>:')
      .replace(/<br>([^:\n<]+):/g, '<br><span class="system-label">$1</span>:');
  };

  const formatDescription = (desc) => {
    if (!desc) return '';
    return desc
      .replace(/(\d+\.)\s*\n\s*/g, '$1 ') // Fix numbered items followed by newlines and spaces
      .replace(/(\d+\.)\s*(?=\d+\.)/g, '$1<br>') // Add line breaks between numbered items
      .replace(/(Testcase:)/gi, '<span class="description-title">$1</span><br>') // Make Testcase: bold with line break
      .replace(/(Result:)/gi, '<br><span class="description-title">$1</span><br>') // Make Result: bold with line breaks
      .replace(/(Expectation:)/gi, '<br><span class="description-title">$1</span><br>') // Make Expectation: bold with line breaks
      .replace(/\n\s*\n/g, '<br><br>') // Convert double newlines to double breaks
      .replace(/\n/g, '<br>') // Convert single newlines to breaks
      .replace(/<br>\s*<br>\s*<br>/g, '<br><br>'); // Clean up excessive line breaks
  };

  const toggleBugExpansion = (bugId) => {
    setExpandedBugId(prev => {
      // If clicking the same bug that's already expanded, collapse it
      if (prev === bugId) {
        return null;
      }
      // Otherwise, expand this bug (and automatically close any other expanded bug)
      return bugId;
    });
  };

  const isBugExpanded = (bugId) => {
    return expandedBugId === bugId;
  };

  // Get unique values for dropdowns from backend filter options
  const getUniqueTesters = () => filterOptions.testers;
  const getUniqueStatuses = () => filterOptions.statuses;
  const getUniqueStages = () => filterOptions.stages;

  const clearFilters = () => {
    // Clear timeout if active
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    
    setSearchQuery('');
    setSelectedTester('');
    setSelectedStatus('');
    setSelectedPims('');
    setSelectedStage('');
    setStartDate('');
    setEndDate('');
    setFilteredPage(1);
    setCurrentPage(1);
    
    // Explicitly fetch all bugs without filters (reset to default state)
    fetchBugs(1, false);
  };

  const getFileButtonsFromLink = (bug) => {
    if (!bug.link || bug.link.trim() === '') return [];
    
    const filePaths = bug.link.split('\n').filter(line => line.trim());
    const buttons = [];
    
    filePaths.forEach((path) => {
      const cleanPath = path.replace(/^"|"$/g, '').trim();
      if (cleanPath) {
        const extension = cleanPath.split('.').pop().toLowerCase();
        buttons.push({
          extension: extension,
          path: cleanPath,
          isViewable: ['mp4', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)
        });
      }
    });
    
    return buttons;
  };

  const handleFileClick = async (filePath, buttonElement) => {
    try {
      await navigator.clipboard.writeText(filePath);
      showCopiedMessage(buttonElement);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = filePath;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showCopiedMessage(buttonElement);
    }
  };

  const handleOpenLogsPage = () => {
    setShowLogsPage(true);
  };

  const handleCloseLogsPage = () => {
    setShowLogsPage(false);
  };

  const formatLogEntry = (log) => {
    // Format: CRUD Action..PIMS(if exist) Tester Date
    const action = log.operation;
    let pims = log.bugData?.pims ? log.bugData.pims : '';
    
    // Handle cases where PIMS might already have "PIMS-" prefix
    if (pims && !pims.startsWith('PIMS-')) {
      pims = `PIMS-${pims}`;
    }
    
    const tester = log.bugData?.tester || log.user;
    const date = new Date(log.timestamp).toLocaleString();
    
    // Create the first line
    const firstLine = `${action}${pims ? `_${pims}` : ''}_${tester}_${date}`;
    
    // Second line: Title (remove prefix [...])
    let title = log.targetTitle || log.target;
    // Remove any prefix in brackets like [TCID-123] or [Bug-456]
    title = title.replace(/^\[[^\]]*\]\s*/, '');
    
    return {
      firstLine,
      title
    };
  };

  const showCopiedMessage = (buttonElement) => {
    const originalText = buttonElement.textContent;
    buttonElement.textContent = 'Copied!';
    buttonElement.style.background = 'linear-gradient(135deg, #10b981 0%, #047857 100%)';
    buttonElement.style.color = 'white';
    
    setTimeout(() => {
      buttonElement.textContent = originalText;
      buttonElement.style.background = '';
      buttonElement.style.color = '';
    }, 1500);
  };

  if (loading) return <div className="loading">Loading bugs...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="bug-list-container">
      <div className="bug-list-header">
        <div className="title-group">
          <h2>DDM/DDPM: {pagination.totalBugs || bugs.length} bugs total{hasActiveFilters() ? ` (${filteredBugs.length} shown)` : ''}</h2>
          <button onClick={handleAddBug} className="add-btn">
            Add New Bug
          </button>
        </div>
        <div className="header-buttons">
          <button 
            onClick={handleGoogleSheetImport} 
            className="import-btn"
            disabled={isImporting}
          >
            {isImporting ? 'Importing...' : 'Import from Google Sheets'}
          </button>
        </div>
      </div>
      
      {importStatus && (
        <div className={`import-status ${importStatus.includes('Error') ? 'error' : 'success'}`}>
          {importStatus}
        </div>
      )}

      <div className="bug-list-content">
        {/* Main Content */}
        <div className="bug-main-content">
          <div className="blog-container">
            {getDisplayedBugs().length === 0 ? (
              <div className="no-data">
                {bugs.length === 0 ? 
                  "No bug records found. Click \"Add New Bug\" to create one." :
                  "No bugs match your search criteria. Try adjusting your filters."
                }
              </div>
            ) : (
              getDisplayedBugs().map((bug) => (
                  <article key={bug._id} className="bug-card">
                    <div className="bug-header">
                      <div className="bug-meta">
                        <span className="bug-tester">{bug.tester}</span>
                        <span className="bug-pims">{bug.pims}</span>
                        <span className={`bug-status ${getStatusClass(bug.status)}`}>
                          {bug.status}
                        </span>
                        <span className="bug-stage">[{bug.stage}]</span>
                        <span className="bug-date">{bug.date}</span>
                      </div>
                      <div className="bug-actions">
                        <button
                          onClick={() => handleEditBug(bug)}
                          className="edit-btn"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleCommentBug(bug)}
                          className="comment-btn"
                        >
                          Comment
                        </button>
                        <button
                          onClick={() => handleMeetingBug(bug)}
                          className="meeting-btn"
                        >
                          Meeting
                        </button>
                        <button
                          onClick={() => handleCopyBug(bug)}
                          className="copy-btn"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => handleDeleteBug(bug)}
                          className="delete-btn"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    
                    <div className="bug-title-section">
                      <h3 className="bug-title">{bug.title}</h3>
                {bug.chinese && (
                  <div className="bug-chinese">{bug.chinese}</div>
                )}
              </div>

              <div className="bug-bottom-bar">
                <button
                  onClick={() => toggleBugExpansion(bug._id)}
                  className="collapse-btn"
                  aria-label={isBugExpanded(bug._id) ? "Collapse details" : "Expand details"}
                >
                  <span className={`css-arrow animate__animated ${isBugExpanded(bug._id) ? 'expanded' : ''}`}>
                  </span>
                </button>
              </div>

              <div className={`collapsible-content ${isBugExpanded(bug._id) ? 'expanded' : 'collapsed'}`}>
                <div className="bug-details-combined">
                  <div className="details-grid">
                    <div className="bug-detail-item">
                      <span className="label">TCID:</span>
                      <span className="value">{bug.tcid || 'N/A'}</span>
                    </div>
                    <div className="bug-detail-item">
                      <span className="label">Test Case:</span>
                      <span className="value">{bug.test_case_name}</span>
                    </div>
                    <div className="bug-detail-item">
                      <span className="label">Product/Customer/Likelihood:</span>
                      <span className="value">{bug.product_customer_likelihood}</span>
                    </div>
                  </div>
                  
                  {bug.system_information && (
                    <div className="system-info-section">
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: formatSystemInfo(bug.system_information) 
                        }} 
                      />
                    </div>
                  )}
                </div>

                {bug.description && (
                  <div className="bug-description">
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: formatDescription(bug.description) 
                      }} 
                    />
                  </div>
                )}

                <div className="bug-tags">
                  {getFileButtonsFromLink(bug).map((fileButton, index) => (
                    <button 
                      key={index}
                      className="tag" 
                      onClick={(e) => handleFileClick(fileButton.path, e.target)}
                      title={fileButton.path}
                    >
                      {fileButton.extension}
                    </button>
                  ))}
                </div>

                {bug.notes && (
                  <div className="bug-comments">
                    <div className="comments-label">Comments:</div>
                    <div className="comments-content">{bug.notes}</div>
                  </div>
                )}

                {bug.meetings && (
                  <div className="bug-meetings">
                    <div className="meetings-label">Meeting Notes:</div>
                    <div className="meetings-content">{bug.meetings}</div>
                  </div>
                )}
              </div>
                  </article>
              ))
            )}
          </div>
          
          {/* Pagination Controls */}
          {(() => {
            const paginationInfo = getFilteredPaginationInfo();
            return paginationInfo.totalPages > 1 && (
              <div className="pagination-container">
                <div className="pagination-single-line">
                  <span className="pagination-info-inline">
                    {hasActiveFilters() ? 
                      `Showing ${((paginationInfo.currentPage - 1) * itemsPerPage) + 1}-${Math.min(paginationInfo.currentPage * itemsPerPage, paginationInfo.totalItems)} of ${paginationInfo.totalItems} filtered results` :
                      `Showing ${((paginationInfo.currentPage - 1) * itemsPerPage) + 1}-${Math.min(paginationInfo.currentPage * itemsPerPage, paginationInfo.totalItems)} of ${paginationInfo.totalItems}`
                    }
                  </span>
                  
                  <span 
                    onClick={handlePrevPage} 
                    className={`pagination-nav ${!paginationInfo.hasPrevPage ? 'disabled' : ''}`}
                  >
                    ←
                  </span>
                  
                  {getPageNumbers().map(pageNum => (
                    <span
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`pagination-page ${pageNum === paginationInfo.currentPage ? 'active' : ''}`}
                    >
                      {pageNum}
                    </span>
                  ))}
                  
                  <span 
                    onClick={handleNextPage} 
                    className={`pagination-nav ${!paginationInfo.hasNextPage ? 'disabled' : ''}`}
                  >
                    →
                  </span>
                  
                  <span className="pagination-total-inline">
                    Page {paginationInfo.currentPage} of {paginationInfo.totalPages}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Right Column - Search & Logs */}
        <div className="right-column">
          {/* Search & Filter Section */}
          <div className="bug-sidebar">
            <div className="sidebar-header">
              <h3>🔍 Search & Filter</h3>
              {loading && <div className="search-indicator">⚡ Searching...</div>}
            </div>
            
            <div className="filter-section">
              <div className="filter-group">
                <div className="search-input-group">
                  <input
                    type="text"
                    placeholder="Search bugs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                    className="search-input"
                    title="Search in title, Chinese text, description, notes, and system information"
                  />
                  <button 
                    onClick={performSearch}
                    className="search-button"
                    disabled={loading}
                    title="Click to search"
                  >
                    🔍
                  </button>
                </div>
              </div>

              <div className="filter-group">
                <label>Tester</label>
                <select value={selectedTester} onChange={(e) => setSelectedTester(e.target.value)}>
                  <option value="">All Testers</option>
                  {getUniqueTesters().map(tester => (
                    <option key={tester} value={tester}>{tester}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Status</label>
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                  <option value="">All Status</option>
                  {getUniqueStatuses().map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>PIMS</label>
                <div className="search-input-group">
                  <input
                    type="text"
                    placeholder="Enter PIMS number..."
                    value={selectedPims}
                    onChange={(e) => setSelectedPims(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                    className="filter-input"
                    title="Enter PIMS number and click search or press Enter"
                  />
                  <button 
                    onClick={performSearch}
                    className="search-button"
                    disabled={loading}
                    title="Click to search"
                  >
                    🔍
                  </button>
                </div>
              </div>

              <div className="filter-group">
                <label>Stage</label>
                <select value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}>
                  <option value="">All Stages</option>
                  {getUniqueStages().map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Date Range</label>
                <div className="date-range-inline">
                  <div className="date-input-container">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="date-input-inline"
                    />
                    <span className={`date-placeholder-text ${startDate ? 'hidden' : ''}`}>Start</span>
                    <span className="date-icon">📅</span>
                  </div>
                  <div className="date-input-container">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="date-input-inline"
                    />
                    <span className={`date-placeholder-text ${endDate ? 'hidden' : ''}`}>End</span>
                    <span className="date-icon">📅</span>
                  </div>
                </div>
              </div>


              <div className="filter-actions">
                <button onClick={clearFilters} className="clear-btn">Clear All Filters</button>
              </div>
            </div>
          </div>

          {/* Operation Logs Section */}
          <div className="operation-logs-independent">
            <div className="logs-header">
              <button 
                onClick={handleOpenLogsPage} 
                className="view-logs-btn"
                title="View all logs with filters"
              >
                📋 View All Logs
              </button>
            </div>
            
            <div className="logs-container">
              {operationLogs.length === 0 ? (
                <div className="no-logs">No operation logs available</div>
              ) : (
                <div className="logs-list">
                  {operationLogs.map((log, index) => {
                    const action = log.operation;
                    let pims = log.bugData?.pims ? log.bugData.pims : '';
                    
                    // Handle cases where PIMS might already have "PIMS-" prefix
                    if (pims && !pims.startsWith('PIMS-')) {
                      pims = `PIMS-${pims}`;
                    }
                    
                    // If no PIMS, show "Ready For PIMS"
                    const pimsDisplay = pims || 'Ready For PIMS';
                    
                    const tester = log.bugData?.tester || log.user;
                    const date = new Date(log.timestamp).toLocaleString('en-US', {
                      year: 'numeric',
                      month: 'numeric', 
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    });
                    
                    return (
                      <div key={log._id || index} className="log-item">
                        <div className="log-single-line">
                          <span className={`log-operation ${log.operation.toLowerCase()}`}>
                            {action}
                          </span>
                          <span className="log-pims">
                            {pimsDisplay}_
                          </span>
                          <span className="log-tester">{tester}</span>
                          <span className="log-date">{date}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <BugModal
          bug={editingBug}
          onSave={handleBugSaved}
          onClose={() => setShowModal(false)}
        />
      )}

      {showLogsPage && (
        <LogsPage
          onClose={handleCloseLogsPage}
        />
      )}

      {showConfirmModal && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          type={confirmModalConfig.type}
          confirmText={confirmModalConfig.confirmText}
          onConfirm={confirmModalConfig.onConfirm}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </div>
  );
};

export default BugList;