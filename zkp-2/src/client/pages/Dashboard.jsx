import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalVerifications: 0,
    pendingVerifications: 0,
    verifiedCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/api/verification/list');
        const verifications = response.data.verifications;
        
        setStats({
          totalVerifications: verifications.length,
          pendingVerifications: verifications.filter(v => v.status === 'pending').length,
          verifiedCount: verifications.filter(v => v.status === 'verified').length
        });
        setLoading(false);
      } catch (error) {
        setError('Failed to load statistics');
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-primary mb-6">Welcome, {user.username}!</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800">Total Verifications</h2>
          <p className="text-3xl font-bold text-primary">{stats.totalVerifications}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800">Pending Verifications</h2>
          <p className="text-3xl font-bold text-secondary">{stats.pendingVerifications}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800">Verified Proofs</h2>
          <p className="text-3xl font-bold text-accent">{stats.verifiedCount}</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;