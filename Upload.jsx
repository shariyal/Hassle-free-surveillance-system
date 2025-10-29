import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';

const DetectionBadge = ({ detection, index }) => (
  <div style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
    padding: 'var(--space-xs) var(--space-sm)',
    backgroundColor: 'var(--color-primary-light)',
    borderRadius: 'var(--radius-lg)',
    fontSize: '0.8rem',
    fontWeight: '500',
    margin: '2px',
  }}>
    <span style={{
      width: '8px',
      height: '8px',
      backgroundColor: `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
      borderRadius: '50%',
    }}></span>
    <span style={{ color: 'var(--color-primary)' }}>
      {detection.class}
    </span>
    <span style={{ 
      color: 'var(--text-muted)',
      fontSize: '0.75rem',
    }}>
      {Math.round(detection.confidence * 100)}%
    </span>
  </div>
);

function Upload() {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(null);
  const [analysisType, setAnalysisType] = useState('accident');
  const fileInputRef = useRef(null);

  const analysisTypes = [
    { id: 'accident', name: 'Accident Detection', icon: '�', description: 'Detect accidents and emergency situations - works best with real photos' },
    { id: 'fire_smoke', name: 'Fire & Smoke', icon: '🔥', description: 'Specialized fire and smoke detection' },
    { id: 'smoking', name: 'Smoking', icon: '🚬', description: 'Detect smoking violations' },
    { id: 'combined', name: 'Combined Analysis', icon: '🛡️', description: 'Complete safety assessment' }
  ];

  const handleFiles = useCallback((files) => {
    if (files && files[0]) {
      const selectedFile = files[0];
      setFile(selectedFile);
      setResult(null);
      
      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(selectedFile);
      } else {
        setPreview(null);
      }
    }
  }, []);

  const onFileChange = (e) => {
    handleFiles(e.target.files);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const upload = async () => {
    if (!file) {
      setResult({ error: 'Please select a file first' });
      return;
    }
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('analysis_type', analysisType);
    
    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResult(response.data);
    } catch (error) {
      console.error('Upload error:', error);
      setResult({ 
        error: error.response?.data?.error || error.message || 'Upload failed' 
      });
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          🔍 Safety Incident Analysis
        </h1>
        <p style={{
          fontSize: '1.125rem',
          color: 'var(--text-secondary)',
          maxWidth: '700px',
          margin: '0 auto',
        }}>
          Upload incident footage for AI-powered detection of accidents, fires, smoking violations, and security threats. Get instant analysis with risk assessment and safety recommendations.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: file ? '1fr 1fr' : '1fr',
        gap: 'var(--space-xl)',
        alignItems: 'start',
      }}>
        {/* Upload Section */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Upload Incident Footage</h2>
            <p className="card-description">
              Select analysis type and upload your surveillance footage
            </p>
          </div>

          {/* Analysis Type Selection */}
          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <h4 style={{
              fontSize: '1rem',
              fontWeight: '600',
              marginBottom: 'var(--space-md)',
              color: 'var(--text-primary)',
            }}>
              🎯 Analysis Type
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-sm)',
            }}>
              {analysisTypes.map(type => (
                <button
                  key={type.id}
                  onClick={() => setAnalysisType(type.id)}
                  style={{
                    padding: 'var(--space-sm)',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${analysisType === type.id ? 'var(--color-primary)' : 'var(--border-color)'}`,
                    backgroundColor: analysisType === type.id ? 'var(--color-primary-light)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all var(--transition-fast)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-xs)',
                    marginBottom: '4px',
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>{type.icon}</span>
                    <span style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: analysisType === type.id ? 'var(--color-primary)' : 'var(--text-primary)',
                    }}>
                      {type.name}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    margin: 0,
                    lineHeight: 1.3,
                  }}>
                    {type.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Drag & Drop Area */}
          <div 
            style={{
              border: `2px dashed ${dragActive ? 'var(--color-primary)' : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-2xl)',
              textAlign: 'center',
              backgroundColor: dragActive ? 'var(--color-primary-light)' : 'var(--bg-tertiary)',
              transition: 'all var(--transition-fast)',
              cursor: 'pointer',
              marginBottom: 'var(--space-lg)',
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{
              fontSize: '3rem',
              marginBottom: 'var(--space-md)',
              opacity: 0.7,
            }}>
              {dragActive ? '📥' : '📁'}
            </div>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              marginBottom: 'var(--space-sm)',
              color: dragActive ? 'var(--color-primary)' : 'var(--text-primary)',
            }}>
              {dragActive ? 'Drop files here' : 'Choose files to upload'}
            </h3>
            <p style={{
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              marginBottom: 'var(--space-md)',
            }}>
              Supports: JPG, PNG, MP4, AVI • Max 16MB • CCTV footage, photos, incident videos
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={onFileChange}
              accept="image/*,video/*"
              style={{ display: 'none' }}
            />
            
            <button className="btn btn-outline">
              📂 Browse Files
            </button>
          </div>

          {/* Selected File Info */}
          {file && (
            <div style={{
              backgroundColor: 'var(--bg-tertiary)',
              padding: 'var(--space-lg)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-lg)',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-sm)',
              }}>
                <h4 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  margin: 0,
                  color: 'var(--text-primary)',
                }}>
                  Selected File
                </h4>
                <button 
                  onClick={clearFile}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    padding: '4px',
                    borderRadius: 'var(--radius-sm)',
                  }}
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
              }}>
                <span style={{ fontSize: '1.5rem' }}>
                  {file.type.startsWith('image/') ? '🖼️' : '🎥'}
                </span>
                <div>
                  <p style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    margin: 0,
                    color: 'var(--text-primary)',
                  }}>
                    {file.name}
                  </p>
                  <p style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                    margin: 0,
                  }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: 'var(--space-md)',
            justifyContent: 'center',
          }}>
            <button 
              onClick={upload} 
              disabled={!file || loading}
              className="btn btn-primary"
              style={{
                minWidth: '160px',
              }}
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
                  Analyzing Incident...
                </>
              ) : (
                <>� Analyze for Safety Risks</>
              )}
            </button>
            {file && (
              <button 
                onClick={clearFile}
                className="btn btn-secondary"
              >
                🗑️ Clear
              </button>
            )}
          </div>
        </div>

        {/* Preview Section */}
        {file && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">File Preview</h2>
              <p className="card-description">
                Preview of your selected file
              </p>
            </div>
            
            <div style={{
              textAlign: 'center',
              padding: 'var(--space-lg)',
              backgroundColor: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-lg)',
            }}>
              {preview ? (
                <img 
                  src={preview}
                  alt="Preview"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-md)',
                  }}
                />
              ) : (
                <div style={{
                  padding: 'var(--space-2xl)',
                  color: 'var(--text-muted)',
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🎥</div>
                  <p>Video preview not available</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Section */}
      {result && (
        <div className="card" style={{
          marginTop: 'var(--space-2xl)',
        }}>
          <div className="card-header">
            <h2 className="card-title">🚨 Safety Analysis Results</h2>
            <p className="card-description">
              AI-powered incident detection with risk assessment and safety recommendations
            </p>
          </div>

          {result.error ? (
            <div style={{
              padding: 'var(--space-lg)',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              color: '#dc2626',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-sm)',
              }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <strong style={{ fontSize: '1rem' }}>Analysis Failed</strong>
              </div>
              <p style={{ margin: 0, fontSize: '0.875rem' }}>
                {result.error}
              </p>
            </div>
          ) : (
            <div>
              {/* Safety Analysis Results */}
              {result.safety_analysis && (
                <div style={{
                  marginBottom: 'var(--space-xl)',
                  padding: 'var(--space-lg)',
                  backgroundColor: result.safety_analysis.risk_level === 'critical' ? '#fef2f2' : 
                                   result.safety_analysis.risk_level === 'high' ? '#fef3c7' : '#f0fdf4',
                  border: '2px solid ' + (result.safety_analysis.risk_level === 'critical' ? '#fecaca' : 
                                          result.safety_analysis.risk_level === 'high' ? '#fcd34d' : '#bbf7d0'),
                  borderRadius: 'var(--radius-lg)',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-sm)',
                    marginBottom: 'var(--space-md)',
                  }}>
                    <span style={{ fontSize: '2rem' }}>
                      {result.safety_analysis.risk_level === 'critical' ? '🚨' : 
                       result.safety_analysis.risk_level === 'high' ? '⚠️' : '✅'}
                    </span>
                    <div>
                      <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        margin: 0,
                        color: result.safety_analysis.risk_level === 'critical' ? '#dc2626' : 
                               result.safety_analysis.risk_level === 'high' ? '#d97706' : '#059669',
                        textTransform: 'capitalize',
                      }}>
                        {result.safety_analysis.risk_level} Risk Level
                      </h3>
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        margin: 0,
                      }}>
                        {result.safety_analysis.total_detections} detections analyzed
                      </p>
                    </div>
                  </div>
                  
                  {/* Safety Alerts */}
                  {result.safety_analysis.safety_alerts && result.safety_analysis.safety_alerts.length > 0 && (
                    <div style={{ marginTop: 'var(--space-md)' }}>
                      {result.safety_analysis.safety_alerts.map((alert, index) => (
                        <div key={index} style={{
                          padding: 'var(--space-md)',
                          marginBottom: 'var(--space-sm)',
                          backgroundColor: alert.severity === 'critical' ? 'rgba(220, 38, 38, 0.1)' : 
                                          alert.severity === 'high' ? 'rgba(217, 119, 6, 0.1)' : 'rgba(5, 150, 105, 0.1)',
                          borderRadius: 'var(--radius-md)',
                          borderLeft: '4px solid ' + (alert.severity === 'critical' ? '#dc2626' : 
                                                     alert.severity === 'high' ? '#d97706' : '#059669'),
                        }}>
                          <p style={{
                            fontWeight: '600',
                            margin: '0 0 var(--space-xs) 0',
                            color: 'var(--text-primary)',
                          }}>
                            {alert.message}
                          </p>
                          <p style={{
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)',
                            margin: 0,
                          }}>
                            <strong>Action:</strong> {alert.action}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Detection Summary */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-lg)',
                padding: 'var(--space-lg)',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
              }}>
                <div>
                  {result.analysis_type === 'smoking' && result.classification_result ? (
                    // Special display for smoking classification
                    <>
                      <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        margin: 0,
                        color: result.smoking_detected ? 'var(--color-warning)' : 'var(--color-success)',
                      }}>
                        {result.smoking_detected ? 'SMOKING' : 'NO SMOKING'}
                      </h3>
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        margin: 0,
                      }}>
                        Classification Result
                        {result.detected_objects?.[0]?.confidence && 
                          ` (${Math.round(result.detected_objects[0].confidence * 100)}% confidence)`
                        }
                      </p>
                    </>
                  ) : (
                    // Regular display for object detection
                    <>
                      <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        margin: 0,
                        color: (result.detected_objects?.length || result.safety_analysis?.total_detections || 0) > 0 ? 
                               'var(--color-warning)' : 'var(--color-success)',
                      }}>
                        {result.detected_objects?.length || result.safety_analysis?.total_detections || 0}
                      </h3>
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        margin: 0,
                      }}>
                        {result.analysis_type === 'fire_smoke' ? 'Fire/Smoke Detections' :
                         result.analysis_type === 'combined' ? 'Combined Detections' : 'General Detections'}
                      </p>
                    </>
                  )}
                </div>
                <div style={{ fontSize: '2.5rem', opacity: 0.7 }}>
                  {result.analysis_type === 'fire_smoke' ? '🔥' :
                   result.analysis_type === 'smoking' ? '🚬' :
                   result.analysis_type === 'combined' ? '🛡️' : '🎯'}
                </div>
              </div>

              {/* Analyzed Image */}
              {result.image_url && (
                <div style={{
                  textAlign: 'center',
                  marginBottom: 'var(--space-xl)',
                }}>
                  <h4 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    marginBottom: 'var(--space-md)',
                  }}>
                    Analyzed Image with Detections
                  </h4>
                  <div style={{
                    display: 'inline-block',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-lg)',
                  }}>
                    <img 
                      src={result.image_url} 
                      alt="Analysis Result" 
                      style={{ 
                        maxWidth: '100%',
                        maxHeight: '500px',
                        display: 'block',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Detection List */}
                  {(result.detected_objects || result.general_detection || result.fire_smoke_detection || result.smoking_detection) && (
                <div>
                  <h4 style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    marginBottom: 'var(--space-md)',
                  }}>
                    Detection Summary
                  </h4>
                  
                      {/* Fire/Smoke Detections */}
                      {(result.detected_objects || result.fire_smoke_detection?.detected_objects) && (
                    <div style={{ marginBottom: 'var(--space-lg)' }}>
                      {result.analysis_type === 'fire_smoke' && (
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 'var(--space-xs)',
                          marginBottom: 'var(--space-md)',
                        }}>
                          {result.detected_objects?.map((detection, index) => (
                            <div key={index} style={{
                              padding: '6px 12px',
                              backgroundColor: detection.type === 'fire_smoke' ? '#fef2f2' : 'var(--bg-secondary)',
                              border: `1px solid ${detection.type === 'fire_smoke' ? '#fecaca' : 'var(--border-color)'}`,
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              color: detection.type === 'fire_smoke' ? '#dc2626' : 'var(--text-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}>
                              <span>{detection.type === 'fire_smoke' ? '🔥' : '📍'}</span>
                              {detection.class} ({Math.round(detection.confidence * 100)}%)
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Smoking Classification Results */}
                      {result.analysis_type === 'smoking' && result.detected_objects && (
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                          <h5 style={{
                            fontSize: '1rem',
                            fontWeight: '600',
                            marginBottom: 'var(--space-sm)',
                            color: result.smoking_detected ? '#dc2626' : '#059669',
                          }}>
                            🚬 Smoking Analysis Result
                          </h5>
                          {result.detected_objects.map((detection, index) => (
                            <div key={index} style={{
                              padding: 'var(--space-md)',
                              backgroundColor: detection.is_smoking ? '#fef2f2' : '#f0fdf4',
                              border: `2px solid ${detection.is_smoking ? '#fecaca' : '#bbf7d0'}`,
                              borderRadius: 'var(--radius-md)',
                              marginBottom: 'var(--space-sm)',
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-sm)',
                                marginBottom: 'var(--space-xs)',
                              }}>
                                <span style={{ fontSize: '1.5rem' }}>
                                  {detection.is_smoking ? '🚬' : '✅'}
                                </span>
                                <span style={{
                                  fontSize: '1rem',
                                  fontWeight: '600',
                                  color: detection.is_smoking ? '#dc2626' : '#059669',
                                }}>
                                  {detection.class.toUpperCase()}
                                </span>
                                <span style={{
                                  fontSize: '0.875rem',
                                  color: 'var(--text-muted)',
                                }}>
                                  {Math.round(detection.confidence * 100)}% confidence
                                </span>
                              </div>
                              {detection.probabilities && (
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-secondary)',
                                }}>
                                  <div>Smoking: {Math.round(detection.probabilities.smoking * 100)}%</div>
                                  <div>Non-smoking: {Math.round(detection.probabilities.nonsmoking * 100)}%</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Combined Analysis Results */}
                      {result.analysis_type === 'combined' && (
                        <div>
                          {result.general_detection?.detected_objects?.length > 0 && (
                            <div style={{ marginBottom: 'var(--space-md)' }}>
                              <h5 style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                marginBottom: 'var(--space-sm)',
                                color: 'var(--text-primary)',
                              }}>
                                🎯 General Detections
                              </h5>
                              <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 'var(--space-xs)',
                              }}>
                                {result.general_detection.detected_objects.map((detection, index) => (
                                  <div key={index} style={{
                                    padding: '6px 12px',
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    color: 'var(--text-primary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}>
                                    <span>📍</span>
                                    {detection.class} ({Math.round(detection.confidence * 100)}%)
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {result.fire_smoke_detection?.detected_objects?.length > 0 && (
                            <div style={{ marginBottom: 'var(--space-md)' }}>
                              <h5 style={{
                                fontSize: '1rem',
                                fontWeight: '600',
                                marginBottom: 'var(--space-sm)',
                                color: '#dc2626',
                              }}>
                                🔥 Fire/Smoke Detections
                              </h5>
                              <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 'var(--space-xs)',
                              }}>
                                {result.fire_smoke_detection.detected_objects.map((detection, index) => (
                                  <div key={index} style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#fef2f2',
                                    border: '2px solid #fecaca',
                                    borderRadius: 'var(--radius-full)',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: '#dc2626',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}>
                                    <span>🚨</span>
                                    {detection.class} ({Math.round(detection.confidence * 100)}%)
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                            {result.smoking_detection?.detected_objects?.length > 0 && (
                              <div style={{ marginBottom: 'var(--space-md)' }}>
                                <h5 style={{
                                  fontSize: '1rem',
                                  fontWeight: '600',
                                  marginBottom: 'var(--space-sm)',
                                  color: '#0f172a',
                                }}>
                                  🚬 Smoking Detections
                                </h5>
                                <div style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: 'var(--space-xs)',
                                }}>
                                  {result.smoking_detection.detected_objects.map((detection, index) => (
                                    <div key={index} style={{
                                      padding: '6px 12px',
                                      backgroundColor: '#f1f5f9',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: 'var(--radius-full)',
                                      fontSize: '0.75rem',
                                      fontWeight: '500',
                                      color: 'var(--text-primary)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}>
                                      <span>🚬</span>
                                      {detection.class} ({Math.round(detection.confidence * 100)}%)
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detailed Results */}
                  <details style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-md)',
                  }}>
                    <summary style={{
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      color: 'var(--text-primary)',
                      marginBottom: 'var(--space-sm)',
                    }}>
                      📊 Detailed Detection Data
                    </summary>
                    <pre style={{
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-sm)',
                      padding: 'var(--space-md)',
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-family-mono)',
                      overflow: 'auto',
                      margin: 0,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                    }}>
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Loading Animation CSS */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Upload;
