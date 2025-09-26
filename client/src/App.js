import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import BugList from './components/BugList';
import JiraUpdate from './components/JiraUpdate';
import Navbar from './components/Navbar';
import './App.css';

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importFunction, setImportFunction] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [navCallCount, setNavCallCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  // Log every location change
  useEffect(() => {
    console.log('🌍 LOCATION CHANGED:', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      timestamp: new Date().toLocaleTimeString()
    });
  }, [location]);

  // Log React Router setup on mount
  useEffect(() => {
    console.log('⚙️ REACT ROUTER SETUP:', {
      navigateType: typeof navigate,
      navigateExists: !!navigate,
      locationExists: !!location,
      currentPath: location.pathname,
      isAuthenticated: isAuthenticated
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const handleImportTrigger = (importFunc, importing) => {
    setImportFunction(() => importFunc);
    setIsImporting(importing);
  };

  // Navigation handlers that work properly within Router context
  const handleNavigation = (path) => {
    const callNum = navCallCount + 1;
    setNavCallCount(callNum);

    console.log('🚀 NAVIGATION CALL #' + callNum, {
      targetPath: path,
      currentPath: location.pathname,
      navigateType: typeof navigate,
      timestamp: new Date().toLocaleTimeString()
    });

    try {
      navigate(path);
      console.log('✅ NAVIGATION SUCCESS #' + callNum);
    } catch (error) {
      console.error('❌ NAVIGATION ERROR #' + callNum, error);
    }
  };


  if (loading) {
    return <div className="loading">Loading...</div>;
  }


  return (
    <div className="App">
      {isAuthenticated && (
        <>

          <Navbar
            onLogout={handleLogout}
            onImport={importFunction}
            isImporting={isImporting}
            onNavigate={handleNavigation}
          />
        </>
      )}
      <Routes>
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <Login onLogin={handleLogin} />
            ) : (
              <Navigate to="/bugs" replace />
            )
          }
        />
        <Route
          path="/signup"
          element={
            !isAuthenticated ? (
              <Signup onSignup={handleLogin} />
            ) : (
              <Navigate to="/bugs" replace />
            )
          }
        />
        <Route
          path="/bugs"
          element={
            isAuthenticated ? (
              <BugList onImportTrigger={handleImportTrigger} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/jira-update"
          element={
            isAuthenticated ? (
              <JiraUpdate />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/"
          element={
            <Navigate to={isAuthenticated ? "/bugs" : "/login"} replace />
          }
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
