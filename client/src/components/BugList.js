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

const BugList = () => {
  const [bugs, setBugs] = useState([]);
  const [filteredBugs, setFilteredBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Debug logging for navigation issue
  useEffect(() => {
    console.log('🟢 BugList MOUNTED at:', new Date().toLocaleTimeString());
    return () => {
      console.log('🟢 BugList UNMOUNTED at:', new Date().toLocaleTimeString());
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

  // Memoized status counts for better performance
  const statusCounts = useMemo(() => {
    if (!currentUser || !bugs.length) return { readyForTest: 0, fail: 0, pass: 0, total: 0 };

    const userBugs = bugs.filter(bug => bug.tester === currentUser);
    return {
      readyForTest: userBugs.filter(bug => bug.status === 'Ready for Test').length,
      fail: userBugs.filter(bug => bug.status === 'Fail').length,
      pass: userBugs.filter(bug => bug.status === 'Pass').length,
      total: userBugs.length
    };
  }, [bugs, currentUser]);

  useEffect(() => {
    // Only fetch bugs if we have a valid token
    const token = localStorage.getItem('token');
    if (token) {
      // Add a small delay on initial mount to ensure backend is ready
      const timer = setTimeout(() => {
        fetchBugs(currentPage);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentPage]);

  // Fetch filter options and logs on component mount
  useEffect(() => {
    // Only fetch if we have a valid token
    const token = localStorage.getItem('token');
    if (token) {
      fetchFilterOptions();
      fetchOperationLogs();
      fetchCurrentUser();
    }
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

  const fetchBugs = async (page = 1, fetchAll = false, retryCount = 0) => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      const token = localStorage.getItem('token');

      // Don't attempt fetch if no token
      if (!token) {
        console.warn('No authentication token found');
        setLoading(false);
        return;
      }

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
        params,
        timeout: 10000 // 10 second timeout
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
      console.error('Error fetching bugs:', error);

      // Retry logic for network errors (backend not ready yet)
      if (retryCount < 2 && (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || !error.response)) {
        console.log(`Retrying... Attempt ${retryCount + 1} of 2`);
        setTimeout(() => {
          fetchBugs(page, fetchAll, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff: 1s, 2s
        return;
      }

      // Only show error if it's not an authentication issue and we've exhausted retries
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.warn('Authentication error - token may be invalid');
      } else {
        setError('Failed to fetch bugs');
      }
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

  // Trigger immediate search ONLY for dropdown changes (Tester, Status, Stage)
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
  }, [selectedTester, selectedStatus, selectedStage]);

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
    console.log('🔵 performCopyBug called with bug:', bug);
    setShowConfirmModal(false);

    try {
      const token = localStorage.getItem('token');
      console.log('🔵 Token exists:', !!token);

      // Get current user
      const userResponse = await axios.get('/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const currentUser = userResponse.data.username;
      console.log('🔵 Current user:', currentUser);

      // Get current date in the same format as the original bug
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '/');
      console.log('🔵 Today date:', today);

      // Create a copy of the bug with updated tester and date
      // Only include defined fields to avoid validation issues
      const { _id, createdAt, updatedAt, __v, ...bugData } = bug;
      const bugCopy = {
        ...bugData,
        tester: currentUser,
        date: today
      };
      console.log('🔵 Bug copy data:', bugCopy);

      // Create the new bug
      console.log('🔵 Sending POST request to /api/bugs');
      const response = await axios.post('/api/bugs', bugCopy, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('🔵 Bug created successfully:', response.data);

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

      console.log('🔵 Adding new bug to state and refreshing list');

      // Add the newly created bug to the state immediately at the top
      const newBug = response.data.bug;
      setBugs(prevBugs => [newBug, ...prevBugs]);
      setFilteredBugs(prevBugs => [newBug, ...prevBugs]);

      // Clear any active filters to ensure the new bug is visible
      if (hasActiveFilters()) {
        console.log('🔵 Clearing filters to show new bug');
        clearFilters();
      } else {
        console.log('🔵 Going to page 1 to show new bug');
        setCurrentPage(1);
      }

      fetchOperationLogs(); // Refresh logs after copy
      console.log('🔵 Copy bug complete!');
    } catch (error) {
      console.error('Copy bug error:', error);
      console.error('Error details:', error.response?.data);
      const errorMessage = error.response?.data?.message || 'Failed to copy bug';
      setError(errorMessage);
      alert(`Failed to copy bug: ${errorMessage}`);
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

      // Remove bug from local state without refetching from database
      setBugs(prevBugs => prevBugs.filter(b => b._id !== bug._id));
      setFilteredBugs(prevBugs => prevBugs.filter(b => b._id !== bug._id));

      // Update pagination counts
      const newBugs = bugs.filter(b => b._id !== bug._id);
      const deduplicatedBugs = removeDuplicatesByPims(newBugs);
      const totalPages = Math.ceil(deduplicatedBugs.length / itemsPerPage);
      setPagination({
        totalBugs: deduplicatedBugs.length,
        totalPages: totalPages,
        currentPage: currentPage,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      });

      fetchOperationLogs(); // Only refresh logs after delete
    } catch (error) {
      setError('Failed to delete bug');
    }
  };

  const handleBugSaved = (updatedBug, isCommentOrMeeting = false, shouldCloseModal = true) => {
    console.log('🟣 handleBugSaved called:', { isCommentOrMeeting, shouldCloseModal, notes: updatedBug?.notes?.substring(0, 100) });

    if (shouldCloseModal) {
      setShowModal(false);
      setEditingBug(null);
    }

    // For comments/meetings, just update local state without any fetching
    if (isCommentOrMeeting && updatedBug) {
      console.log('🟣 Updating bugs state with new comment');
      setBugs(prevBugs =>
        prevBugs.map(bug => bug._id === updatedBug._id ? updatedBug : bug)
      );
      setFilteredBugs(prevBugs =>
        prevBugs.map(bug => bug._id === updatedBug._id ? updatedBug : bug)
      );

      // Update the editing bug state so modal shows the updated data
      if (!shouldCloseModal) {
        console.log('🟣 Updating editingBug state');
        setEditingBug({ ...updatedBug, isCommentMode: editingBug?.isCommentMode, isMeetingMode: editingBug?.isMeetingMode });
      }

      // Don't fetch operation logs for comments/meetings to avoid any loading
      return;
    }

    // For regular edits/creates, update local state if possible
    if (updatedBug && updatedBug._id) {
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
  
  // Remove duplicates based on _id (bug database ID) only
  // This ensures we don't deduplicate bugs with the same PIMS number
  const removeDuplicatesByPims = (bugs) => {
    const seen = new Set();
    return bugs.filter(bug => {
      // Use _id for uniqueness to allow multiple bugs with same PIMS
      const uniqueKey = bug._id;

      if (seen.has(uniqueKey)) {
        return false; // Skip duplicate (same _id)
      }
      seen.add(uniqueKey);
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

  // Get status counts from state or calculate on-demand as fallback
  const getStatusCounts = () => {
    // If we have state-based counts and they're not all zero (or if they should be zero), use them
    if (statusCounts.total > 0 || (!loading && currentUser && bugs.length === 0)) {
      return statusCounts;
    }

    // Fallback: calculate immediately if we have data available
    if (!loading && currentUser && bugs.length > 0) {
      const userBugs = bugs.filter(bug => bug.tester === currentUser);
      return {
        readyForTest: userBugs.filter(bug => bug.status === 'Ready for Test').length,
        fail: userBugs.filter(bug => bug.status === 'Fail').length,
        pass: userBugs.filter(bug => bug.status === 'Pass').length,
        total: userBugs.length
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
                            setSelectedTester(currentUser);
                            // Filter locally for current user and status
                            const filteredResults = bugs.filter(bug =>
                              bug.tester === currentUser && bug.status === 'Ready for Test'
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
                            setSelectedTester(currentUser);
                            // Filter locally for current user and status
                            const filteredResults = bugs.filter(bug =>
                              bug.tester === currentUser && bug.status === 'Fail'
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
                            setSelectedTester(currentUser);
                            // Filter locally for current user and status
                            const filteredResults = bugs.filter(bug =>
                              bug.tester === currentUser && bug.status === 'Pass'
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
                          setSelectedTester(currentUser);
                          // Show all bugs for current user when clicking Total
                          const filteredResults = bugs.filter(bug => bug.tester === currentUser);
                          setFilteredBugs(filteredResults);
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
                          Total
                        </Typography>
                      </Box>
                      <Box
                        onClick={handleAddBug}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                          border: '1px solid #2563eb',
                          flex: 1,
                          justifyContent: 'center',
                          minHeight: '32px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 8px rgba(59, 130, 246, 0.25)'
                          },
                          '&:active': {
                            transform: 'translateY(0)',
                            boxShadow: '0 2px 4px rgba(59, 130, 246, 0.15)'
                          }
                        }}
                      >
                        <AddIcon sx={{
                          fontSize: '16px',
                          color: 'white',
                          verticalAlign: 'middle',
                          marginTop: '-1px'
                        }} />
                        <Typography sx={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'white',
                          textTransform: 'uppercase',
                          lineHeight: '16px',
                          verticalAlign: 'middle',
                          margin: 0,
                          padding: 0,
                          marginTop: '1px'
                        }}>
                          Add New Bug
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
                  "No bug records found. Click \"Add New Bug\" to create one." :
                  "No bugs match your search criteria. Try adjusting your filters."
                }
              </div>
            ) : (
              getDisplayedBugs().map((bug) => (
                  <Card key={bug._id} className="bug-card-hover" sx={{
                    borderRadius: '12px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                      transform: 'translateY(-2px)',
                      backgroundColor: '#fafafa'
                    },
                    '&:hover .bug-actions': {
                      opacity: 1
                    },
                    '&:hover .expand-indicator': {
                      color: '#374151'
                    }
                  }}>
                    <CardContent
                      onClick={(e) => {
                        // Prevent expansion when clicking on action buttons
                        if (e.target.closest('.bug-actions') || e.target.closest('button')) {
                          return;
                        }
                        toggleBugExpansion(bug._id);
                      }}
                      sx={{ padding: '20px', paddingBottom: '0' }}
                    >
                      {/* Header with metadata */}
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', marginBottom: '16px', width: '100%' }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: '8px' }}>
                            <Chip
                              label={bug.tester}
                              size="small"
                              sx={{
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                fontWeight: 500,
                                fontSize: '12px'
                              }}
                            />
                            <Chip
                              label={bug.pims}
                              size="small"
                              sx={{
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                fontWeight: 500,
                                fontSize: '12px'
                              }}
                            />
                            <Chip
                              label={bug.status}
                              size="small"
                              sx={{
                                backgroundColor: bug.status?.toLowerCase() === 'close' ? '#dcfce7' :
                                               bug.status?.toLowerCase() === 'ready for pims' ? '#fef3c7' :
                                               bug.status?.toLowerCase() === 'pass' ? '#d1fae5' :
                                               bug.status?.toLowerCase() === 'fail' ? '#fee2e2' : '#f3f4f6',
                                color: bug.status?.toLowerCase() === 'close' ? '#166534' :
                                      bug.status?.toLowerCase() === 'ready for pims' ? '#92400e' :
                                      bug.status?.toLowerCase() === 'pass' ? '#166534' :
                                      bug.status?.toLowerCase() === 'fail' ? '#dc2626' : '#374151',
                                fontWeight: 600,
                                fontSize: '12px'
                              }}
                            />
                            <Chip
                              label={bug.stage}
                              size="small"
                              sx={{
                                backgroundColor: '#f0f9ff',
                                color: '#0369a1',
                                fontWeight: 500,
                                fontSize: '12px'
                              }}
                            />
                            <Chip
                              label={bug.date}
                              size="small"
                              sx={{
                                backgroundColor: '#fafafa',
                                color: '#525252',
                                fontWeight: 400,
                                fontSize: '12px'
                              }}
                            />
                          </Stack>
                        </Box>

                        <Box
                          className="bug-actions"
                          sx={{
                            opacity: 0,
                            transition: 'opacity 0.2s ease',
                            marginLeft: '12px',
                            flexShrink: 0,
                            width: 'auto',
                            display: 'flex',
                            gap: '4px'
                          }}
                        >
                          <Tooltip title="Edit" arrow placement="top">
                            <IconButton
                              onClick={() => handleEditBug(bug)}
                              size="small"
                              disableRipple
                              sx={{
                                padding: '5px',
                                color: '#7c9cbf',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                                backgroundColor: 'transparent !important',
                                background: 'none !important',
                                transition: 'all 0.2s ease',
                                minWidth: '32px',
                                width: '32px',
                                height: '32px',
                                '&:hover': {
                                  backgroundColor: 'rgba(0, 0, 0, 0) !important',
                                  background: 'none !important',
                                  border: '1px solid #7c9cbf',
                                  color: '#5a7ca3',
                                  transform: 'translateY(-1px)'
                                },
                                '&:focus': {
                                  backgroundColor: 'rgba(0, 0, 0, 0) !important',
                                  background: 'none !important'
                                },
                                '&:active': {
                                  backgroundColor: 'rgba(0, 0, 0, 0) !important',
                                  background: 'none !important'
                                },
                                '&.Mui-focusVisible': {
                                  backgroundColor: 'rgba(0, 0, 0, 0) !important',
                                  background: 'none !important'
                                }
                              }}
                            >
                              <EditIcon sx={{ fontSize: '16px' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Command" arrow placement="top">
                            <IconButton
                              onClick={() => handleCommentBug(bug)}
                              size="small"
                              disableRipple
                              sx={{
                                padding: '5px',
                                color: '#10b981',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                                backgroundColor: 'transparent !important',
                                transition: 'all 0.2s ease',
                                minWidth: '32px',
                                width: '32px',
                                height: '32px',
                                '&:hover': {
                                  backgroundColor: 'transparent !important',
                                  border: '1px solid #10b981',
                                  color: '#047857',
                                  transform: 'translateY(-1px)'
                                },
                                '&:focus': {
                                  backgroundColor: 'transparent !important'
                                },
                                '&:active': {
                                  backgroundColor: 'transparent !important'
                                }
                              }}
                            >
                              <CommentIcon sx={{ fontSize: '16px' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Add Meeting Notes" arrow placement="top">
                            <IconButton
                              onClick={() => handleMeetingBug(bug)}
                              size="small"
                              disableRipple
                              sx={{
                                padding: '5px',
                                color: '#8b5cf6',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                                backgroundColor: 'transparent !important',
                                transition: 'all 0.2s ease',
                                minWidth: '32px',
                                width: '32px',
                                height: '32px',
                                '&:hover': {
                                  backgroundColor: 'transparent !important',
                                  border: '1px solid #8b5cf6',
                                  color: '#7c3aed',
                                  transform: 'translateY(-1px)'
                                },
                                '&:focus': {
                                  backgroundColor: 'transparent !important'
                                },
                                '&:active': {
                                  backgroundColor: 'transparent !important'
                                }
                              }}
                            >
                              <MeetingIcon sx={{ fontSize: '16px' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Copy Bug" arrow placement="top">
                            <IconButton
                              onClick={() => handleCopyBug(bug)}
                              size="small"
                              disableRipple
                              sx={{
                                padding: '5px',
                                color: '#f59e0b',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                                backgroundColor: 'transparent !important',
                                transition: 'all 0.2s ease',
                                minWidth: '32px',
                                width: '32px',
                                height: '32px',
                                '&:hover': {
                                  backgroundColor: 'transparent !important',
                                  border: '1px solid #f59e0b',
                                  color: '#d97706',
                                  transform: 'translateY(-1px)'
                                },
                                '&:focus': {
                                  backgroundColor: 'transparent !important'
                                },
                                '&:active': {
                                  backgroundColor: 'transparent !important'
                                }
                              }}
                            >
                              <CopyIcon sx={{ fontSize: '16px' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Bug" arrow placement="top">
                            <IconButton
                              onClick={() => handleDeleteBug(bug)}
                              size="small"
                              disableRipple
                              sx={{
                                padding: '5px',
                                color: '#ef4444',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                                backgroundColor: 'transparent !important',
                                transition: 'all 0.2s ease',
                                minWidth: '32px',
                                width: '32px',
                                height: '32px',
                                '&:hover': {
                                  backgroundColor: 'transparent !important',
                                  border: '1px solid #ef4444',
                                  color: '#dc2626',
                                  transform: 'translateY(-1px)'
                                },
                                '&:focus': {
                                  backgroundColor: 'transparent !important'
                                },
                                '&:active': {
                                  backgroundColor: 'transparent !important'
                                }
                              }}
                            >
                              <DeleteIcon sx={{ fontSize: '16px' }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      {/* Title Section */}
                      <Box sx={{ marginBottom: '16px' }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontSize: '18px',
                            fontWeight: 600,
                            color: '#111827',
                            lineHeight: 1.4,
                            marginBottom: bug.chinese ? '8px' : '0'
                          }}
                        >
                          {bug.title}
                        </Typography>
                        {bug.chinese && (
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#6b7280',
                              fontSize: '14px',
                              fontStyle: 'italic'
                            }}
                          >
                            {bug.chinese}
                          </Typography>
                        )}
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                          <Box
                            className="expand-indicator"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              color: '#9ca3af',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {isBugExpanded(bug._id) ? <ExpandLessIcon sx={{ fontSize: '18px' }} /> : <ExpandMoreIcon sx={{ fontSize: '18px' }} />}
                          </Box>
                        </Box>
                      </Box>
                    </CardContent>


                    {/* Collapsible Content */}
                    <Collapse in={isBugExpanded(bug._id)} timeout={300}>
                      <Divider sx={{ margin: '0 20px', marginBottom: '16px' }} />
                      <CardContent sx={{ padding: '0 20px 20px 20px' }}>
                        {/* Combined Bug Information Section */}
                        <Paper
                          elevation={0}
                          sx={{
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '20px',
                            marginBottom: '16px'
                          }}
                        >
                          {/* Bug Details Header */}
                          <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                            <Avatar sx={{ backgroundColor: '#3b82f6', width: 32, height: 32, marginRight: '12px' }}>
                              <BugReportIcon sx={{ fontSize: '18px' }} />
                            </Avatar>
                            <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
                              Bug Details
                            </Typography>
                          </Box>

                          {/* Basic Bug Information */}
                          <Grid container spacing={3} sx={{ marginBottom: '16px' }}>
                            <Grid item xs={12} sm={4}>
                              <Box sx={{
                                backgroundColor: '#f1f5f9',
                                borderRadius: '8px',
                                padding: '12px',
                                border: '1px solid #e2e8f0'
                              }}>
                                <Typography variant="caption" sx={{
                                  color: '#64748b',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  display: 'block',
                                  marginBottom: '4px'
                                }}>
                                  TCID
                                </Typography>
                                <Typography variant="body2" sx={{
                                  color: '#1e293b',
                                  fontSize: '14px',
                                  fontWeight: 500
                                }}>
                                  {bug.tcid || 'N/A'}
                                </Typography>
                              </Box>
                            </Grid> 
                            <Grid item xs={12} sm={8}>
                              <Box sx={{
                                backgroundColor: '#f1f5f9',
                                borderRadius: '8px',
                                padding: '12px',
                                border: '1px solid #e2e8f0'
                              }}>
                                <Typography variant="caption" sx={{
                                  color: '#64748b',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  display: 'block',
                                  marginBottom: '4px'
                                }}>
                                  Test Case Name
                                </Typography>
                                <Typography variant="body2" sx={{
                                  color: '#1e293b',
                                  fontSize: '14px',
                                  fontWeight: 500
                                }}>
                                  {bug.test_case_name}
                                </Typography>
                              </Box>
                            </Grid> 
                            <Grid item xs={12}>
                              <Box sx={{
                                backgroundColor: '#f1f5f9',
                                borderRadius: '8px',
                                padding: '12px',
                                border: '1px solid #e2e8f0'
                              }}>
                                <Typography variant="caption" sx={{
                                  color: '#64748b',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px',
                                  display: 'block',
                                  marginBottom: '4px'
                                }}>
                                  Product/Customer/Likelihood
                                </Typography>
                                <Typography variant="body2" sx={{
                                  color: '#1e293b',
                                  fontSize: '14px',
                                  fontWeight: 500
                                }}>
                                  {bug.product_customer_likelihood}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>

                          {/* System Information Section */}
                          {bug.system_information && (
                            <Box sx={{ marginBottom: '16px' }}>
                              <Box
                                sx={{
                                  backgroundColor: '#f1f5f9',
                                  borderRadius: '8px',
                                  padding: '12px',
                                  border: '1px solid #e2e8f0',
                                  fontSize: '14px',
                                  lineHeight: 1.6,
                                  '& .system-label': {
                                    fontWeight: 700,
                                    color: '#475569'
                                  }
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: formatSystemInfo(bug.system_information)
                                }}
                              />
                            </Box>
                          )}

                          {/* Description Section */}
                          {bug.description && (
                            <Box sx={{ marginBottom: '16px' }}>
                              <Box
                                sx={{
                                  backgroundColor: '#f1f5f9',
                                  borderRadius: '8px',
                                  padding: '12px',
                                  border: '1px solid #e2e8f0',
                                  fontSize: '14px',
                                  lineHeight: 1.6,
                                  '& .description-title': {
                                    fontWeight: 600,
                                    color: '#d97706',
                                    fontSize: '15px'
                                  }
                                }}
                                dangerouslySetInnerHTML={{
                                  __html: formatDescription(bug.description)
                                }}
                              />
                            </Box>
                          )}
                        </Paper>

                        {/* Separate Sections */}
                        <Stack spacing={2}>

                          {/* Files Section */}
                          {getFileButtonsFromLink(bug).length > 0 && (
                            <Paper
                              elevation={0}
                              sx={{
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                padding: '16px'
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                <AttachFileIcon sx={{ color: '#059669', marginRight: '8px', fontSize: '20px' }} />
                                <Typography variant="subtitle2" sx={{
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  color: '#1e293b'
                                }}>
                                  Attached Files ({getFileButtonsFromLink(bug).length})
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: '8px' }}>
                                {getFileButtonsFromLink(bug).map((fileButton, index) => (
                                  <Tooltip key={index} title={`Click to copy: ${fileButton.path}`} arrow>
                                    <Chip
                                      label={fileButton.extension.toUpperCase()}
                                      size="small"
                                      onClick={(e) => handleFileClick(fileButton.path, e.target)}
                                      icon={<AttachFileIcon sx={{ fontSize: '14px !important' }} />}
                                      sx={{
                                        backgroundColor: fileButton.isViewable ? '#dcfce7' : '#dbeafe',
                                        color: fileButton.isViewable ? '#065f46' : '#1e40af',
                                        fontWeight: 600,
                                        fontSize: '12px',
                                        cursor: 'pointer',
                                        border: `1px solid ${fileButton.isViewable ? '#10b981' : '#3b82f6'}`,
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                          backgroundColor: fileButton.isViewable ? '#10b981' : '#3b82f6',
                                          color: 'white',
                                          transform: 'translateY(-1px)',
                                          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)'
                                        }
                                      }}
                                    />
                                  </Tooltip>
                                ))}
                              </Stack>
                            </Paper>
                          )}

                          {/* Comments Section */}
                          {bug.notes && (
                            <Paper
                              elevation={0}
                              sx={{
                                backgroundColor: '#fefce8',
                                border: '1px solid #fde047',
                                borderRadius: '12px',
                                padding: '16px'
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                <CommentIcon sx={{ color: '#ca8a04', marginRight: '8px', fontSize: '20px' }} />
                                <Typography variant="subtitle2" sx={{
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  color: '#1e293b'
                                }}>
                                  Comments ({bug.notes.split('[').length - 1})
                                </Typography>
                              </Box>
                              <Box sx={{
                                backgroundColor: 'white',
                                borderRadius: '8px',
                                padding: '12px',
                                border: '1px solid #fde047'
                              }}>
                                {bug.notes.split('\n\n').filter(comment => comment.trim()).map((comment, index) => (
                                  <Box
                                    key={index}
                                    sx={{
                                      padding: '8px 0',
                                      borderBottom: index < bug.notes.split('\n\n').filter(c => c.trim()).length - 1 ? '1px solid #fef3c7' : 'none',
                                      '&:last-child': {
                                        borderBottom: 'none',
                                        paddingBottom: 0
                                      },
                                      '&:first-of-type': {
                                        paddingTop: 0
                                      }
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        whiteSpace: 'pre-line',
                                        color: '#374151',
                                        fontSize: '13px',
                                        lineHeight: 1.6
                                      }}
                                    >
                                      {comment.trim()}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Paper>
                          )}

                          {/* Meeting Notes Section */}
                          {bug.meetings && (
                            <Paper
                              elevation={0}
                              sx={{
                                backgroundColor: '#f0f9ff',
                                border: '1px solid #7dd3fc',
                                borderRadius: '12px',
                                padding: '16px'
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                <MeetingIcon sx={{ color: '#0284c7', marginRight: '8px', fontSize: '20px' }} />
                                <Typography variant="subtitle2" sx={{
                                  fontSize: '14px',
                                  fontWeight: 600,
                                  color: '#1e293b'
                                }}>
                                  Meeting Notes ({bug.meetings.split('[').length - 1})
                                </Typography>
                              </Box>
                              <Box sx={{
                                backgroundColor: 'white',
                                borderRadius: '8px',
                                padding: '12px',
                                border: '1px solid #7dd3fc'
                              }}>
                                {bug.meetings.split('\n\n').filter(meeting => meeting.trim()).map((meeting, index) => (
                                  <Box
                                    key={index}
                                    sx={{
                                      padding: '8px 0',
                                      borderBottom: index < bug.meetings.split('\n\n').filter(m => m.trim()).length - 1 ? '1px solid #e0f2fe' : 'none',
                                      '&:last-child': {
                                        borderBottom: 'none',
                                        paddingBottom: 0
                                      },
                                      '&:first-of-type': {
                                        paddingTop: 0
                                      }
                                    }}
                                  >
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        whiteSpace: 'pre-line',
                                        color: '#374151',
                                        fontSize: '13px',
                                        lineHeight: 1.6
                                      }}
                                    >
                                      {meeting.trim()}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Paper>
                          )}

                        </Stack>
                      </CardContent>
                    </Collapse>
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
                    fontWeight: 600,
                    padding: '8px 16px',
                    backgroundColor: '#82a5c5 !important',
                    backgroundImage: 'none !important',
                    color: 'white',
                    border: '2px solid transparent',
                    boxShadow: '0 2px 8px rgba(130, 165, 197, 0.2)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      backgroundColor: '#6a8fad !important',
                      backgroundImage: 'none !important',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 16px rgba(130, 165, 197, 0.4)',
                      borderColor: '#5a7f9d'
                    },
                    '&:active': {
                      transform: 'translateY(0)',
                      boxShadow: '0 2px 4px rgba(130, 165, 197, 0.2)'
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

export default BugList;