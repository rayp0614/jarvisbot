import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LeadFinder from './pages/LeadFinder';
import Crons from './pages/Crons';
import Triggers from './pages/Triggers';
import Jobs from './pages/Jobs';
import Sales from './pages/Sales';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('jarvisbot_token');
    if (token) {
      // Verify token is still valid
      fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (res.ok) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('jarvisbot_token');
          }
        })
        .catch(() => {
          localStorage.removeItem('jarvisbot_token');
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem('jarvisbot_token', token);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('jarvisbot_token');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/lead-finder" element={<LeadFinder />} />
        <Route path="/crons" element={<Crons />} />
        <Route path="/triggers" element={<Triggers />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
