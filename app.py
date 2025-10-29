import os
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
from werkzeug.utils import secure_filename
from threading import Thread
import cv2
from ultralytics import YOLO
from config import Config

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, origins=Config.CORS_ORIGINS)

UPLOAD_FOLDER = Config.UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "mp4", "avi", "mov", "mkv", "webm"}

general_model = None
fire_smoke_model = None
smoking_model = None
accident_model = None

camera = None
running = False
current_camera_id = 0
alert_history = []
recording = False

current_incidents = {}
incident_cooldown = 10
last_detection_time = {}
frame_skip_counter = 0

def get_general_model():
    global general_model
    if general_model is None:
        general_model = YOLO(Config.MODEL_PATH)
    return general_model

def get_fire_smoke_model():
    global fire_smoke_model
    if fire_smoke_model is None:
        fire_smoke_model = YOLO(Config.FIRE_SMOKE_MODEL_PATH)
    return fire_smoke_model

def get_smoking_model():
    """Lazy load smoking detection model"""
    global smoking_model
    if smoking_model is None:
        smoking_model = YOLO(Config.SMOKING_MODEL_PATH)
    return smoking_model

def get_accident_model():
    global accident_model
    if accident_model is None:
        accident_model = YOLO(Config.ACCIDENT_MODEL_PATH)
    return accident_model

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def is_video_file(filename):
    video_extensions = {"mp4", "avi", "mov", "mkv", "webm"}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in video_extensions

def extract_frames_from_video(video_path, max_frames=15, target_fps=12):
    frames = []
    
    try:
        cap = cv2.VideoCapture(video_path)
        
        if not cap.isOpened():
            print(f"Error: Could not open video {video_path}")
            return frames
            
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        video_fps = cap.get(cv2.CAP_PROP_FPS)
        duration = total_frames / video_fps if video_fps > 0 else 0
        
        print(f"Video info: {total_frames} frames, {video_fps} fps, {duration:.1f}s duration")
        
        frame_interval = max(1, int(video_fps / target_fps)) if video_fps > 0 else 1
        print(f"Extracting at {target_fps} fps (every {frame_interval} frames)")
        
        frame_count = 0
        extracted_count = 0
        
        while extracted_count < max_frames and cap.isOpened():
            ret, frame = cap.read()
            
            if not ret:
                break
                
            if frame_count % frame_interval == 0:
                height, width = frame.shape[:2]
                if width > 1280:
                    scale = 1280 / width
                    new_width = 1280
                    new_height = int(height * scale)
                    frame = cv2.resize(frame, (new_width, new_height))
                
                frames.append(frame)
                extracted_count += 1
                timestamp = frame_count / video_fps if video_fps > 0 else frame_count * 0.033
                print(f"Extracted frame {extracted_count} at {timestamp:.1f}s (position {frame_count})")
                
            frame_count += 1
            
        cap.release()
        print(f"Successfully extracted {len(frames)} frames from video at ~{target_fps} fps")
        
    except Exception as e:
        print(f"Error extracting frames from video: {e}")
        
    return frames

def detect_general_objects(image_path):
    model = get_general_model()
    results = model(image_path)
    detections = []
    for r in results:
        if r.boxes is not None:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0]
                conf = box.conf[0].item()
                cls = model.names[int(box.cls[0])]
                if conf >= Config.DETECTION_CONFIDENCE_THRESHOLD:
                    detections.append({
                        'bbox': [x1.item(), y1.item(), x2.item(), y2.item()], 
                        'confidence': conf, 
                        'class': cls,
                        'type': 'general'
                    })
    return {'detected_objects': detections}

def detect_fire_smoke(image_path):
    model = get_fire_smoke_model()
    results = model(image_path)
    detections = []
    fire_detected = False
    smoke_detected = False
    
    for r in results:
        if r.boxes is not None:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0]
                conf = box.conf[0].item()
                cls_id = int(box.cls[0])
                
                # Based on your model: {0: '0', 1: 'fire'}
                if cls_id == 0:
                    cls_name = 'smoke'
                    smoke_detected = True
                elif cls_id == 1:
                    cls_name = 'fire'
                    fire_detected = True
                else:
                    cls_name = f'unknown_class_{cls_id}'
                
                if conf >= Config.FIRE_SMOKE_CONFIDENCE_THRESHOLD:
                    detections.append({
                        'bbox': [x1.item(), y1.item(), x2.item(), y2.item()], 
                        'confidence': conf, 
                        'class': cls_name,
                        'type': 'fire_smoke',
                        'raw_class_id': cls_id
                    })
    
    return {
        'detected_objects': detections,
        'fire_detected': fire_detected,
        'smoke_detected': smoke_detected
    }

def detect_smoking(image_path):
    """Smoking detection using specialized classification model"""
    model = get_smoking_model()
    
    results = model(image_path, verbose=False)
    detections = []
    smoking_detected = False

    for r in results:
        if hasattr(r, 'probs') and r.probs is not None:
            probs = r.probs.data.cpu().numpy()
            top_class = r.probs.top1
            top_conf = r.probs.top1conf.item()
            
            if top_conf >= Config.SMOKING_CONFIDENCE_THRESHOLD:
                if top_class == 1:
                    smoking_detected = True
                    class_name = 'smoking'
                    confidence = probs[1]
                else:
                    class_name = 'nonsmoking'
                    confidence = probs[0]
                detections.append({
                    'bbox': [0, 0, 100, 100],
                    'confidence': float(confidence),
                    'class': class_name,
                    'type': 'smoking_classification',
                    'raw_class_id': int(top_class),
                    'is_smoking': top_class == 1,
                    'probabilities': {
                        'nonsmoking': float(probs[0]),
                        'smoking': float(probs[1])
                    }
                })

    return {
        'detected_objects': detections,
        'smoking_detected': smoking_detected,
        'total_detections': len(detections),
        'classification_result': True
    }

def detect_accidents(image_path):
    model = get_accident_model()
    
    results = model(image_path, verbose=False)
    detections = []
    accident_detected = False

    for r in results:
        if hasattr(r, 'boxes') and r.boxes is not None:
            boxes = r.boxes
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                
                label = model.names[cls] if hasattr(model, 'names') else f"class_{cls}"
                
                if conf >= Config.ACCIDENT_CONFIDENCE_THRESHOLD:
                    if label.lower() in ['accident'] or cls == 0:
                        accident_detected = True
                        
                        detections.append({
                            'bbox': [int(x1), int(y1), int(x2), int(y2)],
                            'confidence': float(conf),
                            'class': 'accident',
                            'type': 'accident_detection',
                            'raw_class_id': int(cls),
                            'is_accident': True,
                            'label': label
                        })
                    else:
                        # This is "No-Accident" detection - we can still add it but don't flag as accident
                        detections.append({
                            'bbox': [int(x1), int(y1), int(x2), int(y2)],
                            'confidence': float(conf),
                            'class': 'no-accident',
                            'type': 'accident_detection',
                            'raw_class_id': int(cls),
                            'is_accident': False,
                            'label': label
                        })

    return {
        'detected_objects': detections,
        'accident_detected': accident_detected,
        'total_detections': len([d for d in detections if d['is_accident']]),  # Only count actual accidents
        'classification_result': False  # This is detection, not classification
    }

def detect_objects_in_video(video_path, detection_type='general'):
    
    frames = extract_frames_from_video(video_path)
    
    if not frames:
        return {
            'detected_objects': [],
            'total_detections': 0,
            'frames_analyzed': 0,
            'video_analysis': True,
            'error': 'No frames could be extracted from video'
        }
    
    all_detections = []
    frame_results = []
    
    fire_detected = False
    smoke_detected = False
    smoking_detected = False
    accident_detected = False
    
    for i, frame in enumerate(frames):
        temp_frame_path = os.path.join(UPLOAD_FOLDER, f"temp_frame_{i}.jpg")
        
        try:
            cv2.imwrite(temp_frame_path, frame)
            
            if detection_type == 'fire_smoke':
                frame_result = detect_fire_smoke(temp_frame_path)
                if frame_result['fire_detected']:
                    fire_detected = True
                if frame_result['smoke_detected']:
                    smoke_detected = True
                    
            elif detection_type == 'smoking':
                frame_result = detect_smoking(temp_frame_path)
                if frame_result['smoking_detected']:
                    smoking_detected = True
                    
            elif detection_type == 'accident':
                frame_result = detect_accidents(temp_frame_path)
                if frame_result['accident_detected']:
                    accident_detected = True
                    
            else:
                frame_result = detect_general_objects(temp_frame_path)
            
            for detection in frame_result['detected_objects']:
                detection['frame_number'] = i + 1
                detection['timestamp'] = f"{i * 1.0:.1f}s"
                
            all_detections.extend(frame_result['detected_objects'])
            frame_results.append({
                'frame_number': i + 1,
                'detections': len(frame_result['detected_objects']),
                'timestamp': f"{i * 1.0:.1f}s"
            })
            
            os.remove(temp_frame_path)
            
        except Exception as e:
            print(f"Error processing frame {i}: {e}")
            if os.path.exists(temp_frame_path):
                os.remove(temp_frame_path)
            continue
    
    # Compile results
    result = {
        'detected_objects': all_detections,
        'total_detections': len(all_detections),
        'frames_analyzed': len(frames),
        'frame_results': frame_results,
        'video_analysis': True
    }
    
    if detection_type == 'fire_smoke':
        result.update({
            'fire_detected': fire_detected,
            'smoke_detected': smoke_detected
        })
    elif detection_type == 'smoking':
        result.update({
            'smoking_detected': smoking_detected,
            'classification_result': True
        })
    elif detection_type == 'accident':
        result.update({
            'accident_detected': accident_detected,
            'classification_result': True
        })
    
    return result

def analyze_safety_risks(detections, fire_detected=False, smoke_detected=False, smoking_detected=False, accident_detected=False):
    risk_level = 'low'
    safety_alerts = []
    
    if fire_detected:
        risk_level = 'critical'
        safety_alerts.append({
            'type': 'fire',
            'message': '🔥 FIRE DETECTED - Immediate evacuation required!',
            'severity': 'critical',
            'action': 'Alert fire department and evacuate area immediately'
        })
    
    if smoke_detected:
        risk_level = 'high' if risk_level != 'critical' else 'critical'
        safety_alerts.append({
            'type': 'smoke',
            'message': '💨 SMOKE DETECTED - Potential fire hazard!',
            'severity': 'high',
            'action': 'Investigate source and prepare for evacuation'
        })
    
    if smoking_detected:
        risk_level = 'high' if risk_level == 'low' else risk_level
        safety_alerts.append({
            'type': 'smoking',
            'message': '🚬 SMOKING VIOLATION - No-smoking policy breach detected!',
            'severity': 'high',
            'action': 'Alert security - smoking violation requires immediate intervention'
        })
    
    if accident_detected:
        risk_level = 'critical'
        safety_alerts.append({
            'type': 'accident',
            'message': '🚨 ACCIDENT DETECTED - Emergency response required!',
            'severity': 'critical',
            'action': 'Alert emergency services and medical personnel immediately'
        })
    
    # Check for other safety risks
    dangerous_objects = ['knife', 'gun', 'weapon']
    for detection in detections:
        if any(danger in detection['class'].lower() for danger in dangerous_objects):
            risk_level = 'high' if risk_level == 'low' else risk_level
            safety_alerts.append({
                'type': 'weapon',
                'message': f'⚠️ WEAPON DETECTED - {detection["class"]} identified',
                'severity': 'high',
                'action': 'Security alert - investigate immediately'
            })
    
    return {
        'risk_level': risk_level,
        'safety_alerts': safety_alerts,
        'total_detections': len(detections),
        'fire_detected': fire_detected,
        'smoke_detected': smoke_detected,
        'smoking_detected': smoking_detected
    }

# Live Monitoring Functions
def detect_available_cameras():
    """Detect available cameras on the system"""
    cameras = []
    
    # Check for local cameras (webcam, USB cameras)
    for i in range(10):  # Check first 10 camera indices
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                # Get camera info
                width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                fps = int(cap.get(cv2.CAP_PROP_FPS))
                
                cameras.append({
                    'id': i,
                    'name': f'Camera {i}',
                    'type': 'local',
                    'resolution': f'{width}x{height}',
                    'fps': fps,
                    'status': 'available'
                })
            cap.release()
    
    # Add common IP camera options
    ip_cameras = [
        {'id': 'ip_1', 'name': 'IP Camera 1', 'type': 'ip', 'url': 'rtsp://admin:password@192.168.1.100:554/stream'},
        {'id': 'ip_2', 'name': 'IP Camera 2', 'type': 'ip', 'url': 'http://192.168.1.101:8080/video'},
    ]
    
    return cameras + ip_cameras

def process_frame_detections(frame):
    import tempfile
    import time
    
    temp_path = f"temp_frame_{int(time.time() * 1000)}.jpg"
    cv2.imwrite(temp_path, frame)
    
    try:
        print(f"🔍 Running AI detection on frame: {temp_path}")
        
        print("🔥 Running fire/smoke detection...")
        fire_smoke_results = detect_fire_smoke(temp_path)
        print(f"   Fire: {fire_smoke_results.get('fire_detected', False)}, Smoke: {fire_smoke_results.get('smoke_detected', False)}")
        
        print("🚬 Running smoking detection...")
        smoking_results = detect_smoking(temp_path)
        print(f"   Smoking: {smoking_results.get('smoking_detected', False)}")
        
        print("🚨 Running accident detection...")
        accident_results = detect_accidents(temp_path)
        print(f"   Accident: {accident_results.get('accident_detected', False)}")
        
        all_detections = (fire_smoke_results['detected_objects'] + 
                         smoking_results['detected_objects'] +
                         accident_results['detected_objects'])
        
        print(f"📊 Total detections found: {len(all_detections)}")
        
        safety_analysis = analyze_safety_risks(
            all_detections,
            fire_smoke_results['fire_detected'],
            fire_smoke_results['smoke_detected'],
            smoking_results['smoking_detected'],
            accident_results['accident_detected']
        )
        incident_data = process_smart_incidents({
            'fire_detected': fire_smoke_results['fire_detected'],
            'smoke_detected': fire_smoke_results['smoke_detected'],
            'smoking_detected': smoking_results['smoking_detected'],
            'accident_detected': accident_results['accident_detected']
        })
        
        print(f"🚨 Active incidents: {incident_data.get('total_active', 0)}")
        
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return {
            'detections': all_detections,
            'safety_analysis': safety_analysis,
            'fire_detected': fire_smoke_results['fire_detected'],
            'smoke_detected': fire_smoke_results['smoke_detected'],
            'smoking_detected': smoking_results['smoking_detected'],
            'accident_detected': accident_results['accident_detected'],
            'incident_data': incident_data,
            'total_detections': len(all_detections)
        }
        
    except Exception as e:
        print(f"❌ Error in frame detection: {e}")
        import traceback
        traceback.print_exc()
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return None

def process_smart_incidents(detection_results):
    """
    Process detections to create smart incidents that prevent duplicate alerts
    and can combine multiple violations into single incidents
    """
    global current_incidents, last_detection_time, incident_cooldown
    import time
    
    current_time = time.time()
    incident_updates = []
    
    # Define detection types to monitor
    detection_types = {
        'fire': detection_results.get('fire_detected', False),
        'smoke': detection_results.get('smoke_detected', False),
        'smoking': detection_results.get('smoking_detected', False),
        'accident': detection_results.get('accident_detected', False)
    }
    
    active_violations = [dtype for dtype, detected in detection_types.items() if detected]
    
    if active_violations:
        incident_id = '+'.join(sorted(active_violations))
        
        last_time = last_detection_time.get(incident_id, 0)
        time_since_last = current_time - last_time
        
        if incident_id not in current_incidents and time_since_last >= incident_cooldown:
            current_incidents[incident_id] = {
                'id': incident_id,
                'violations': active_violations,
                'start_time': current_time,
                'last_seen': current_time,
                'alert_sent': False,
                'severity': get_incident_severity(active_violations)
            }
            
            alert_data = create_incident_alert(current_incidents[incident_id])
            add_alert_to_history(alert_data)
            
            last_detection_time[incident_id] = current_time
            incident_updates.append(f"New incident: {incident_id}")
            
        elif incident_id in current_incidents:
            current_incidents[incident_id]['last_seen'] = current_time
            incident_updates.append(f"Ongoing incident: {incident_id}")
    
    incidents_to_remove = []
    for incident_id, incident in current_incidents.items():
        if current_time - incident['last_seen'] > 5:
            incidents_to_remove.append(incident_id)
            incident_updates.append(f"Resolved incident: {incident_id}")
    
    for incident_id in incidents_to_remove:
        del current_incidents[incident_id]
    
    return {
        'active_incidents': list(current_incidents.keys()),
        'incident_updates': incident_updates,
        'total_active': len(current_incidents)
    }

def get_incident_severity(violations):
    if 'fire' in violations or 'accident' in violations:
        return 'critical'
    elif 'smoke' in violations:
        return 'high'
    elif 'smoking' in violations:
        return 'medium'
    else:
        return 'low'

def create_incident_alert(incident):
    """Create alert data for an incident"""
    violation_messages = {
        'fire': '🔥 FIRE DETECTED',
        'smoke': '💨 SMOKE DETECTED', 
        'smoking': '🚬 SMOKING VIOLATION',
        'accident': '🚨 ACCIDENT DETECTED'
    }
    
    violation_list = [violation_messages.get(v, v.upper()) for v in incident['violations']]
    
    if len(violation_list) == 1:
        message = f"{violation_list[0]} - Immediate attention required!"
    else:
        message = f"MULTIPLE VIOLATIONS: {' + '.join(violation_list)} - Critical situation!"
    
    return {
        'type': 'live_incident',
        'incident_id': incident['id'],
        'violations': incident['violations'],
        'message': message,
        'severity': incident['severity'],
        'timestamp': incident['start_time']
    }

def draw_detections_on_frame(frame, detections):
    """Draw detection boxes and labels on frame"""
    for detection in detections:
        if 'bbox' in detection and len(detection['bbox']) == 4:
            x1, y1, x2, y2 = detection['bbox']
            
            # Convert percentage to pixel coordinates if needed
            if x2 <= 100 and y2 <= 100:  # Assuming percentage format
                h, w = frame.shape[:2]
                x1, y1, x2, y2 = int(x1*w/100), int(y1*h/100), int(x2*w/100), int(y2*h/100)
            else:
                x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
            
            # Choose color based on detection type
            if detection.get('type') == 'fire_smoke':
                color = (0, 0, 255) if 'fire' in detection['class'] else (0, 165, 255)  # Red for fire, orange for smoke
            elif detection.get('type') == 'smoking_classification':
                color = (0, 100, 255) if detection.get('is_smoking') else (0, 255, 0)  # Orange for smoking, green for no smoking
            elif detection.get('type') == 'accident_detection':
                # Red for accidents, green for no-accidents (following demo script logic)
                color = (0, 0, 255) if detection.get('is_accident', False) else (0, 255, 0)
            else:
                color = (255, 0, 0)  # Blue for general detections
            
            # Draw bounding box
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            
            # Draw label
            label = f"{detection['class']} ({detection['confidence']:.2f})"
            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
            cv2.rectangle(frame, (x1, y1 - label_size[1] - 10), (x1 + label_size[0], y1), color, -1)
            cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
    
    return frame

def add_alert_to_history(alert_data):
    """Add alert to history with timestamp"""
    global alert_history
    import datetime
    
    alert_data['timestamp'] = datetime.datetime.now().isoformat()
    alert_history.append(alert_data)
    
    # Keep only last 100 alerts
    if len(alert_history) > 100:
        alert_history = alert_history[-100:]

def generate_video_stream():
    """Generate video frames for streaming with smart AI detection"""
    global camera, running, frame_skip_counter
    
    while running and camera is not None:
        ret, frame = camera.read()
        if not ret:
            print("Failed to read frame from camera")
            break
        
        # Process AI detection every 15 frames (~0.5 seconds at 30fps) for performance
        detection_results = None
        frame_skip_counter += 1
        
        if frame_skip_counter >= 15:
            frame_skip_counter = 0
            print("🔍 Processing frame for AI detection...")
            try:
                detection_results = process_frame_detections(frame)
                if detection_results:
                    print(f"✅ Detection results: {detection_results.get('total_detections', 0)} detections")
                    if detection_results.get('fire_detected'):
                        print("🔥 FIRE DETECTED!")
                    if detection_results.get('smoke_detected'):
                        print("💨 SMOKE DETECTED!")
                    if detection_results.get('smoking_detected'):
                        print("🚬 SMOKING DETECTED!")
                    if detection_results.get('accident_detected'):
                        print("🚨 ACCIDENT DETECTED!")
                else:
                    print("❌ Detection processing returned None")
            except Exception as e:
                print(f"❌ Error in detection processing: {e}")
                detection_results = None
        
        # Draw detection results if available
        if detection_results and detection_results['detections']:
            frame = draw_detections_on_frame(frame, detection_results['detections'])
        
        # Add status overlay with incident information
        status_color = (0, 255, 0)  # Green by default
        incident_text = ""
        
        if detection_results and detection_results.get('incident_data'):
            incident_data = detection_results['incident_data']
            if incident_data['active_incidents']:
                status_color = (0, 0, 255)  # Red for incidents
                incident_text = f" | INCIDENTS: {', '.join(incident_data['active_incidents']).upper()}"
        
        status_text = f"LIVE - ProActive Vision{incident_text}"
        cv2.putText(frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, status_color, 2)
        
        # Add detection count if available
        if detection_results:
            detection_count = detection_results.get('total_detections', 0)
            if detection_count > 0:
                count_text = f"Detections: {detection_count}"
                cv2.putText(frame, count_text, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
        
        # Add timestamp
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(frame, timestamp, (10, frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        # Encode frame
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if ret:
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        else:
            print("Failed to encode frame")
        
        # Small delay to prevent overwhelming the stream
        import time
        time.sleep(0.033)  # ~30 FPS

@app.route('/')
def index():
    return "ProActive Vision Backend Running"

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    analysis_type = request.form.get('analysis_type', 'general')
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        try:
            response_data = {
                'message': 'File uploaded and processed successfully',
                'filename': filename,
                'analysis_type': analysis_type,
                'is_video': is_video_file(filename)
            }
            
            if is_video_file(filename):
                if analysis_type == 'fire_smoke':
                    video_results = detect_objects_in_video(filepath, 'fire_smoke')
                    response_data.update(video_results)
                    
                    safety_analysis = analyze_safety_risks(
                        video_results['detected_objects'],
                        video_results.get('fire_detected', False),
                        video_results.get('smoke_detected', False)
                    )
                    response_data['safety_analysis'] = safety_analysis
                    
                elif analysis_type == 'smoking':
                    video_results = detect_objects_in_video(filepath, 'smoking')
                    response_data.update(video_results)
                    
                    safety_analysis = analyze_safety_risks(
                        video_results['detected_objects'],
                        fire_detected=False,
                        smoke_detected=False,
                        smoking_detected=video_results.get('smoking_detected', False)
                    )
                    response_data['safety_analysis'] = safety_analysis
                    
                elif analysis_type == 'accident':
                    video_results = detect_objects_in_video(filepath, 'accident')
                    response_data.update(video_results)
                    
                    # Analyze safety risks
                    safety_analysis = analyze_safety_risks(
                        video_results['detected_objects'],
                        fire_detected=False,
                        smoke_detected=False,
                        smoking_detected=False,
                        accident_detected=video_results.get('accident_detected', False)
                    )
                    response_data['safety_analysis'] = safety_analysis
                    
                elif analysis_type == 'general':
                    video_results = detect_objects_in_video(filepath, 'general')
                    response_data.update(video_results)
                    
                else:
                    # Combined analysis for video
                    fire_smoke_results = detect_objects_in_video(filepath, 'fire_smoke')
                    smoking_results = detect_objects_in_video(filepath, 'smoking')
                    accident_results = detect_objects_in_video(filepath, 'accident')
                    
                    all_detections = (fire_smoke_results['detected_objects'] + 
                                    smoking_results['detected_objects'] +
                                    accident_results['detected_objects'])
                    safety_analysis = analyze_safety_risks(
                        all_detections,
                        fire_smoke_results.get('fire_detected', False),
                        fire_smoke_results.get('smoke_detected', False),
                        smoking_results.get('smoking_detected', False),
                        accident_results.get('accident_detected', False)
                    )
                    
                    response_data.update({
                        'fire_smoke_detection': fire_smoke_results,
                        'smoking_detection': smoking_results,
                        'accident_detection': accident_results,
                        'safety_analysis': safety_analysis,
                        'detected_objects': all_detections,
                        'total_detections': len(all_detections),
                        'frames_analyzed': max(
                            fire_smoke_results.get('frames_analyzed', 0),
                            smoking_results.get('frames_analyzed', 0),
                            accident_results.get('frames_analyzed', 0)
                        )
                    })
            else:
                # Image processing (existing logic)
                if analysis_type == 'fire_smoke':
                    # Fire/smoke specific detection
                    fire_smoke_results = detect_fire_smoke(filepath)
                    response_data.update(fire_smoke_results)
                    
                    # Analyze safety risks
                    safety_analysis = analyze_safety_risks(
                        fire_smoke_results['detected_objects'],
                        fire_smoke_results['fire_detected'],
                        fire_smoke_results['smoke_detected']
                    )
                    response_data['safety_analysis'] = safety_analysis
                    
                elif analysis_type == 'smoking':
                    # Smoking specific detection
                    smoking_results = detect_smoking(filepath)
                    response_data.update(smoking_results)
                    
                    # Analyze safety risks
                    safety_analysis = analyze_safety_risks(
                        smoking_results['detected_objects'],
                        fire_detected=False,
                        smoke_detected=False,
                        smoking_detected=smoking_results['smoking_detected']
                    )
                    response_data['safety_analysis'] = safety_analysis
                    
                elif analysis_type == 'accident':
                    # Accident specific detection
                    accident_results = detect_accidents(filepath)
                    response_data.update(accident_results)
                    
                    # Analyze safety risks
                    safety_analysis = analyze_safety_risks(
                        accident_results['detected_objects'],
                        fire_detected=False,
                        smoke_detected=False,
                        smoking_detected=False,
                        accident_detected=accident_results['accident_detected']
                    )
                    response_data['safety_analysis'] = safety_analysis
                    
                elif analysis_type == 'general':
                    # General object detection
                    general_results = detect_general_objects(filepath)
                    response_data.update(general_results)
                    
                else:
                    # Combined analysis - now focused on safety-critical detections only
                    fire_smoke_results = detect_fire_smoke(filepath)
                    smoking_results = detect_smoking(filepath)
                    accident_results = detect_accidents(filepath)
                    
                    all_detections = (fire_smoke_results['detected_objects'] + 
                                    smoking_results['detected_objects'] +
                                    accident_results['detected_objects'])
                    safety_analysis = analyze_safety_risks(
                        all_detections,
                        fire_smoke_results['fire_detected'],
                        fire_smoke_results['smoke_detected'],
                        smoking_results['smoking_detected'],
                        accident_results['accident_detected']
                    )
                    
                    response_data.update({
                        'fire_smoke_detection': fire_smoke_results,
                        'smoking_detection': smoking_results,
                        'accident_detection': accident_results,
                        'safety_analysis': safety_analysis
                    })
            
            return jsonify(response_data)
        
        except Exception as e:
            return jsonify({'error': f'Processing failed: {str(e)}'}), 500
    
    return jsonify({'error': 'Invalid file type'}), 400

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/model-status')
def model_status():
    try:
        general = get_general_model()
        fire_smoke = get_fire_smoke_model()
        smoking = get_smoking_model()
        return jsonify({
            'general_model': 'yolov8n',
            'fire_smoke_model': 'fire_smoke_detection',
            'smoking_model': 'smoking_detection',
            'device': str(general.device),
            'fire_smoke_device': str(fire_smoke.device),
            'smoking_device': str(smoking.device),
            'status': 'loaded'
        })
    except Exception as e:
        return jsonify({
            'error': f'Model loading failed: {str(e)}',
            'status': 'error'
        }), 500

@app.route('/api/fire-smoke-detection', methods=['POST'])
def fire_smoke_detection():
    """Dedicated endpoint for fire/smoke detection"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '' or not file or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file'}), 400
    
    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Perform fire/smoke detection
        fire_smoke_results = detect_fire_smoke(filepath)
        
        # Analyze safety risks
        safety_analysis = analyze_safety_risks(
            fire_smoke_results['detected_objects'],
            fire_smoke_results['fire_detected'],
            fire_smoke_results['smoke_detected']
        )
        
        return jsonify({
            'message': 'Fire/smoke analysis completed',
            'filename': filename,
            'analysis_type': 'fire_smoke',
            **fire_smoke_results,
            'safety_analysis': safety_analysis
        })
        
    except Exception as e:
        return jsonify({'error': f'Fire/smoke detection failed: {str(e)}'}), 500


@app.route('/api/smoking-detection', methods=['POST'])
def smoking_detection():
    """Dedicated endpoint for smoking detection"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '' or not file or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file'}), 400

    try:
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        smoking_results = detect_smoking(filepath)

        safety_analysis = analyze_safety_risks(
            smoking_results['detected_objects'],
            fire_detected=False,
            smoke_detected=False,
            smoking_detected=smoking_results['smoking_detected']
        )

        return jsonify({
            'message': 'Smoking analysis completed',
            'filename': filename,
            'analysis_type': 'smoking',
            **smoking_results,
            'safety_analysis': safety_analysis
        })

    except Exception as e:
        return jsonify({'error': f'Smoking detection failed: {str(e)}'}), 500

@app.route('/api/test-model', methods=['GET'])
def test_model():
    """Test endpoint to verify model loading and classes"""
    try:
        general = get_general_model()
        fire_smoke = get_fire_smoke_model()
        smoking = get_smoking_model()
        return jsonify({
            'general_model': {
                'path': Config.MODEL_PATH,
                'classes': general.names,
                'device': str(general.device)
            },
            'fire_smoke_model': {
                'path': Config.FIRE_SMOKE_MODEL_PATH,
                'classes': fire_smoke.names,
                'device': str(fire_smoke.device),
                'mapped_classes': {0: 'smoke', 1: 'fire'}
            }
            ,
            'smoking_model': {
                'path': Config.SMOKING_MODEL_PATH,
                'classes': smoking.names,
                'device': str(smoking.device),
                'mapped_classes': {0: 'nonsmoking', 1: 'smoking'},
                'confidence_threshold': Config.SMOKING_CONFIDENCE_THRESHOLD
            }
        })
    except Exception as e:
        return jsonify({'error': f'Model test failed: {str(e)}'}), 500

# Live Monitoring API Endpoints
@app.route('/api/cameras', methods=['GET'])
def get_cameras():
    """Get list of available cameras"""
    try:
        cameras = detect_available_cameras()
        return jsonify({
            'cameras': cameras,
            'current_camera': current_camera_id,
            'streaming': running
        })
    except Exception as e:
        return jsonify({'error': f'Failed to detect cameras: {str(e)}'}), 500

@app.route('/api/camera/start', methods=['POST'])
def start_camera():
    """Start camera streaming"""
    global camera, running, current_camera_id
    
    try:
        data = request.get_json()
        camera_id = data.get('camera_id', 0)
        camera_url = data.get('camera_url', None)
        
        # Stop existing camera if running
        if running:
            stop_camera_internal()
        
        # Start new camera
        if camera_url:  # IP camera
            camera = cv2.VideoCapture(camera_url)
        else:  # Local camera
            camera = cv2.VideoCapture(int(camera_id))
        
        if not camera.isOpened():
            return jsonify({'error': 'Failed to open camera'}), 400
        
        current_camera_id = camera_id
        running = True
        
        return jsonify({
            'message': 'Camera started successfully',
            'camera_id': camera_id,
            'streaming': True
        })
        
    except Exception as e:
        return jsonify({'error': f'Failed to start camera: {str(e)}'}), 500

@app.route('/api/camera/stop', methods=['POST'])
def stop_camera():
    """Stop camera streaming"""
    try:
        stop_camera_internal()
        return jsonify({
            'message': 'Camera stopped successfully',
            'streaming': False
        })
    except Exception as e:
        return jsonify({'error': f'Failed to stop camera: {str(e)}'}), 500

def stop_camera_internal():
    """Internal function to stop camera"""
    global camera, running
    running = False
    if camera is not None:
        camera.release()
        camera = None

@app.route('/api/video-feed')
def video_feed():
    """Video streaming route"""
    global running
    if not running or camera is None:
        return jsonify({'error': 'No camera is currently running'}), 400
    
    response = Response(generate_video_stream(),
                       mimetype='multipart/x-mixed-replace; boundary=frame')
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/api/video-frame')
def video_frame():
    """Get a single video frame as JPEG with AI detection - more browser compatible"""
    global running, camera, frame_skip_counter
    if not running or camera is None:
        return jsonify({'error': 'No camera is currently running'}), 400
    
    try:
        ret, frame = camera.read()
        if not ret:
            return jsonify({'error': 'Failed to capture frame'}), 500
        
        # Process AI detection every 15 frames (~0.5 seconds at 30fps) for performance
        detection_results = None
        frame_skip_counter += 1
        
        if frame_skip_counter >= 15:
            frame_skip_counter = 0
            print("🔍 Processing frame for AI detection...")
            try:
                detection_results = process_frame_detections(frame)
                if detection_results:
                    print(f"✅ Detection results: {detection_results.get('total_detections', 0)} detections")
                    if detection_results.get('fire_detected'):
                        print("🔥 FIRE DETECTED!")
                    if detection_results.get('smoke_detected'):
                        print("💨 SMOKE DETECTED!")
                    if detection_results.get('smoking_detected'):
                        print("🚬 SMOKING DETECTED!")
                    if detection_results.get('accident_detected'):
                        print("🚨 ACCIDENT DETECTED!")
                else:
                    print("❌ Detection processing returned None")
            except Exception as e:
                print(f"❌ Error in detection processing: {e}")
                detection_results = None
        
        # Draw detection results if available
        detections_to_draw = detection_results['detections'] if detection_results and detection_results['detections'] else []
        frame_with_detections = draw_detections_on_frame(frame, detections_to_draw)
        
        # Add status overlay with incident information
        status_color = (0, 255, 0)  # Green by default
        incident_text = ""
        
        if detection_results and detection_results.get('incident_data'):
            incident_data = detection_results['incident_data']
            if incident_data['active_incidents']:
                status_color = (0, 0, 255)  # Red for incidents
                incident_text = f" | INCIDENTS: {', '.join(incident_data['active_incidents']).upper()}"
        
        status_text = f"LIVE - ProActive Vision{incident_text}"
        cv2.putText(frame_with_detections, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, status_color, 2)
        
        # Add detection count if available
        if detection_results:
            detection_count = detection_results.get('total_detections', 0)
            if detection_count > 0:
                count_text = f"Detections: {detection_count}"
                cv2.putText(frame_with_detections, count_text, (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 2)
        
        # Add timestamp
        import datetime
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(frame_with_detections, timestamp, (10, frame_with_detections.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        
        ret, buffer = cv2.imencode('.jpg', frame_with_detections, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if not ret:
            return jsonify({'error': 'Failed to encode frame'}), 500
        
        response = Response(buffer.tobytes(), mimetype='image/jpeg')
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
        
    except Exception as e:
        return jsonify({'error': f'Error capturing frame: {str(e)}'}), 500

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    global alert_history
    limit = request.args.get('limit', 50, type=int)
    return jsonify({
        'alerts': alert_history[-limit:],
        'total_alerts': len(alert_history)
    })

@app.route('/api/alerts/clear', methods=['POST'])
def clear_alerts():
    global alert_history
    alert_history = []
    return jsonify({'message': 'Alerts cleared successfully'})

@app.route('/api/incidents/status', methods=['GET'])
def get_incident_status():
    global current_incidents, last_detection_time
    import time
    
    current_time = time.time()
    
    incidents_details = []
    for incident_id, incident in current_incidents.items():
        duration = current_time - incident['start_time']
        time_since_seen = current_time - incident['last_seen']
        
        incidents_details.append({
            'id': incident_id,
            'violations': incident['violations'],
            'severity': incident['severity'],
            'duration': round(duration, 1),
            'last_seen': round(time_since_seen, 1),
            'status': 'active' if time_since_seen < 5 else 'resolving'
        })
    
    return jsonify({
        'total_active_incidents': len(current_incidents),
        'incidents': incidents_details,
        'system_status': 'monitoring' if running else 'stopped',
        'detection_enabled': True,
        'last_check': current_time
    })

@app.route('/api/camera/status', methods=['GET'])
def camera_status():
    global camera, running, current_camera_id
    
    status = {
        'streaming': running,
        'current_camera': current_camera_id,
        'camera_connected': camera is not None and camera.isOpened() if camera else False,
        'alerts_count': len(alert_history)
    }
    
    if running and camera is not None:
        width = int(camera.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(camera.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(camera.get(cv2.CAP_PROP_FPS))
        
        status.update({
            'resolution': f'{width}x{height}',
            'fps': fps
        })
    
    return jsonify(status)

if __name__ == '__main__':
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
