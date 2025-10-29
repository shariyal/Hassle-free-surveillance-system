import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

function LiveMonitoring() {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [streaming, setStreaming] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [cameraStatus, setCameraStatus] = useState({});
  const [loading, setLoading] = useState(false);
  const [customCameraUrl, setCustomCameraUrl] = useState('');
  const [frameUpdateInterval, setFrameUpdateInterval] = useState(null);
  const videoRef = useRef(null);
  const alertsRef = useRef(null);

  // Fetch available cameras on component mount
  useEffect(() => {
    fetchCameras();
    fetchCameraStatus();
    fetchAlerts();
    
    // Set up polling for alerts and status
    const alertInterval = setInterval(fetchAlerts, 5000); // Every 5 seconds
    const statusInterval = setInterval(fetchCameraStatus, 3000); // Every 3 seconds
    
    return () => {
      clearInterval(alertInterval);
      clearInterval(statusInterval);
      stopFrameUpdates();
      stopCamera();
    };
  }, []);

  const fetchCameras = async () => {
    try {
      // Use relative path to leverage the Vite proxy
      const response = await axios.get('/api/cameras');
      setCameras(response.data.cameras);
      setSelectedCamera(response.data.cameras[0] || null);
      setStreaming(response.data.streaming);
    } catch (error) {
      console.error('Failed to fetch cameras:', error);
    }
  };

  const fetchCameraStatus = async () => {
    try {
      // Use relative path
      const response = await axios.get('/api/camera/status');
      setCameraStatus(response.data);
      setStreaming(response.data.streaming);
    } catch (error) {
      console.error('Failed to fetch camera status:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      // Use relative path
      const response = await axios.get('/api/alerts?limit=20');
      setAlerts(response.data.alerts);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  const startCamera = async () => {
    if (!selectedCamera && !customCameraUrl) return;
    
    setLoading(true);
    try {
      const payload = customCameraUrl 
        ? { camera_url: customCameraUrl }
        : { camera_id: selectedCamera.id };
      
      // Use relative path
      await axios.post('/api/camera/start', payload);
      setStreaming(true);
      
      // Start frame-based video updates
      startFrameUpdates();
    } catch (error) {
      console.error('Failed to start camera:', error);
      alert('Failed to start camera: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Frame update function for continuous image refresh
  const updateFrame = () => {
    if (videoRef.current) {
        // Construct the URL ensuring it's relative
        // The browser will combine this with the current host, and Vite will proxy it.
        const frameUrl = `/api/video-frame?t=${Date.now()}`;
        videoRef.current.src = frameUrl;
    }
  };

  const startFrameUpdates = () => {
    stopFrameUpdates(); // Clear any existing interval
    // Update frame every 100ms (10 FPS)
    const interval = setInterval(updateFrame, 100);
    setFrameUpdateInterval(interval);
  };

  const stopFrameUpdates = () => {
    if (frameUpdateInterval) {
      clearInterval(frameUpdateInterval);
      setFrameUpdateInterval(null);
    }
  };

  const stopCamera = async () => {
    setLoading(true);
    try {
      stopFrameUpdates();
      // Use relative path
      await axios.post('/api/camera/stop');
      setStreaming(false);
      if (videoRef.current) {
        videoRef.current.src = '';
      }
    } catch (error) {
      console.error('Failed to stop camera:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAlerts = async () => {
    try {
      // Use relative path
      await axios.post('/api/alerts/clear');
      setAlerts([]);
    } catch (error) {
      console.error('Failed to clear alerts:', error);
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'critical': return '#ef4444'; // Bright red for critical
      case 'high': return '#f97316'; // Orange for high
      case 'low': default: return '#10b981'; // Green for low
    }
  };

  const getRiskLevelIcon = (level) => {
    switch (level) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'low': default: return '✅';
    }
  };

  // Check if there are any critical alerts in the last 5 minutes
  const hasActiveCriticalRisk = () => {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    return alerts.some(alert => 
      (alert.severity === 'critical' || alert.risk_level === 'critical') && 
      new Date(alert.timestamp).getTime() > fiveMinutesAgo
    );
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        marginBottom: 'var(--space-2xl)',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          marginBottom: 'var(--space-sm)',
          color: 'var(--text-primary)',
        }}>
          📹 Live Safety Monitoring
        </h1>
        <p style={{
          fontSize: '1.125rem',
          color: 'var(--text-secondary)',
          maxWidth: '700px',
          margin: '0 auto',
        }}>
          Real-time surveillance with AI-powered threat detection. Monitor live camera feeds for fires, smoking violations, and security incidents.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: 'var(--space-xl)',
        alignItems: 'start',
      }}>
        {/* Video Feed Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Live Video Feed</h2>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-lg)',
            }}>
              {/* Live Status */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: streaming ? '#10b981' : '#ef4444',
                }}></span>
                <span style={{
                  fontSize: '0.875rem',
                  color: streaming ? '#10b981' : '#ef4444',
                  fontWeight: '500',
                }}>
                  {streaming ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>

              {/* Risk Status */}
              {streaming && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: hasActiveCriticalRisk() ? '#ef4444' : '#10b981',
                    animation: hasActiveCriticalRisk() ? 'pulse 1.5s infinite' : 'none',
                  }}></span>
                  <span style={{
                    fontSize: '0.875rem',
                    color: hasActiveCriticalRisk() ? '#ef4444' : '#10b981',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                  }}>
                    {hasActiveCriticalRisk() ? '🚨 CRITICAL RISK' : '✅ SAFE'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Camera Selection */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <h4 style={{
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: 'var(--space-md)',
              color: 'var(--text-primary)',
            }}>
              📹 Camera Selection
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-sm)',
              marginBottom: 'var(--space-md)',
            }}>
              {cameras.map(camera => (
                <button
                  key={camera.id}
                  onClick={() => setSelectedCamera(camera)}
                  disabled={streaming}
                  style={{
                    padding: 'var(--space-sm)',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${selectedCamera?.id === camera.id ? 'var(--color-primary)' : 'var(--border-color)'}`,
                    backgroundColor: selectedCamera?.id === camera.id ? 'var(--color-primary-light)' : 'var(--bg-card)',
                    cursor: streaming ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    opacity: streaming ? 0.6 : 1,
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    marginBottom: '4px',
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>
                      {camera.type === 'ip' ? '🌐' : '📷'}
                    </span>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: selectedCamera?.id === camera.id ? 'var(--color-primary)' : 'var(--text-primary)',
                    }}>
                      {camera.name}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    margin: 0,
                  }}>
                    {camera.resolution && `${camera.resolution} • `}
                    {camera.type === 'ip' ? 'IP Camera' : 'Local Camera'}
                  </p>
                </button>
              ))}
            </div>

            {/* Custom IP Camera URL */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <label style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                marginBottom: 'var(--space-xs)',
                display: 'block',
                color: 'var(--text-primary)',
              }}>
                Custom IP Camera URL:
              </label>
              <input
                type="text"
                value={customCameraUrl}
                onChange={(e) => setCustomCameraUrl(e.target.value)}
                placeholder="rtsp://admin:password@192.168.1.100:554/stream"
                disabled={streaming}
                style={{
                  width: '100%',
                  padding: 'var(--space-sm)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.875rem',
                  backgroundColor: streaming ? 'var(--bg-tertiary)' : 'var(--bg-card)',
                  opacity: streaming ? 0.6 : 1,
                }}
              />
            </div>
          </div>

          {/* Camera Controls */}
          <div style={{
            display: 'flex',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-lg)',
          }}>
            <button
              onClick={startCamera}
              disabled={loading || streaming || (!selectedCamera && !customCameraUrl)}
              className="btn btn-primary"
              style={{ minWidth: '120px' }}
            >
              {loading ? (
                <>
                  <span style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: '50%',
                    borderTopColor: 'white',
                    animation: 'spin 1s linear infinite',
                  }}></span>
                  Starting...
                </>
              ) : (
                <>📹 Start Camera</>
              )}
            </button>
            
            <button
              onClick={stopCamera}
              disabled={loading || !streaming}
              className="btn btn-secondary"
              style={{ minWidth: '120px' }}
            >
              {loading ? 'Stopping...' : '⏹️ Stop Camera'}
            </button>
          </div>

          {/* Video Display */}
          <div style={{
            backgroundColor: '#000',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            position: 'relative',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {streaming ? (
              <img
                ref={videoRef}
                alt="Live Video Feed"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '500px',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <div style={{
                color: '#fff',
                textAlign: 'center',
                padding: 'var(--space-2xl)',
              }}>
                <div style={{ fontSize: '4rem', marginBottom: 'var(--space-md)' }}>📹</div>
                <h3 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-sm)' }}>
                  No Video Feed
                </h3>
                <p style={{ fontSize: '1rem', opacity: 0.8 }}>
                  Select a camera and click "Start Camera" to begin monitoring
                </p>
              </div>
            )}
          </div>

          {/* Camera Status */}
          {streaming && (
            <div style={{
              marginTop: 'var(--space-md)',
              padding: 'var(--space-md)',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
                <span>📷 Camera: {cameraStatus.current_camera}</span>
                <span>📐 Resolution: {cameraStatus.resolution || 'Unknown'}</span>
                <span>🎬 FPS: {cameraStatus.fps || 'Unknown'}</span>
                <span>🚨 Alerts: {cameraStatus.alerts_count || 0}</span>
              </div>
            </div>
          )}
        </div>

        {/* Alerts Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">🚨 Real-time Alerts</h2>
            <button
              onClick={clearAlerts}
              className="btn btn-outline"
              style={{ fontSize: '0.875rem', padding: '4px 8px' }}
            >
              Clear All
            </button>
          </div>

          <div
            ref={alertsRef}
            style={{
              maxHeight: '600px',
              overflowY: 'auto',
              padding: 'var(--space-sm)',
            }}
          >
            {alerts.length > 0 ? (
              alerts.slice().reverse().map((alert, index) => (
                <div
                  key={index}
                  style={{
                    padding: 'var(--space-md)',
                    marginBottom: 'var(--space-sm)',
                    backgroundColor: alert.risk_level === 'critical' || alert.severity === 'critical' ? '#fef2f2' : 
                                   alert.risk_level === 'high' ? '#fef3c7' : '#f0fdf4',
                    border: `3px solid ${getRiskLevelColor(alert.risk_level || alert.severity)}`,
                    borderRadius: 'var(--radius-md)',
                    animation: (alert.risk_level === 'critical' || alert.severity === 'critical') ? 
                      'pulse 1s infinite, glow 2s ease-in-out infinite alternate' : 
                      index === 0 ? 'pulse 2s infinite' : 'none',
                    boxShadow: (alert.risk_level === 'critical' || alert.severity === 'critical') ? 
                      `0 0 20px ${getRiskLevelColor(alert.risk_level || alert.severity)}40` : 'none',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-xs)',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                    }}>
                      <span style={{ fontSize: '1.2rem' }}>
                        {getRiskLevelIcon(alert.risk_level)}
                      </span>
                      <span style={{
                        fontWeight: '700',
                        color: getRiskLevelColor(alert.risk_level || alert.severity),
                        textTransform: 'uppercase',
                        fontSize: '0.9rem',
                        textShadow: (alert.risk_level === 'critical' || alert.severity === 'critical') ? 
                          '0 0 10px rgba(239, 68, 68, 0.5)' : 'none',
                      }}>
                        {(alert.risk_level || alert.severity || 'unknown').toUpperCase()} RISK
                      </span>
                    </div>
                    <span style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}>
                      {formatTimestamp(alert.timestamp)}
                    </span>
                  </div>

                  {/* Display direct message for live incidents */}
                  {alert.message && (
                    <div style={{
                      fontSize: (alert.risk_level === 'critical' || alert.severity === 'critical') ? '1rem' : '0.875rem',
                      marginBottom: 'var(--space-sm)',
                      fontWeight: (alert.risk_level === 'critical' || alert.severity === 'critical') ? '700' : '500',
                      color: (alert.risk_level === 'critical' || alert.severity === 'critical') ? '#ef4444' : 'var(--text-primary)',
                      textShadow: (alert.risk_level === 'critical' || alert.severity === 'critical') ? 
                        '0 0 5px rgba(239, 68, 68, 0.3)' : 'none',
                    }}>
                      {alert.message}
                    </div>
                  )}

                  {/* Display detailed alerts array */}
                  {alert.alerts && alert.alerts.map((alertDetail, alertIndex) => (
                    <div key={alertIndex} style={{
                      fontSize: '0.875rem',
                      marginBottom: 'var(--space-xs)',
                    }}>
                      <div style={{
                        fontWeight: '500',
                        color: 'var(--text-primary)',
                        marginBottom: '2px',
                      }}>
                        {alertDetail.message}
                      </div>
                      <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                      }}>
                        Action: {alertDetail.action}
                      </div>
                    </div>
                  ))}

                  {alert.detections && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginTop: 'var(--space-xs)',
                    }}>
                      {alert.detections} detection{alert.detections !== 1 ? 's' : ''} found
                    </div>
                  )}

                  {/* Show violations for live incidents */}
                  {alert.violations && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: (alert.risk_level === 'critical' || alert.severity === 'critical') ? '#ef4444' : 'var(--text-muted)',
                      marginTop: 'var(--space-xs)',
                      fontWeight: '500',
                    }}>
                      Violations: {alert.violations.join(', ').toUpperCase()}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{
                textAlign: 'center',
                padding: 'var(--space-2xl)',
                color: 'var(--text-muted)',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>
                  ✅
                </div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-sm)' }}>
                  No Alerts
                </h3>
                <p>All clear! No safety incidents detected.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading Animation CSS */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes glow {
          0% { 
            box-shadow: 0 0 5px rgba(239, 68, 68, 0.4), 0 0 10px rgba(239, 68, 68, 0.3), 0 0 15px rgba(239, 68, 68, 0.2);
          }
          100% { 
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.6), 0 0 20px rgba(239, 68, 68, 0.4), 0 0 30px rgba(239, 68, 68, 0.3);
          }
        }
      `}</style>
    </div>
  );
}

export default LiveMonitoring;