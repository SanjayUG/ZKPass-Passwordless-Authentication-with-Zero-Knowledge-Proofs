import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, regenerateApiKey } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [zkpKey, setZkpKey] = useState('');

  const handleRegenerateApiKey = async () => {
    if (!window.confirm('Are you sure you want to regenerate your API key? This will invalidate your current key.')) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const result = await regenerateApiKey();
      
      if (result.success) {
        setSuccess('API key regenerated successfully!');
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Failed to regenerate API key');
    }
    
    setLoading(false);
  };

  const handleUpdateZkpKey = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      if (!zkpKey.trim()) {
        setError('ZKP public key is required');
        setLoading(false);
        return;
      }
      
      const response = await axios.post('/api/user/update-zkp-key', { zkpPublicKey: zkpKey });
      setSuccess('ZKP public key updated successfully!');
      setZkpKey('');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update ZKP public key');
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-xl p-8 mb-8">
        <h1 className="text-3xl font-extrabold text-white mb-2">Profile Settings</h1>
        <p className="text-blue-100">Manage your account and ZKP authentication settings</p>
      </div>
      
      {/* Alert messages */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6 shadow-md" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded mb-6 shadow-md" role="alert">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{success}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left column - Account info */}
        <div className="w-full lg:w-2/3">
          <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Account Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Username</p>
                <p className="font-semibold text-gray-800">{user?.username || 'Loading...'}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="font-semibold text-gray-800">{user?.email || 'Loading...'}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-md font-medium mb-2 text-gray-700">API Key</h3>
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center">
                  <span className="font-mono text-sm bg-gray-100 p-3 rounded w-full sm:flex-grow overflow-x-auto border border-gray-300 text-gray-700 mb-2 sm:mb-0">{user?.apiKey || 'Loading...'}</span>
                  <div className="flex ml-0 sm:ml-2 w-full sm:w-auto">
                    <button
                      onClick={() => {navigator.clipboard.writeText(user?.apiKey || '')}}
                      className="p-2 rounded-md text-indigo-600 hover:bg-indigo-50 focus:outline-none flex-grow sm:flex-grow-0"
                      title="Copy to clipboard"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>
                    <button
                      onClick={handleRegenerateApiKey}
                      className="ml-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 flex-grow sm:flex-grow-0"
                      disabled={loading}
                    >
                      {loading ? 'Regenerating...' : 'Regenerate'}
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-500">Use this API key to authenticate your requests to the ZKP verification API.</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">ZKP Settings</h2>
            
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="zkpKey">
                ZKP Public Key
              </label>
              <textarea
                id="zkpKey"
                value={zkpKey}
                onChange={(e) => setZkpKey(e.target.value)}
                className="shadow appearance-none border rounded-md w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
                rows="3"
                placeholder="Enter your ZKP public key"
                disabled={loading}
              ></textarea>
              <p className="mt-2 text-sm text-gray-500">This public key will be used to verify your zero-knowledge proofs.</p>
            </div>
            
            <button
              onClick={handleUpdateZkpKey}
              className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </span>
              ) : 'Update ZKP Key'}
            </button>
          </div>
        </div>
        
        {/* Right column - Security tips and help */}
        <div className="w-full lg:w-1/3">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-md p-6 text-white mb-6">
            <h2 className="text-xl font-semibold mb-4">Security Tips</h2>
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Keep your API key confidential</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Regenerate your API key if you suspect it's been compromised</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Store your ZKP private key securely</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200 mt-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Documentation</h2>
            <p className="text-gray-600 mb-4">
              Learn more about how to use our ZKP verification system and API integration.
            </p>
            <a href="#" className="inline-block text-indigo-600 hover:text-indigo-800 font-medium">
              View Documentation <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;