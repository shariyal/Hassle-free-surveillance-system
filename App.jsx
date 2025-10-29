import React, { useState } from 'react';
import { BrowserRouter, Route, Routes, Link, useLocation } from 'react-router-dom';
import Home from './components/Home';
import Upload from './components/Upload';
import LiveMonitoring from './components/LiveMonitoring';

function NavLink({ to, children, icon }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  
  return (
    <Link 
      to={to}
      className={`nav-link ${isActive ? 'active' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 20px',
        borderRadius: 'var(--radius-lg)',
        color: isActive ? 'var(--text-inverse)' : 'rgba(255, 255, 255, 0.85)',
        backgroundColor: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
        textDecoration: 'none',
        fontWeight: '500',
        fontSize: '0.9rem',
        transition: 'all var(--transition-fast)',
        border: '1px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.target.style.backgroundColor = 'transparent';
          e.target.style.borderColor = 'transparent';
        }
      }}
    >
      <span style={{ fontSize: '1.1em' }}>{icon}</span>
      {children}
    </Link>
  );
}

function Navigation() {
  return (
    <nav style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      backdropFilter: 'blur(10px)',
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 0',
      }}>
        {/* Logo and Brand */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #ef4444, #f97316, #eab308)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          }}>
            🎯
          </div>
          <div>
            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'var(--text-inverse)',
              margin: 0,
              letterSpacing: '-0.025em',
            }}>
              ProActive Vision
            </h1>
            <p style={{
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.7)',
              margin: 0,
              fontWeight: '400',
            }}>
              Intelligent Safety Monitoring
            </p>
          </div>
        </div>

        {/* Navigation Links */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
        }}>
          <NavLink to="/" icon="📊">Safety Dashboard</NavLink>
          <NavLink to="/upload" icon="📝">Detection Analysis</NavLink>
          <NavLink to="/live" icon="📹">Live Monitoring</NavLink>
          
          {/* Status Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginLeft: '20px',
            padding: '8px 16px',
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8rem',
            color: 'rgba(255, 255, 255, 0.9)',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#10b981',
              borderRadius: '50%',
              animation: 'pulse 2s infinite',
            }}></div>
            <span>System Active</span>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div style={{ 
        minHeight: '100vh',
        backgroundColor: 'var(--bg-secondary)',
      }}>
        <Navigation />
        
        <main className="container" style={{ paddingTop: 'var(--space-xl)' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/live" element={<LiveMonitoring />} />
          </Routes>
        </main>
        
        {/* Footer */}
        <footer style={{
          marginTop: 'var(--space-2xl)',
          padding: 'var(--space-xl) 0',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-card)',
        }}>
          <div className="container">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
            }}>
              <p style={{ margin: 0 }}>
                © 2025 ProActive Vision. Intelligent Safety Monitoring • Prevent risks before they escalate.
              </p>
              <div style={{ display: 'flex', gap: '20px' }}>
                <span>🎯 Proactive</span>
                <span>🔥 Fire Detection</span>
                <span>🚗 Accident Alert</span>
                <span>🏥 Multi-Environment</span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Add keyframes for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </BrowserRouter>
  );
}

export default App;