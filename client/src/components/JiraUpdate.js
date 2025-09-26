import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import BugModal from './BugModal';
import LogsPage from './LogsPage';
import ConfirmationModal from './ConfirmationModal';
import {
  TextField,
  Select,
  MenuItem,
  FormControl,
  Button,
  Box,
  Typography,
  InputLabel,
  Card,
  CardContent,
  Chip,
  IconButton,
  Collapse,
  Divider,
  Grid,
  Stack,
  Paper,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  FilterList as FilterListIcon,
  Edit as EditIcon,
  Comment as CommentIcon,
  EventNote as MeetingIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AttachFile as AttachFileIcon,
  BugReport as BugReportIcon,
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Error as ErrorIcon,
  CheckCircleOutline as CheckCircleOutlineIcon
} from '@mui/icons-material';
import './BugList.css';

const JiraUpdate = () => {
  const [bugs, setBugs] = useState([]);
  const [filteredBugs, setFilteredBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debug logging for navigation issue
  useEffect(() => {
    console.log('🟢 JiraUpdate MOUNTED at:', new Date().toLocaleTimeString());
    return () => {
      console.log('🟢 JiraUpdate UNMOUNTED at:', new Date().toLocaleTimeString());
    };
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [editingBug, setEditingBug] = useState(null);
  const [expandedBugId, setExpandedBugId] = useState(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [filteredPage, setFilteredPage] = useState(1);
  const itemsPerPage = 15;

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTester, setSelectedTester] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedPims, setSelectedPims] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Flag to distinguish between status bar clicks and filter form changes
  const [isStatusBarFilter, setIsStatusBarFilter] = useState(false);

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

  // Current user state
  const [currentUser, setCurrentUser] = useState('');

  // Debounce timeout reference
  const debounceTimeout = React.useRef(null);

  // Memoized status counts for better performance - based on all bugs
  const statusCounts = useMemo(() => {
    if (!bugs.length) return { readyForTest: 0, fail: 0, pass: 0, total: 0 };

    return {
      readyForTest: bugs.filter(bug => bug.status === 'Ready for Test').length,
      fail: bugs.filter(bug => bug.status === 'Fail').length,
      pass: bugs.filter(bug => bug.status === 'Pass').length,
      total: bugs.length
    };
  }, [bugs]);

  useEffect(() => {
    fetchBugs(currentPage);
  }, [currentPage]);

  // Fetch filter options and logs on component mount
  useEffect(() => {
    fetchFilterOptions();
    fetchOperationLogs();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentUser(response.data.username);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

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

      // Always fetch all data when we need to deduplicate to ensure consistent pagination
      const params = {
        all: 'true', // Always fetch all to handle deduplication properly
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

      // Set pagination based on deduplicated data
      const deduplicatedBugs = removeDuplicatesByPims(response.data.bugs);
      const totalPages = Math.ceil(deduplicatedBugs.length / itemsPerPage);
      setPagination({
        totalBugs: deduplicatedBugs.length,
        totalPages: totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      });

    } catch (error) {
      setError('Failed to fetch bugs');
    } finally {
      // Add minimum loading delay to ensure loading state is visible when switching pages
      setTimeout(() => {
        setLoading(false);
      }, 500); // 500ms minimum loading time
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

    // Skip API calls if this is a status bar filter - we'll handle it locally
    if (isStatusBarFilter) {
      setIsStatusBarFilter(false); // Reset the flag
      return;
    }

    const hasFilters = searchQuery || selectedTester || selectedStatus || selectedPims || selectedStage || startDate || endDate;

    if (hasFilters) {
      fetchBugs(1, true);
    } else {
      fetchBugs(1, false);
    }
    setCurrentPage(1);
  }, [selectedTester, selectedStatus, selectedStage, startDate, endDate]);

  const handleEditBug = (bug) => {
    setEditingBug(bug);
    setShowModal(true);
  };

  const handleCommentBug = (bug) => {
    setEditingBug({ ...bug, isCommentMode: true });
    setShowModal(true);
  };

  const handleBugSaved = (updatedBug, isCommentOrMeeting = false, shouldCloseModal = true) => {
    if (shouldCloseModal) {
      setShowModal(false);
      setEditingBug(null);
    }

    // For comments/meetings, just update local state without any fetching
    if (isCommentOrMeeting && updatedBug) {
      setBugs(prevBugs =>
        prevBugs.map(bug => bug._id === updatedBug._id ? updatedBug : bug)
      );
      setFilteredBugs(prevBugs =>
        prevBugs.map(bug => bug._id === updatedBug._id ? updatedBug : bug)
      );

      // Update the editing bug state so modal shows the updated data
      if (!shouldCloseModal) {
        setEditingBug(updatedBug);
      }

      // Don't fetch operation logs for comments/meetings to avoid any loading
      return;
    }

    // For regular edits/creates, update local state if possible
    if (updatedBug) {
      setBugs(prevBugs => {
        const existingBugIndex = prevBugs.findIndex(bug => bug._id === updatedBug._id);
        if (existingBugIndex !== -1) {
          // Update existing bug
          return prevBugs.map(bug => bug._id === updatedBug._id ? updatedBug : bug);
        } else {
          // Add new bug to the beginning of the list
          return [updatedBug, ...prevBugs];
        }
      });
      setFilteredBugs(prevBugs => {
        const existingBugIndex = prevBugs.findIndex(bug => bug._id === updatedBug._id);
        if (existingBugIndex !== -1) {
          // Update existing bug
          return prevBugs.map(bug => bug._id === updatedBug._id ? updatedBug : bug);
        } else {
          // Add new bug to the beginning of the list
          return [updatedBug, ...prevBugs];
        }
      });
      fetchOperationLogs(); // Only refresh logs for non-comment operations
    } else {
      // Fallback to full refresh only if no updated bug provided
      fetchBugs(currentPage);
      fetchOperationLogs();
    }
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

  // Remove duplicates based on PIMS number
  const removeDuplicatesByPims = (bugs) => {
    const seen = new Set();
    return bugs.filter(bug => {
      // Create unique key based on PIMS number (case-insensitive)
      const pimsKey = bug.pims ? bug.pims.toLowerCase().trim() : `no-pims-${bug._id}`;

      if (seen.has(pimsKey)) {
        return false; // Skip duplicate
      }
      seen.add(pimsKey);
      return true;
    });
  };

  // Get bugs for current page when filters are active
  const getDisplayedBugs = () => {
    let bugsToDisplay = filteredBugs;

    // Remove duplicates based on PIMS numbers
    bugsToDisplay = removeDuplicatesByPims(bugsToDisplay);

    // Always use client-side pagination since we fetch all data and deduplicate
    const currentPageToUse = hasActiveFilters() ? filteredPage : currentPage;
    const startIndex = (currentPageToUse - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return bugsToDisplay.slice(startIndex, endIndex);
  };

  // Get pagination info for filtered results
  const getFilteredPaginationInfo = () => {
    const deduplicatedBugs = removeDuplicatesByPims(filteredBugs);
    const totalPages = Math.ceil(deduplicatedBugs.length / itemsPerPage);
    const currentPageToUse = hasActiveFilters() ? filteredPage : currentPage;

    return {
      totalPages: totalPages,
      currentPage: currentPageToUse,
      totalItems: deduplicatedBugs.length,
      hasNextPage: currentPageToUse < totalPages,
      hasPrevPage: currentPageToUse > 1
    };
  };

  const getPageNumbers = () => {
    const pages = [];
    const paginationInfo = getFilteredPaginationInfo();
    const totalPages = paginationInfo.totalPages;
    const currentPageNum = paginationInfo.currentPage;

    // Always show page 1
    pages.push(1);

    if (totalPages <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 2; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Complex logic for many pages
      if (currentPageNum <= 4) {
        // Show pages 1, 2, 3, 4, 5, ..., last
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        if (totalPages > 6) {
          pages.push('...');
        }
        if (totalPages > 5) {
          pages.push(totalPages);
        }
      } else if (currentPageNum >= totalPages - 3) {
        // Show pages 1, ..., last-4, last-3, last-2, last-1, last
        if (totalPages > 6) {
          pages.push('...');
        }
        for (let i = Math.max(2, totalPages - 4); i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show pages 1, ..., current-1, current, current+1, ..., last
        pages.push('...');
        for (let i = currentPageNum - 1; i <= currentPageNum + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
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

  // Get status counts from state or calculate on-demand as fallback - based on all bugs
  const getStatusCounts = () => {
    // If we have state-based counts and they're not all zero (or if they should be zero), use them
    if (statusCounts.total > 0 || (!loading && bugs.length === 0)) {
      return statusCounts;
    }

    // Fallback: calculate immediately if we have data available
    if (!loading && bugs.length > 0) {
      return {
        readyForTest: bugs.filter(bug => bug.status === 'Ready for Test').length,
        fail: bugs.filter(bug => bug.status === 'Fail').length,
        pass: bugs.filter(bug => bug.status === 'Pass').length,
        total: bugs.length
      };
    }

    // Loading or no data: return zeros
    return { readyForTest: 0, fail: 0, pass: 0, total: 0 };
  };

  const clearFilters = async () => {
    // Clear timeout if active
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Clear all filter states
    setSearchQuery('');
    setSelectedTester('');
    setSelectedStatus('');
    setSelectedPims('');
    setSelectedStage('');
    setStartDate('');
    setEndDate('');
    setFilteredPage(1);
    setCurrentPage(1);

    // Reset status bar filter flag and fetch data
    setIsStatusBarFilter(false);

    // Directly fetch data and reset filtered bugs to show all
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/bugs', {
        headers: { Authorization: `Bearer ${token}` },
        params: { all: 'true' }
      });
      setBugs(response.data.bugs);
      setFilteredBugs(response.data.bugs);

      // Set pagination for all bugs
      const deduplicatedBugs = removeDuplicatesByPims(response.data.bugs);
      const totalPages = Math.ceil(deduplicatedBugs.length / itemsPerPage);
      setPagination({
        totalBugs: deduplicatedBugs.length,
        totalPages,
        currentPage: 1,
        hasNextPage: 1 < totalPages,
        hasPrevPage: false
      });
    } catch (error) {
      setError('Failed to fetch bugs');
    } finally {
      setLoading(false);
    }
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
      <div className="bug-list-content">
        {/* Main Content */}
        <div className="bug-main-content">
          <div className="blog-container">
            <Paper
              elevation={0}
              className="bug-dashboard-header"
              sx={{
                padding: '24px 28px',
                marginBottom: '24px',
                borderRadius: '16px',
                backgroundColor: 'transparent',
                border: 'none',
                boxShadow: 'none',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '3px',
                  background: 'linear-gradient(90deg, #ef4444, #f59e0b, #10b981, #3b82f6)',
                  borderRadius: '16px 16px 0 0'
                }
              }}
            >
              {/* Status Metrics Section - Attached to top border, single line */}
              <Box sx={{
                position: 'absolute',
                top: '3px',
                left: '0',
                right: '0',
                zIndex: 1,
                borderRadius: '13px 13px 0 0',
                padding: '8px 16px'
              }}>
                {(() => {
                  const statusCounts = getStatusCounts();
                  return (
                    <Box sx={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <Box
                        onClick={() => {
                          setIsStatusBarFilter(true); // Set flag to prevent API call

                          if (selectedStatus === 'Ready for Test') {
                            setSelectedStatus('');
                            setSelectedTester('');
                            // Show all bugs when clearing filter
                            setFilteredBugs(bugs);
                          } else {
                            setSelectedStatus('Ready for Test');
                            // Filter locally for status
                            const filteredResults = bugs.filter(bug =>
                              bug.status === 'Ready for Test'
                            );
                            setFilteredBugs(filteredResults);
                          }
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
                          border: '1px solid #fdba74',
                          flex: 1,
                          justifyContent: 'center',
                          minHeight: '32px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          opacity: selectedStatus === 'Ready for Test' ? 1 : selectedStatus === '' ? 1 : 0.5,
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 8px rgba(251, 146, 60, 0.25)'
                          },
                          '&:active': {
                            transform: 'translateY(0)'
                          }
                        }}>
                        <AssignmentIcon sx={{
                          fontSize: '16px',
                          color: '#ea580c',
                          verticalAlign: 'middle',
                          marginTop: '-1px'
                        }} />
                        <Typography sx={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#9a3412',
                          lineHeight: '16px',
                          verticalAlign: 'middle',
                          margin: 0,
                          padding: 0
                        }}>
                          {statusCounts.readyForTest}
                        </Typography>
                        <Typography sx={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#c2410c',
                          textTransform: 'uppercase',
                          lineHeight: '16px',
                          verticalAlign: 'middle',
                          margin: 0,
                          padding: 0,
                          marginTop: '1px'
                        }}>
                          Ready for Test
                        </Typography>
                      </Box>
                      <Box
                        onClick={() => {
                          setIsStatusBarFilter(true); // Set flag to prevent API call

                          if (selectedStatus === 'Fail') {
                            setSelectedStatus('');
                            setSelectedTester('');
                            // Show all bugs when clearing filter
                            setFilteredBugs(bugs);
                          } else {
                            setSelectedStatus('Fail');
                            // Filter locally for status
                            const filteredResults = bugs.filter(bug =>
                              bug.status === 'Fail'
                            );
                            setFilteredBugs(filteredResults);
                          }
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
                          border: '1px solid #fca5a5',
                          flex: 1,
                          justifyContent: 'center',
                          minHeight: '32px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          opacity: selectedStatus === 'Fail' ? 1 : selectedStatus === '' ? 1 : 0.5,
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 8px rgba(239, 68, 68, 0.25)'
                          },
                          '&:active': {
                            transform: 'translateY(0)'
                          }
                        }}>
                        <ErrorIcon sx={{
                          fontSize: '16px',
                          color: '#dc2626',
                          verticalAlign: 'middle',
                          marginTop: '-1px'
                        }} />
                        <Typography sx={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#991b1b',
                          lineHeight: '16px',
                          verticalAlign: 'middle',
                          margin: 0,
                          padding: 0
                        }}>
                          {statusCounts.fail}
                        </Typography>
                        <Typography sx={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#b91c1c',
                          textTransform: 'uppercase',
                          lineHeight: '16px',
                          verticalAlign: 'middle',
                          margin: 0,
                          padding: 0,
                          marginTop: '1px'
                        }}>
                          Failed
                        </Typography>
                      </Box>
                      <Box
                        onClick={() => {
                          setIsStatusBarFilter(true); // Set flag to prevent API call

                          if (selectedStatus === 'Pass') {
                            setSelectedStatus('');
                            setSelectedTester('');
                            // Show all bugs when clearing filter
                            setFilteredBugs(bugs);
                          } else {
                            setSelectedStatus('Pass');
                            // Filter locally for status
                            const filteredResults = bugs.filter(bug =>
                              bug.status === 'Pass'
                            );
                            setFilteredBugs(filteredResults);
                          }
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)',
                          border: '1px solid #86efac',
                          flex: 1,
                          justifyContent: 'center',
                          minHeight: '32px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          opacity: selectedStatus === 'Pass' ? 1 : selectedStatus === '' ? 1 : 0.5,
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 8px rgba(34, 197, 94, 0.25)'
                          },
                          '&:active': {
                            transform: 'translateY(0)'
                          }
                        }}>
                        <CheckCircleOutlineIcon sx={{
                          fontSize: '16px',
                          color: '#16a34a',
                          verticalAlign: 'middle',
                          marginTop: '-1px'
                        }} />
                        <Typography sx={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#15803d',
                          lineHeight: '16px',
                          verticalAlign: 'middle',
                          margin: 0,
                          padding: 0
                        }}>
                          {statusCounts.pass}
                        </Typography>
                        <Typography sx={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#166534',
                          textTransform: 'uppercase',
                          lineHeight: '16px',
                          verticalAlign: 'middle',
                          margin: 0,
                          padding: 0,
                          marginTop: '1px'
                        }}>
                          Passed
                        </Typography>
                      </Box>
                      <Box
                        onClick={() => {
                          setIsStatusBarFilter(true); // Set flag to prevent API call
                          setSelectedStatus('');
                          setSelectedTester('');
                          // Show all bugs when clicking Total
                          setFilteredBugs(bugs);
                        }}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #eff6ff 0%, #bfdbfe 100%)',
                          border: '1px solid #93c5fd',
                          flex: 1,
                          justifyContent: 'center',
                          minHeight: '32px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          opacity: selectedStatus === '' ? 1 : 0.5,
                          '&:hover': {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 8px rgba(59, 130, 246, 0.25)'
                          },
                          '&:active': {
                            transform: 'translateY(0)'
                          }
                        }}>
                        <BugReportIcon sx={{
                          fontSize: '16px',
                          color: '#2563eb',
                          verticalAlign: 'middle',
                          marginTop: '-1px'
                        }} />
                        <Typography sx={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: '#1d4ed8',
                          lineHeight: '16px',
                          verticalAlign: 'middle',
                          margin: 0,
                          padding: 0
                        }}>
                          {statusCounts.total}
                        </Typography>
                        <Typography sx={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#1e40af',
                          textTransform: 'uppercase',
                          lineHeight: '16px',
                          verticalAlign: 'middle',
                          margin: 0,
                          padding: 0,
                          marginTop: '1px'
                        }}>
                          Total for Jira
                        </Typography>
                      </Box>
                    </Box>
                  );
                })()}
              </Box>

            </Paper>
            {getDisplayedBugs().length === 0 ? (
              <div className="no-data">
                {bugs.length === 0 ?
                  "No bug records found." :
                  "No bugs match your search criteria. Try adjusting your filters."
                }
              </div>
            ) : (
              getDisplayedBugs().map((bug) => (
                  <Card key={bug._id} sx={{
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb',
                    marginBottom: '8px'
                  }}>
                    <CardContent sx={{ padding: '12px' }}>
                      {/* 8-Column Layout */}
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        minHeight: '40px'
                      }}>
                        {/* Column 1: Tester (Label) */}
                        <Box sx={{ width: '80px', flexShrink: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '12px',
                              fontWeight: 500,
                              color: '#111827',
                              backgroundColor: '#f9fafb',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              border: '1px solid #d1d5db',
                              textAlign: 'center',
                              minHeight: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {bug.tester}
                          </Typography>
                        </Box>

                        {/* Column 2: PIMS (Input Field) */}
                        <Box sx={{ width: '120px', flexShrink: 0 }}>
                          <TextField
                            size="small"
                            value={bug.pims}
                            variant="outlined"
                            fullWidth
                            InputProps={{
                              readOnly: true,
                            }}
                            sx={{
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: '#f0f9ff',
                                '& input': {
                                  padding: '8px 12px',
                                  fontSize: '12px',
                                  fontWeight: 500,
                                  color: '#1e40af'
                                }
                              }
                            }}
                          />
                        </Box>

                        {/* Column 3: Status (Selection) */}
                        <Box sx={{ width: '120px', flexShrink: 0 }}>
                          <FormControl size="small" fullWidth>
                            <Select
                              value={bug.status}
                              sx={{
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: bug.status?.toLowerCase() === 'close' ? '#dcfce7' :
                                               bug.status?.toLowerCase() === 'ready for pims' ? '#fef3c7' :
                                               bug.status?.toLowerCase() === 'pass' ? '#d1fae5' :
                                               bug.status?.toLowerCase() === 'fail' ? '#fee2e2' : '#f3f4f6',
                                color: bug.status?.toLowerCase() === 'close' ? '#166534' :
                                      bug.status?.toLowerCase() === 'ready for pims' ? '#92400e' :
                                      bug.status?.toLowerCase() === 'pass' ? '#166534' :
                                      bug.status?.toLowerCase() === 'fail' ? '#dc2626' : '#374151',
                                '& .MuiSelect-select': {
                                  padding: '8px 12px',
                                  fontSize: '12px',
                                  fontWeight: 600
                                }
                              }}
                            >
                              {getUniqueStatuses().map(status => (
                                <MenuItem key={status} value={status} sx={{ fontSize: '12px' }}>{status}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>

                        {/* Column 4: Title (Content Display) */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: '12px',
                              fontWeight: 500,
                              color: '#111827',
                              backgroundColor: '#f9fafb',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              border: '1px solid #d1d5db',
                              minHeight: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              wordWrap: 'break-word',
                              whiteSpace: 'normal',
                              lineHeight: 1.4
                            }}
                          >
                            {bug.title}
                          </Typography>
                        </Box>

                        {/* Column 5: TCID (Button) */}
                        <Box sx={{ width: '100px', flexShrink: 0 }}>
                          <Tooltip title={bug.tcid || 'N/A'} arrow placement="top">
                            <Button
                              variant="outlined"
                              size="small"
                              fullWidth
                              onClick={(e) => handleFileClick(bug.tcid || 'N/A', e.target)}
                              sx={{
                                borderRadius: '4px',
                                textTransform: 'none',
                                fontSize: '12px',
                                fontWeight: 500,
                                padding: '8px 12px',
                                backgroundColor: '#f9fafb',
                                borderColor: '#6b7280',
                                color: '#374151',
                                minHeight: '40px',
                                '&:hover': {
                                  backgroundColor: '#f3f4f6',
                                  borderColor: '#6b7280'
                                }
                              }}
                            >
                              TCID
                            </Button>
                          </Tooltip>
                        </Box>

                        {/* Column 6: Severity (Button) */}
                        <Box sx={{ width: '90px', flexShrink: 0 }}>
                          <Tooltip title={bug.product_customer_likelihood} arrow placement="top">
                            <Button
                              variant="outlined"
                              size="small"
                              fullWidth
                              onClick={(e) => handleFileClick(bug.product_customer_likelihood, e.target)}
                              sx={{
                                borderRadius: '4px',
                                textTransform: 'none',
                                fontSize: '12px',
                                fontWeight: 500,
                                padding: '8px 12px',
                                backgroundColor: '#fef7ff',
                                borderColor: '#a855f7',
                                color: '#7c3aed',
                                minHeight: '40px',
                                '&:hover': {
                                  backgroundColor: '#f3e8ff',
                                  borderColor: '#a855f7'
                                }
                              }}
                            >
                              Severity
                            </Button>
                          </Tooltip>
                        </Box>

                        {/* Column 7: Stage (Button) */}
                        <Box sx={{ width: '100px', flexShrink: 0 }}>
                          <Tooltip title={bug.stage} arrow placement="top">
                            <Button
                              variant="outlined"
                              size="small"
                              fullWidth
                              onClick={(e) => handleFileClick(bug.stage, e.target)}
                              sx={{
                                borderRadius: '4px',
                                textTransform: 'none',
                                fontSize: '12px',
                                fontWeight: 500,
                                padding: '8px 12px',
                                backgroundColor: '#f0f9ff',
                                borderColor: '#0369a1',
                                color: '#0369a1',
                                minHeight: '40px',
                                '&:hover': {
                                  backgroundColor: '#e0f2fe',
                                  borderColor: '#0369a1'
                                }
                              }}
                            >
                              Stage
                            </Button>
                          </Tooltip>
                        </Box>

                        {/* Column 8: Details (Buttons) */}
                        <Box sx={{ width: '140px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {bug.system_information && (
                            <Tooltip title={bug.system_information} arrow placement="top">
                              <Button
                                variant="outlined"
                                size="small"
                                fullWidth
                                onClick={(e) => handleFileClick(bug.system_information, e.target)}
                                sx={{
                                  borderRadius: '4px',
                                  textTransform: 'none',
                                  fontSize: '10px',
                                  fontWeight: 500,
                                  padding: '4px 8px',
                                  backgroundColor: '#f8fafc',
                                  borderColor: '#64748b',
                                  color: '#64748b',
                                  minHeight: '24px',
                                  '&:hover': {
                                    backgroundColor: '#f1f5f9',
                                    borderColor: '#64748b'
                                  }
                                }}
                              >
                                System Info
                              </Button>
                            </Tooltip>
                          )}
                          {bug.description && (
                            <Tooltip title={bug.description} arrow placement="top">
                              <Button
                                variant="outlined"
                                size="small"
                                fullWidth
                                onClick={(e) => handleFileClick(bug.description, e.target)}
                                sx={{
                                  borderRadius: '4px',
                                  textTransform: 'none',
                                  fontSize: '10px',
                                  fontWeight: 500,
                                  padding: '4px 8px',
                                  backgroundColor: '#fff7ed',
                                  borderColor: '#ea580c',
                                  color: '#ea580c',
                                  minHeight: '24px',
                                  '&:hover': {
                                    backgroundColor: '#fef3c7',
                                    borderColor: '#ea580c'
                                  }
                                }}
                              >
                                Description
                              </Button>
                            </Tooltip>
                          )}
                          {getFileButtonsFromLink(bug).map((fileButton, index) => (
                            <Tooltip key={index} title={`Click to copy: ${fileButton.path}`} arrow placement="top">
                              <Button
                                variant="outlined"
                                size="small"
                                fullWidth
                                onClick={(e) => handleFileClick(fileButton.path, e.target)}
                                sx={{
                                  borderRadius: '4px',
                                  textTransform: 'none',
                                  fontSize: '10px',
                                  fontWeight: 500,
                                  padding: '4px 8px',
                                  backgroundColor: fileButton.isViewable ? '#dcfce7' : '#dbeafe',
                                  borderColor: fileButton.isViewable ? '#10b981' : '#3b82f6',
                                  color: fileButton.isViewable ? '#065f46' : '#1e40af',
                                  minHeight: '24px',
                                  '&:hover': {
                                    backgroundColor: fileButton.isViewable ? '#10b981' : '#3b82f6',
                                    color: 'white',
                                    borderColor: fileButton.isViewable ? '#10b981' : '#3b82f6'
                                  }
                                }}
                              >
                                {fileButton.extension.toUpperCase()}
                              </Button>
                            </Tooltip>
                          ))}
                        </Box>

                        {/* Actions - Moved to the far right */}
                        <Box sx={{ width: '72px', flexShrink: 0, display: 'flex', gap: '4px', justifyContent: 'flex-end', marginLeft: 'auto' }}>
                          <Tooltip title="Edit" arrow placement="top">
                            <IconButton
                              onClick={() => handleEditBug(bug)}
                              size="small"
                              sx={{
                                padding: '4px',
                                color: '#7c9cbf',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                width: '32px',
                                height: '32px',
                                '&:hover': {
                                  border: '1px solid #7c9cbf',
                                  color: '#5a7ca3'
                                }
                              }}
                            >
                              <EditIcon sx={{ fontSize: '16px' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Comment" arrow placement="top">
                            <IconButton
                              onClick={() => handleCommentBug(bug)}
                              size="small"
                              sx={{
                                padding: '4px',
                                color: '#10b981',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                width: '32px',
                                height: '32px',
                                '&:hover': {
                                  border: '1px solid #10b981',
                                  color: '#047857'
                                }
                              }}
                            >
                              <CommentIcon sx={{ fontSize: '16px' }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
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

                  {getPageNumbers().map((pageNum, index) => (
                    pageNum === '...' ? (
                      <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                        ...
                      </span>
                    ) : (
                      <span
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`pagination-page ${pageNum === paginationInfo.currentPage ? 'active' : ''}`}
                      >
                        {pageNum}
                      </span>
                    )
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

        {/* Right Column - Filters & Logs */}
        <div className="right-column">
          {/* Filter Section */}
          <Box className="filter-section" sx={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px',
            marginTop: '98px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <Typography variant="h6" sx={{
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#374151'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FilterListIcon sx={{ color: '#6b7280' }} />
                Filter
              </Box>
              <Typography variant="body2" sx={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#6b7280'
              }}>
                {pagination.totalBugs || bugs.length} Bugs{hasActiveFilters() ? ` (${filteredBugs.length} shown)` : ''}
              </Typography>
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <TextField
                size="small"
                placeholder="Enter keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                variant="outlined"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '14px',
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: '#9ca3af',
                    fontSize: '14px',
                    fontWeight: 400,
                    opacity: 1,
                  }
                }}
              />

              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: '14px', color: '#9ca3af' }}>Tester</InputLabel>
                <Select
                  value={selectedTester}
                  onChange={(e) => setSelectedTester(e.target.value)}
                  label="Tester"
                  sx={{
                    borderRadius: '8px',
                    fontSize: '14px',
                    '& .MuiSelect-select': {
                      fontSize: '14px',
                      color: selectedTester ? '#111827' : '#9ca3af',
                    }
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>
                    Select a tester
                  </MenuItem>
                  {getUniqueTesters().map(tester => (
                    <MenuItem key={tester} value={tester} sx={{ fontSize: '14px' }}>{tester}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: '14px', color: '#9ca3af' }}>Status</InputLabel>
                <Select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  label="Status"
                  sx={{
                    borderRadius: '8px',
                    fontSize: '14px',
                    '& .MuiSelect-select': {
                      fontSize: '14px',
                      color: selectedStatus ? '#111827' : '#9ca3af',
                    }
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>
                    Select a status
                  </MenuItem>
                  {getUniqueStatuses().map(status => (
                    <MenuItem key={status} value={status} sx={{ fontSize: '14px' }}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel sx={{ fontSize: '14px', color: '#9ca3af' }}>Stage</InputLabel>
                <Select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  label="Stage"
                  sx={{
                    borderRadius: '8px',
                    fontSize: '14px',
                    '& .MuiSelect-select': {
                      fontSize: '14px',
                      color: selectedStage ? '#111827' : '#9ca3af',
                    }
                  }}
                >
                  <MenuItem value="" sx={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>
                    Select a stage
                  </MenuItem>
                  {getUniqueStages().map(stage => (
                    <MenuItem key={stage} value={stage} sx={{ fontSize: '14px' }}>{stage}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                size="small"
                placeholder="PIMS"
                value={selectedPims}
                onChange={(e) => setSelectedPims(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                variant="outlined"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '8px',
                    fontSize: '14px',
                  },
                  '& .MuiOutlinedInput-input::placeholder': {
                    color: '#9ca3af',
                    fontSize: '14px',
                    fontWeight: 400,
                    opacity: 1,
                  }
                }}
              />

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <TextField
                  label="Start Date"
                  type="date"
                  size="small"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  variant="outlined"
                  InputLabelProps={{
                    shrink: true,
                    sx: { fontSize: '14px', color: '#9ca3af' }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '14px',
                    },
                    '& .MuiOutlinedInput-input': {
                      fontSize: '14px',
                      color: '#82a5c5',
                    }
                  }}
                />
                <TextField
                  label="End Date"
                  type="date"
                  size="small"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  variant="outlined"
                  InputLabelProps={{
                    shrink: true,
                    sx: { fontSize: '14px', color: '#9ca3af' }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '8px',
                      fontSize: '14px',
                    },
                    '& .MuiOutlinedInput-input': {
                      fontSize: '14px',
                      color: '#82a5c5',
                    }
                  }}
                />
              </Box>

              <Box sx={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <Button
                  onClick={clearFilters}
                  variant="outlined"
                  size="small"
                  sx={{
                    flex: 1,
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 500,
                    padding: '8px 16px',
                    backgroundColor: '#f3f4f6 !important',
                    backgroundImage: 'none !important',
                    border: '1px solid #d1d5db',
                    color: '#374151',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'transparent !important',
                      backgroundImage: 'none !important',
                      border: '1px solid #d1d5db',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 2px 8px rgba(107, 114, 128, 0.15)'
                    }
                  }}
                >
                  Clear
                </Button>
                <Button
                  onClick={performSearch}
                  variant="contained"
                  size="small"
                  sx={{
                    flex: 1,
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 500,
                    padding: '8px 16px',
                    backgroundColor: '#82a5c5 !important',
                    backgroundImage: 'none !important',
                    color: 'white',
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(130, 165, 197, 0.2)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: 'transparent !important',
                      backgroundImage: 'none !important',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 12px rgba(130, 165, 197, 0.3)'
                    }
                  }}
                >
                  Apply
                </Button>
              </Box>
            </Box>
          </Box>

          {/* Operation Logs Section */}
          <div className="operation-logs-independent">
            <div className="logs-header">
              <button
                onClick={handleOpenLogsPage}
                className="view-logs-btn"
                title="View all logs with filters"
              >
                View All Logs
              </button>
            </div>

            <div className="logs-container">
              {operationLogs.length === 0 ? (
                <div className="no-logs">No operation logs available</div>
              ) : (
                <div className="logs-list">
                  {operationLogs.slice(0, 50).map((log, index) => {
                    const action = log.operation;
                    let pims = log.bugData?.pims ? log.bugData.pims : '';

                    // Handle cases where PIMS might already have "PIMS-" prefix
                    if (pims && !pims.startsWith('PIMS-')) {
                      pims = `PIMS-${pims}`;
                    }

                    // If no PIMS, show "Ready For PIMS"
                    const pimsDisplay = pims || 'Ready For PIMS';

                    const tester = log.user;
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

export default JiraUpdate;