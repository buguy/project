import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LogsPage.css';

const LogsPage = ({ onClose }) => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [actionFilter, setActionFilter] = useState('');
  const [pimsFilter, setPimsFilter] = useState('');
  const [testerFilter, setTesterFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Filter options
  const [filterOptions, setFilterOptions] = useState({
    actions: [],
    testers: []
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [logs, actionFilter, pimsFilter, testerFilter, dateFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/logs?limit=1000', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(response.data);
      
      // Extract unique filter options
      const actions = [...new Set(response.data.map(log => log.operation))];
      const testers = [...new Set(response.data.map(log => log.bugData?.tester || log.user))];
      
      setFilterOptions({ actions, testers });
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = logs;

    if (actionFilter) {
      filtered = filtered.filter(log => log.operation === actionFilter);
    }

    if (pimsFilter) {
      filtered = filtered.filter(log => {
        const pims = log.bugData?.pims;
        return pims && pims.includes(pimsFilter);
      });
    }

    if (testerFilter) {
      filtered = filtered.filter(log => {
        const tester = log.bugData?.tester || log.user;
        return tester.toLowerCase().includes(testerFilter.toLowerCase());
      });
    }

    if (dateFilter) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        return logDate === dateFilter;
      });
    }

    setFilteredLogs(filtered);
  };

  const clearFilters = () => {
    setActionFilter('');
    setPimsFilter('');
    setTesterFilter('');
    setDateFilter('');
  };

  const formatLogEntry = (log) => {
    const action = log.operation;
    let pims = log.bugData?.pims ? log.bugData.pims : '';
    
    if (pims && !pims.startsWith('PIMS-')) {
      pims = `PIMS-${pims}`;
    }
    
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

    return { action, pimsDisplay, tester, date };
  };

  const downloadLogs = () => {
    const logText = filteredLogs.map(log => {
      const formatted = formatLogEntry(log);
      const firstLine = `${formatted.action} ${formatted.pimsDisplay}_ ${formatted.tester} ${formatted.date}`;
      let title = log.targetTitle || log.target;
      title = title.replace(/^\[[^\]]*\]\s*/, '');
      return `${firstLine}\n${title}\n`;
    }).join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'operation_logs.txt');
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  if (loading) return <div className="logs-page-loading">Loading logs...</div>;
  if (error) return <div className="logs-page-error">{error}</div>;

  return (
    <div className="logs-page-overlay">
      <div className="logs-page-container">
        <div className="logs-page-header">
          <h2>📋 Operation Logs ({filteredLogs.length} entries)</h2>
          <div className="logs-page-actions">
            <button onClick={downloadLogs} className="download-btn">
              📥 Download Filtered Logs
            </button>
            <button onClick={onClose} className="close-btn">
              ✖ Close
            </button>
          </div>
        </div>

        <div className="logs-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label>Action</label>
              <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                <option value="">All Actions</option>
                {filterOptions.actions.map(action => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>PIMS</label>
              <input
                type="text"
                value={pimsFilter}
                onChange={(e) => setPimsFilter(e.target.value)}
                placeholder="Enter PIMS number..."
                className="pims-filter-input"
              />
            </div>

            <div className="filter-group">
              <label>Tester</label>
              <select value={testerFilter} onChange={(e) => setTesterFilter(e.target.value)}>
                <option value="">All Testers</option>
                {filterOptions.testers.map(tester => (
                  <option key={tester} value={tester}>{tester}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="date-filter"
              />
            </div>

            <button onClick={clearFilters} className="clear-filters-btn">
              Clear Filters
            </button>
          </div>
        </div>

        <div className="logs-content">
          {filteredLogs.length === 0 ? (
            <div className="no-logs">No logs match your filter criteria</div>
          ) : (
            <div className="logs-list-page">
              {filteredLogs.map((log, index) => {
                const formatted = formatLogEntry(log);
                let title = log.targetTitle || log.target;
                title = title.replace(/^\[[^\]]*\]\s*/, '');
                
                return (
                  <div key={log._id || index} className="log-item-page">
                    <div className="log-single-line-page">
                      <span className={`log-operation-page ${log.operation.toLowerCase()}`}>
                        {formatted.action}
                      </span>
                      <span className="log-pims-page">
                        {formatted.pimsDisplay}
                      </span>
                      <span className="log-tester-page">{formatted.tester}</span>
                      <span className="log-title-page">{title}</span>
                      <span className="log-date-page">{formatted.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsPage;