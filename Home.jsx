import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <div className="card" style={{
    background: `linear-gradient(135deg, ${color}15, ${color}05)`,
    borderColor: `${color}30`,
    borderLeft: `4px solid ${color}`,
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 'var(--space-sm)',
    }}>
      <div>
        <h3 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: color,
          margin: 0,
          lineHeight: 1,
        }}>
          {value}
        </h3>
        <p style={{
          fontSize: '0.875rem',
          fontWeight: '600',
          color: 'var(--text-primary)',
          margin: '4px 0 0 0',
        }}>
          {title}
        </p>
        {subtitle && (
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            margin: '2px 0 0 0',
          }}>
            {subtitle}
          </p>
        )}
      </div>
      <div style={{
        fontSize: '2.5rem',
        opacity: 0.7,
      }}>
        {icon}
      </div>
    </div>
  </div>
);

const FeatureCard = ({ icon, title, description, status }) => (
  <div className="card" style={{
    transition: 'all var(--transition-normal)',
    cursor: 'pointer',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-md)',
    }}>
      <div style={{
        fontSize: '2rem',
        padding: 'var(--space-sm)',
        backgroundColor: 'var(--color-primary-light)',
        borderRadius: 'var(--radius-lg)',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-xs)',
        }}>
          <h3 style={{
            fontSize: '1.1rem',
            fontWeight: '600',
            margin: 0,
            color: 'var(--text-primary)',
          }}>
            {title}
          </h3>
          <span style={{
            fontSize: '0.75rem',
            padding: '2px 8px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: status === 'active' ? 'var(--color-success)' : 'var(--color-secondary)',
            color: 'white',
            fontWeight: '500',
          }}>
            {status === 'active' ? 'ACTIVE' : 'READY'}
          </span>
        </div>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '0.875rem',
          margin: 0,
          lineHeight: 1.5,
        }}>
          {description}
        </p>
      </div>
    </div>
  </div>
);

const AlertItem = ({ type, message, time, severity, location }) => {
  const getAlertColor = (severity) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'warning': return '#ea580c';
      case 'info': return '#2563eb';
      default: return '#64748b';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'fire': return '🔥';
      case 'accident': return '🚗';
      case 'smoking': return '🚭';
      case 'intrusion': return '🚨';
      case 'weapon': return '⚠️';
      default: return '📢';
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--space-sm)',
      padding: 'var(--space-md)',
      borderLeft: `4px solid ${getAlertColor(severity)}`,
      backgroundColor: severity === 'critical' ? '#fef2f2' : 'var(--bg-tertiary)',
      borderRadius: 'var(--radius-md)',
      marginBottom: 'var(--space-sm)',
    }}>
      <div style={{
        fontSize: '1.5rem',
        flexShrink: 0,
      }}>
        {getAlertIcon(type)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 'var(--space-xs)',
        }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: '600',
            color: getAlertColor(severity),
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {severity} Alert
          </span>
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
          }}>
            {time}
          </span>
        </div>
        <p style={{
          fontSize: '0.875rem',
          fontWeight: '500',
          color: 'var(--text-primary)',
          margin: '0 0 4px 0',
        }}>
          {message}
        </p>
        <p style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          margin: 0,
        }}>
          📍 {location}
        </p>
      </div>
    </div>
  );
};

export default function Home() {
  const [modelStatus, setModelStatus] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'fire',
      message: 'Smoke detected in manufacturing area',
      time: '2min ago',
      severity: 'critical',
      location: 'Factory Floor B - Zone 3'
    },
    {
      id: 2,
      type: 'accident',
      message: 'Vehicle collision detected on highway',
      time: '5min ago',
      severity: 'critical',
      location: 'Highway 101 - Mile 45'
    },
    {
      id: 3,
      type: 'smoking',
      message: 'Smoking violation in restricted area',
      time: '12min ago',
      severity: 'warning',
      location: 'Hospital Wing A - ICU Section'
    },
    {
      id: 4,
      type: 'intrusion',
      message: 'Unauthorized access attempt detected',
      time: '18min ago',
      severity: 'warning',
      location: 'School Building - Main Entrance'
    }
  ]);

  useEffect(() => {
    // Fetch model status on component mount
    const fetchModelStatus = async () => {
      try {
        const response = await axios.get('/api/model-status');
        setModelStatus(response.data);
      } catch (error) {
        console.error('Failed to fetch model status:', error);
      }
    };

    fetchModelStatus();
  }, []);

  const handleStreamToggle = () => {
    setStreaming(!streaming);
    setStreamError(false);
  };

  return (
    <div>
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #dc2626, #ea580c, #d97706)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-2xl)',
        marginBottom: 'var(--space-2xl)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          transform: 'translate(50%, -50%)',
        }} />
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          fontSize: '4rem',
          opacity: 0.1,
        }}>
          🚨⚠️🔥
        </div>
        <div style={{
          position: 'relative',
          zIndex: 1,
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '800',
            margin: '0 0 var(--space-md) 0',
            background: 'linear-gradient(45deg, #ffffff, #fef7cd)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Proactive Safety Control Center
          </h1>
          <p style={{
            fontSize: '1.125rem',
            margin: '0 0 var(--space-lg) 0',
            opacity: 0.95,
            maxWidth: '700px',
          }}>
            Modular intelligence system detecting accidents, fires, smoking & more. Real-time alerts prevent risks before they escalate across highways, factories, schools, and hospitals.
          </p>
          <div style={{
            display: 'flex',
            gap: 'var(--space-md)',
            flexWrap: 'wrap',
          }}>
            <button 
              className="btn"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(10px)',
              }}
              onClick={handleStreamToggle}
            >
              {streaming ? '⏹️ Stop Monitoring' : '📹 Start Live Monitoring'}
            </button>
            <button 
              className="btn btn-outline"
              style={{
                borderColor: 'rgba(255, 255, 255, 0.5)',
                color: 'white',
              }}
              onClick={() => window.location.href = '/upload'}
            >
              � Analyze Incident
            </button>
          </div>
        </div>
      </div>

      {/* Detection Modules Grid */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <h2 style={{
          fontSize: '1.875rem',
          fontWeight: '700',
          marginBottom: 'var(--space-md)',
          textAlign: 'center',
          color: 'var(--text-primary)',
        }}>
          🧠 Modular Intelligence Detection
        </h2>
        <p style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          marginBottom: 'var(--space-xl)',
          fontSize: '1.125rem',
        }}>
          Advanced AI modules for comprehensive safety monitoring
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 'var(--space-lg)',
        }}>
          <StatCard
            title="Fire Detection"
            value="Active"
            icon="�"
            color="#dc2626"
            subtitle="Real-time flame & smoke detection"
          />
          <StatCard
            title="Accident Detection"
            value="Monitoring"
            icon="🚗"
            color="#ea580c"
            subtitle="Vehicle collision & incident alerts"
          />
          <StatCard
            title="Smoking Detection"
            value="Enabled"
            icon="🚭"
            color="#7c2d12"
            subtitle="Prohibited smoking area monitoring"
          />
        </div>
      </div>

      {/* Environment Customization */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <h2 style={{
          fontSize: '1.875rem',
          fontWeight: '700',
          marginBottom: 'var(--space-md)',
          textAlign: 'center',
          color: 'var(--text-primary)',
        }}>
          🏢 Customizable for Every Environment
        </h2>
        <p style={{
          textAlign: 'center',
          color: 'var(--text-secondary)',
          marginBottom: 'var(--space-xl)',
          fontSize: '1.125rem',
        }}>
          Tailored intelligence for different facility types and safety requirements
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--space-lg)',
        }}>
          <FeatureCard
            icon="🛣️"
            title="Highway Monitoring"
            description="Traffic accident detection, speed monitoring, and emergency response coordination for road safety."
            status="active"
          />
          <FeatureCard
            icon="🏭"
            title="Factory Safety"
            description="Industrial hazard detection, worker safety compliance, and equipment malfunction alerts."
            status="active"
          />
          <FeatureCard
            icon="🏫"
            title="School Security"
            description="Student safety monitoring, unauthorized entry detection, and emergency lockdown protocols."
            status="active"
          />
          <FeatureCard
            icon="🏥"
            title="Hospital Protection"
            description="Patient monitoring, restricted area access control, and medical emergency detection."
            status="active"
          />
          <FeatureCard
            icon="🏢"
            title="Office Buildings"
            description="Corporate security, workplace safety compliance, and visitor management systems."
            status="ready"
          />
          <FeatureCard
            icon="🏪"
            title="Retail Stores"
            description="Theft prevention, customer behavior analysis, and queue management optimization."
            status="ready"
          />
        </div>
      </div>

      {/* Real-Time Alerts Panel */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: streaming ? '2fr 1fr' : '1fr',
        gap: 'var(--space-xl)',
        marginBottom: 'var(--space-2xl)',
        alignItems: 'start',
      }}>
        {/* Alerts Panel */}
        <div className="card">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-lg)',
            paddingBottom: 'var(--space-md)',
            borderBottom: '1px solid var(--border-color)',
          }}>
            <div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                margin: 0,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
              }}>
                🚨 Real-Time Alerts
                <span style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#dc2626',
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite',
                }}></span>
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                margin: '4px 0 0 0',
              }}>
                Instant detection & notifications for proactive safety
              </p>
            </div>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '600',
              color: 'var(--color-danger)',
              backgroundColor: '#fef2f2',
              padding: '4px 12px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid #fecaca',
            }}>
              {alerts.filter(a => a.severity === 'critical').length} CRITICAL
            </div>
          </div>
          
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            paddingRight: 'var(--space-xs)',
          }}>
            {alerts.map(alert => (
              <AlertItem key={alert.id} {...alert} />
            ))}
          </div>
          
          <div style={{
            marginTop: 'var(--space-lg)',
            paddingTop: 'var(--space-md)',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
          }}>
            <button className="btn btn-outline" style={{ fontSize: '0.875rem' }}>
              📋 View All Alerts History
            </button>
          </div>
        </div>

        {/* Live Stream Sidebar when active */}
        {streaming && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              padding: 'var(--space-md)',
              backgroundColor: 'var(--bg-tertiary)',
              borderBottom: '1px solid var(--border-color)',
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '1.125rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
              }}>
                📹 Live Monitor
                <span style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-danger)',
                  fontWeight: '500',
                }}>
                  RECORDING
                </span>
              </h3>
            </div>
            <div style={{
              backgroundColor: '#000',
              minHeight: '200px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {!streamError ? (
                <img 
                  src="/api/stream" 
                  alt="Live Stream" 
                  style={{ 
                    width: '100%',
                    height: 'auto',
                    maxHeight: '300px',
                    objectFit: 'cover',
                  }}
                  onError={(e) => setStreamError(true)}
                />
              ) : (
                <div style={{
                  color: 'white',
                  textAlign: 'center',
                  padding: 'var(--space-lg)',
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>📷</div>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem' }}>
                    Camera feed unavailable
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live Stream Section (Full Width when not in sidebar) */}
      {streaming && (
        <div className="card" style={{
          marginBottom: 'var(--space-2xl)',
          padding: 0,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: 'var(--space-lg)',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-tertiary)',
          }}>
            <h2 style={{
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
            }}>
              <span style={{
                width: '12px',
                height: '12px',
                backgroundColor: 'var(--color-danger)',
                borderRadius: '50%',
                animation: 'pulse 2s infinite',
              }}></span>
              Live Camera Stream
            </h2>
          </div>
          <div style={{
            padding: 'var(--space-lg)',
            textAlign: 'center',
            backgroundColor: '#000',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {!streamError ? (
              <img 
                src="/api/stream" 
                alt="Live Stream" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '500px',
                  borderRadius: 'var(--radius-md)',
                }}
                onError={(e) => {
                  console.error('Stream error');
                  setStreamError(true);
                }}
              />
            ) : (
              <div style={{
                color: 'white',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>📷</div>
                <h3 style={{ color: 'white', marginBottom: 'var(--space-sm)' }}>Camera Not Available</h3>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Please check your camera connection or try refreshing the page.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Features Grid */}
      <div style={{ marginBottom: 'var(--space-2xl)' }}>
        <h2 style={{
          fontSize: '1.875rem',
          fontWeight: '700',
          marginBottom: 'var(--space-xl)',
          textAlign: 'center',
          color: 'var(--text-primary)',
        }}>
          System Capabilities
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'var(--space-lg)',
        }}>
          <FeatureCard
            icon="🎥"
            title="Real-time Detection"
            description="Live camera feed with instant object detection and classification using advanced AI algorithms."
            status="active"
          />
          <FeatureCard
            icon="📤"
            title="File Analysis"
            description="Upload images and videos for detailed analysis with confidence scoring and bounding box visualization."
            status="ready"
          />
          <FeatureCard
            icon="⚡"
            title="High Performance"
            description="Optimized for speed and accuracy with minimal latency for real-time security applications."
            status="active"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, var(--bg-card), var(--bg-tertiary))',
        textAlign: 'center',
      }}>
        <h3 style={{
          fontSize: '1.5rem',
          fontWeight: '600',
          marginBottom: 'var(--space-lg)',
          color: 'var(--text-primary)',
        }}>
          🚀 Emergency Response Actions
        </h3>
        <div style={{
          display: 'flex',
          gap: 'var(--space-md)',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <button 
            className="btn btn-primary"
            onClick={() => window.location.href = '/upload'}
          >
            � Analyze Incident Footage
          </button>
          <button 
            className="btn btn-secondary"
            onClick={handleStreamToggle}
          >
            {streaming ? 'Stop Live Monitoring' : 'Start Live Monitoring'}
          </button>
          <button 
            className="btn"
            style={{
              backgroundColor: '#dc2626',
              color: 'white',
              border: '1px solid #dc2626',
            }}
            onClick={() => alert('Emergency protocols activated!')}
          >
            🚨 Emergency Alert
          </button>
          <button 
            className="btn btn-outline"
            onClick={() => window.location.reload()}
          >
            Refresh System Status
          </button>
        </div>
      </div>
    </div>
  );
}
