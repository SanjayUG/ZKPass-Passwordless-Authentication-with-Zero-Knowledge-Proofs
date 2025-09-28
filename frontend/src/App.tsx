// App.tsx
import { Web3Provider } from './utils/Web3Context';
import { WalletConnect } from './components/WalletConnect';
import { useState } from 'react';
import Register from './components/Register';
import Login from './components/Login';
import Recovery from './components/Recovery';
import RecoveryPhraseDisplay from './components/RecoveryPhraseDisplay';
import Dashboard from './components/Dashboard';
import './App.css';

enum AuthView {
  LOGIN = 'login',
  REGISTER = 'register',
  RECOVERY = 'recovery',
  RECOVERY_PHRASE_DISPLAY = 'recovery_phrase_display',
  DASHBOARD = 'dashboard'
}

function App() {
  const [currentView, setCurrentView] = useState<AuthView>(AuthView.LOGIN);
  const [uid, setUid] = useState<string>('');
  const [recoveryPhrase, setRecoveryPhrase] = useState<string>('');

  // Handle successful registration
  const handleRegisterSuccess = (phrase: string) => {
    setRecoveryPhrase(phrase);
    setCurrentView(AuthView.RECOVERY_PHRASE_DISPLAY);
  };

  // Handle successful login
  const handleLoginSuccess = (userUid: string) => {
    setUid(userUid);
    setCurrentView(AuthView.DASHBOARD);
  };

  // Handle recovery phrase confirmation
  const handleRecoveryPhraseConfirmed = () => {
    setCurrentView(AuthView.LOGIN);
  };

  // Handle recovery success
  const handleRecoverySuccess = (userUid: string) => {
    setUid(userUid);
    setCurrentView(AuthView.DASHBOARD);
  };

  // Handle logout
  const handleLogout = () => {
    setUid('');
    setCurrentView(AuthView.LOGIN);
  };

  return (
    <Web3Provider>
      <div className="app-container">
        {currentView !== AuthView.DASHBOARD && (
          <header className="app-header">
            <h1>ZKPass</h1>
            <p>Secure Authentication with Zero-Knowledge Proofs</p>
          </header>
        )}

        <main className="app-content">
          {currentView === AuthView.LOGIN && (
            <Login 
              onLoginSuccess={handleLoginSuccess} 
              onForgotUID={() => setCurrentView(AuthView.RECOVERY)} 
            />
          )}

          {currentView === AuthView.REGISTER && (
            <Register onRegisterSuccess={handleRegisterSuccess} />
          )}

          {currentView === AuthView.RECOVERY && (
            <Recovery 
              onRecoverySuccess={handleRecoverySuccess} 
              onCancel={() => setCurrentView(AuthView.LOGIN)} 
            />
          )}

          {currentView === AuthView.RECOVERY_PHRASE_DISPLAY && (
            <RecoveryPhraseDisplay 
              recoveryPhrase={recoveryPhrase} 
              onContinue={handleRecoveryPhraseConfirmed} 
            />
          )}

          {currentView === AuthView.DASHBOARD && (
            <Dashboard uid={uid} onLogout={handleLogout} />
          )}
        </main>

        <footer className="app-footer">
          {currentView === AuthView.LOGIN && (
            <p>
              Don't have an account?{' '}
              <button 
                onClick={() => setCurrentView(AuthView.REGISTER)} 
                className="text-button"
              >
                Register
              </button>
            </p>
          )}

          {currentView === AuthView.REGISTER && (
            <p>
              Already have an account?{' '}
              <button 
                onClick={() => setCurrentView(AuthView.LOGIN)} 
                className="text-button"
              >
                Login
              </button>
            </p>
          )}
        </footer>

        <WalletConnect />
      </div>
    </Web3Provider>
  );
}

export default App;