import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import VerificationRequests from './pages/VerificationRequests';
import Profile from './pages/Profile';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="container">
      {isAuthenticated && <Navbar />}
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/verification-requests" element={<ProtectedRoute><VerificationRequests /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </div>
  );
};

export default App;