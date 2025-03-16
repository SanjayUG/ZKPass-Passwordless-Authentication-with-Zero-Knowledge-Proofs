import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const VerificationRequests = () => {
  const { user } = useAuth();
  const [verifications, setVerifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [proofData, setProofData] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    try {
      const response = await axios.get('/api/verification/list');
      setVerifications(response.data.verifications);
      setLoading(false);
    } catch (error) {
      setError('Failed to load verification requests');
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/verification/request', {}, {
        headers: { 'X-API-Key': user.apiKey }
      });
      
      await fetchVerifications();
      setLoading(false);
    } catch (error) {
      setError('Failed to create verification request');
      setLoading(false);
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      setLoading(true);
      await axios.delete(`/api/verification/${requestId}`);
      await fetchVerifications();
      setLoading(false);
    } catch (error) {
      setError('Failed to cancel verification request');
      setLoading(false);
    }
  };

  const handleSubmitProof = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    setSubmitLoading(true);
    
    try {
      if (!proofData) {
        setSubmitError('Proof data is required');
        setSubmitLoading(false);
        return;
      }
      
      let parsedProofData;
      try {
        parsedProofData = JSON.parse(proofData);
      } catch (e) {
        setSubmitError('Invalid JSON format for proof data');
        setSubmitLoading(false);
        return;
      }
      
      const response = await axios.post('/api/verification/submit-proof', {
        requestId: selectedRequest,
        proofData: parsedProofData
      });
      
      setSubmitSuccess('Proof submitted successfully!');
      setProofData('');
      setSelectedRequest(null);
      await fetchVerifications();
    } catch (error) {
      setSubmitError(error.response?.data?.message || 'Failed to submit proof');
    }
    
    setSubmitLoading(false);
  };

  if (loading && verifications.length === 0) {
    return <div className="text-center py-10">Loading verification requests...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Verification Requests</h1>
        <button 
          onClick={handleCreateRequest}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
          disabled={loading}
        >
          {loading ? 'Creating...' : 'Create New Request'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {selectedRequest && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Submit Proof for Request: {selectedRequest}</h2>
          
          {submitError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {submitError}
            </div>
          )}
          
          {submitSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {submitSuccess}
            </div>
          )}
          
          <form onSubmit={handleSubmitProof}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="proofData">
                Proof Data (JSON format)
              </label>
              <textarea
                id="proofData"
                value={proofData}
                onChange={(e) => setProofData(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows="5"
                placeholder='{"proof": "sample_proof_data"}'
                disabled={submitLoading}
              ></textarea>
            </div>
            
            <div className="flex items-center justify-between">
              <button
                type="submit"
                className={`bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline ${submitLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={submitLoading}
              >
                {submitLoading ? 'Submitting...' : 'Submit Proof'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                disabled={submitLoading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      {verifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-gray-600">No verification requests found. Create a new request to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created At
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires At
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {verifications.map((verification) => (
                <tr key={verification.requestId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">{verification.requestId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${verification.status === 'verified' ? 'bg-green-100 text-green-800' : 
                        verification.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'}`}>
                      {verification.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(verification.createdAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(verification.expiresAt).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {verification.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedRequest(verification.requestId)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Submit Proof
                        </button>
                        <button
                          onClick={() => handleCancelRequest(verification.requestId)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {verification.status !== 'pending' && (
                      <span className="text-gray-500">No actions available</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VerificationRequests;