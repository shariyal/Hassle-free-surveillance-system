import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'secret-key-here'
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    MAX_CONTENT_LENGTH = 200 * 1024 * 1024
    
    MODEL_PATH = 'models/weights/yolov8n.pt'
    FIRE_SMOKE_MODEL_PATH = 'models/weights/fire_smoke/best.pt'
    SMOKING_MODEL_PATH = 'models/weights/smoking/best.pt'
    ACCIDENT_MODEL_PATH = 'models/weights/accident/123.pt'
    
    DETECTION_CONFIDENCE_THRESHOLD = 0.5
    FIRE_SMOKE_CONFIDENCE_THRESHOLD = 0.3
    SMOKING_CONFIDENCE_THRESHOLD = 0.5
    ACCIDENT_CONFIDENCE_THRESHOLD = 0.1
    
    SOCKETIO_ASYNC_MODE = 'gevent'
    
    CORS_ORIGINS = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174", "http://localhost:8080"]
    HOST = '0.0.0.0'
    PORT = 5002
    DEBUG = True
