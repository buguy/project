import React from 'react';
import './Navbar.css';

const Navbar = ({ onLogout, onNavigate }) => {
  console.log('🏗️ NAVBAR RENDER:', {
    onNavigateType: typeof onNavigate,
    onNavigateExists: !!onNavigate,
    timestamp: new Date().toLocaleTimeString()
  });

  const handleNavClick = (path) => {
    console.log('🎯 NAVBAR CLICK:', {
      path: path,
      onNavigateType: typeof onNavigate,
      onNavigateExists: !!onNavigate,
      timestamp: new Date().toLocaleTimeString()
    });

    if (onNavigate) {
      console.log('🎯 CALLING onNavigate for:', path);
      onNavigate(path);
      console.log('🎯 onNavigate call completed');
    } else {
      console.error('🎯 onNavigate is not available!');
    }
  };

  const handleBackup = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/api/backup', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Backup failed');
      }

      // Get the blob data (ZIP file)
      const blob = await response.blob();

      // Create download link with fixed filename
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bugtracker.zip';
      document.body.appendChild(a);
      a.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('Database backup downloaded successfully as bugtracker.zip!');
    } catch (error) {
      console.error('Backup error:', error);
      alert('Failed to create backup. Please try again.');
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <h2>Windows Bug Record System</h2>
        </div>
        <div className="nav-menu">
          <button
            onClick={() => handleNavClick('/bugs')}
            className="import-btn"
            type="button"
          >
            Home
          </button>

          <button
            onClick={() => handleNavClick('/jira-update')}
            className="import-btn"
            type="button"
          >
            Update to Jira
          </button>

          <button
            onClick={handleBackup}
            className="import-btn"
            type="button"
          >
            Backup
          </button>

          <button onClick={onLogout} className="logout-btn" type="button">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;