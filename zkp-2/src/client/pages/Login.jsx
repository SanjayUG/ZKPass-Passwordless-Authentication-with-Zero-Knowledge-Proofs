import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    privateKey: '' // Add private key field
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const { username, password, privateKey } = formData; // Include private key

    if (!username || !password || !privateKey) { // Check for private key
      setError('All fields are required');
      setLoading(false);
      return;
    }
    
    const result = await login(username, password, privateKey); // Pass private key to login function
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="auth-form-container">
      <div className="auth-form-header">
        <h2 className="text-2xl font-bold">Welcome Back</h2>
        <p className="text-indigo-100 mt-1">Sign in to your account</p>
      </div>
      
      <div className="auth-form-content">
        {error && (
          <div className="error-message">
            <div className="flex">
              <svg className="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="username">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="auth-input"
              placeholder="Enter your username"
              disabled={loading}
            />
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-gray-700 text-sm font-medium" htmlFor="password">
                Password
              </label>
              <a href="#" className="text-xs text-indigo-600 hover:text-indigo-800">Forgot password?</a>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="auth-input"
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <div> {/* Add private key input */}
            <label className="block text-gray-700 text-sm font-medium mb-2" htmlFor="privateKey">
              Private Key
            </label>
            <input
              type="text"
              id="privateKey"
              name="privateKey"
              value={formData.privateKey}
              onChange={handleChange}
              className="auth-input"
              placeholder="Enter your private key"
              disabled={loading}
            />
          </div>
          
          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;