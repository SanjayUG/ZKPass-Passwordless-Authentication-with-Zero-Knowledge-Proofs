import { useState } from 'react';
import DeviceManagement from './DeviceManagement';
import '../styles/Dashboard.css';

interface DashboardProps {
  uid: string;
  onLogout: () => void;
}

const Dashboard = ({ uid, onLogout }: DashboardProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'devices'>('overview');

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <button onClick={onLogout} className="logout-button">
          Logout
        </button>
      </header>

      <nav className="dashboard-nav">
        <button
          className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`nav-tab ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          Device Management
        </button>
      </nav>
      
      {activeTab === 'overview' ? (
        <div className="dashboard-content">
          <div className="welcome-card">
            <h2>Welcome to ZKPass</h2>
            <p>You are securely authenticated using Zero-Knowledge Proofs and device-based authentication.</p>
          </div>
          
          <div className="uid-card">
            <h3>Your UID</h3>
            <p className="uid-display">{uid}</p>
          </div>
          
          <div className="info-card">
            <h3>About Zero-Knowledge Proofs</h3>
            <p>
              Zero-Knowledge Proofs allow you to prove you know something (like a password) 
              without revealing the actual information. This enhances security by ensuring 
              your sensitive data is never transmitted or stored on servers.
            </p>
          </div>

          <div className="info-card">
            <h3>Device-Based Security</h3>
            <p>
              Your account is protected by device-specific cryptographic keys. Each authorized 
              device has its own unique key pair, ensuring that only your trusted devices can 
              access your account. You can manage your devices in the Device Management tab.
            </p>
          </div>
        </div>
      ) : (
        <DeviceManagement uid={uid} />
      )}
    </div>
  );
};

export default Dashboard;