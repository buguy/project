import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BugModal from './BugModal';
import './BugList.css';

const BugList = () => {
  const [bugs, setBugs] = useState([]);
  const [filteredBugs, setFilteredBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBug, setEditingBug] = useState(null);
  const [expandedBugs, setExpandedBugs] = useState(new Set());
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  
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

  useEffect(() => {
    fetchBugs(currentPage);
  }, [currentPage]);

  const fetchBugs = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/bugs', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit: 15 }
      });
      setBugs(response.data.bugs);
      setFilteredBugs(response.data.bugs);
      setPagination(response.data.pagination);
      
      // Debug: Log the first 3 bugs to verify order
      console.log('📅 First 3 bugs from API (should be latest dates first):');
      response.data.bugs.slice(0, 3).forEach((bug, index) => {
        console.log(`${index + 1}. ${bug.date} - ${bug.title?.substring(0, 40) || 'No Title'}...`);
      });
    } catch (error) {
      setError('Failed to fetch bugs');
    } finally {
      setLoading(false);
    }
  };

  // Filter logic
  useEffect(() => {
    let filtered = bugs.filter(bug => {
      const matchesSearch = !searchQuery || 
        bug.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bug.chinese?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bug.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTester = !selectedTester || bug.tester === selectedTester;
      const matchesStatus = !selectedStatus || bug.status === selectedStatus;
      const matchesPims = !selectedPims || bug.pims.includes(selectedPims);
      const matchesStage = !selectedStage || bug.stage === selectedStage;
      
      const matchesDateRange = (!startDate || new Date(bug.date.replace(/\//g, '-')) >= new Date(startDate)) &&
                              (!endDate || new Date(bug.date.replace(/\//g, '-')) <= new Date(endDate));
      
      return matchesSearch && matchesTester && matchesStatus && matchesPims && matchesStage && matchesDateRange;
    });
    
    setFilteredBugs(filtered);
  }, [bugs, searchQuery, selectedTester, selectedStatus, selectedPims, selectedStage, startDate, endDate]);

  const handleAddBug = () => {
    setEditingBug(null);
    setShowModal(true);
  };

  const handleEditBug = (bug) => {
    setEditingBug(bug);
    setShowModal(true);
  };

  const handleDeleteBug = async (id) => {
    if (window.confirm('Are you sure you want to delete this bug record?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/bugs/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchBugs();
      } catch (error) {
        setError('Failed to delete bug');
      }
    }
  };

  const handleBugSaved = () => {
    setShowModal(false);
    setEditingBug(null);
    fetchBugs(currentPage);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setExpandedBugs(new Set()); // Clear expanded state when changing pages
  };

  const handlePrevPage = () => {
    if (pagination.hasPrevPage) {
      handlePageChange(pagination.prevPage);
    }
  };

  const handleNextPage = () => {
    if (pagination.hasNextPage) {
      handlePageChange(pagination.nextPage);
    }
  };

  const getPageNumbers = () => {
    const pages = [];
    const totalPages = pagination.totalPages || 1;
    const currentPageNum = pagination.currentPage || 1;
    
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
      .replace(/(\d+\.)\s*\n/g, '$1 ') // Fix numbered items followed by newlines
      .replace(/(Result:)/gi, '<span class="description-title">$1</span>') // Make Result: bold
      .replace(/(Expectation:)/gi, '<span class="description-title">$1</span>') // Make Expectation: bold
      .replace(/\n/g, '<br>');
  };

  const toggleBugExpansion = (bugId) => {
    setExpandedBugs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bugId)) {
        newSet.delete(bugId);
      } else {
        newSet.add(bugId);
      }
      return newSet;
    });
  };

  const isBugExpanded = (bugId) => {
    return expandedBugs.has(bugId);
  };

  // Get unique values for dropdowns
  const getUniqueTesters = () => [...new Set(bugs.map(bug => bug.tester))].sort();
  const getUniqueStatuses = () => [...new Set(bugs.map(bug => bug.status))].sort();
  const getUniqueStages = () => [...new Set(bugs.map(bug => bug.stage))].sort();

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTester('');
    setSelectedStatus('');
    setSelectedPims('');
    setSelectedStage('');
    setStartDate('');
    setEndDate('');
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
          <h2>DDM/DDPM: {pagination.totalBugs || bugs.length} bugs total</h2>
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
            {filteredBugs.length === 0 ? (
              <div className="no-data">
                {bugs.length === 0 ? 
                  "No bug records found. Click \"Add New Bug\" to create one." :
                  "No bugs match your search criteria. Try adjusting your filters."
                }
              </div>
            ) : (
              filteredBugs.map((bug) => (
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
                          onClick={() => handleDeleteBug(bug._id)}
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
                    </div>
                  </article>
              ))
            )}
          </div>
          
          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="pagination-container">
              <div className="pagination-single-line">
                <span className="pagination-info-inline">
                  Showing {((pagination.currentPage - 1) * 15) + 1}-{Math.min(pagination.currentPage * 15, pagination.totalBugs)} of {pagination.totalBugs}
                </span>
                
                <span 
                  onClick={handlePrevPage} 
                  className={`pagination-nav ${!pagination.hasPrevPage ? 'disabled' : ''}`}
                >
                  ←
                </span>
                
                {getPageNumbers().map(pageNum => (
                  <span
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`pagination-page ${pageNum === pagination.currentPage ? 'active' : ''}`}
                  >
                    {pageNum}
                  </span>
                ))}
                
                <span 
                  onClick={handleNextPage} 
                  className={`pagination-nav ${!pagination.hasNextPage ? 'disabled' : ''}`}
                >
                  →
                </span>
                
                <span className="pagination-total-inline">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="bug-sidebar">
          <div className="sidebar-header">
            <h3>🔍 Fast Query</h3>
          </div>
          
          <div className="filter-section">
            <div className="filter-group">
              <input
                type="text"
                placeholder="Search bugs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
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
              <input
                type="text"
                placeholder="Enter PIMS number..."
                value={selectedPims}
                onChange={(e) => setSelectedPims(e.target.value)}
                className="filter-input"
              />
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
              <button onClick={fetchBugs} className="search-btn">Search</button>
              <button onClick={clearFilters} className="clear-btn">Clear</button>
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
    </div>
  );
};

export default BugList;