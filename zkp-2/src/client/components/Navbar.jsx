import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-4">
        <Link to="/" className="text-xl font-bold text-primary">ZKP Platform</Link>
        <div className="hidden md:flex space-x-4">
          <Link to="/dashboard" className="hover:text-secondary">Dashboard</Link>
          <Link to="/verification-requests" className="hover:text-secondary">Requests</Link>
          <Link to="/profile" className="hover:text-secondary">Profile</Link>
          {isAuthenticated && (
            <button onClick={handleLogout} className="text-red-600 hover:text-red-800">Logout</button>
          )}
        </div>
        <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <svg className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden bg-white shadow-md">
          <Link to="/dashboard" className="block px-4 py-2 hover:bg-gray-100">Dashboard</Link>
          <Link to="/verification-requests" className="block px-4 py-2 hover:bg-gray-100">Requests</Link>
          <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100">Profile</Link>
          {isAuthenticated && (
            <button onClick={handleLogout} className="block px-4 py-2 text-red-600 hover:bg-gray-100">Logout</button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;