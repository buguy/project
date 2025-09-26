import React from 'react';
import './Navbar.css';

const Navbar = ({ onLogout, onImport, isImporting, onNavigate }) => {
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

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <h2>Bug Record System</h2>
        </div>
        <div className="nav-menu">
          <button
            onClick={() => handleNavClick('/bugs')}
            className="import-btn"
            type="button"
          >
            Home
          </button>

          {onImport && (
            <button
              onClick={onImport}
              disabled={isImporting}
              className="import-btn"
              type="button"
            >
              {isImporting ? 'Importing...' : 'Import from Google Sheets'}
            </button>
          )}

          <button
            onClick={() => handleNavClick('/jira-update')}
            className="import-btn"
            type="button"
          >
            Update to Jira
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