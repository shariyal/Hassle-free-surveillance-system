import os
import time
from typing import Optional

# ---- Twilio WhatsApp ----
from twilio.rest import Client

# ---- Cloudinary ----
import cloudinary
import cloudinary.uploader

# Read credentials from ENV (fallback to provided, but ENV is preferred)
TWILIO_SID = os.getenv("TWILIO_SID", "ACddbb776ecebfd0e064eefd5536766293")
TWILIO_AUTH = os.getenv("TWILIO_AUTH", "0285a601a7272d402ac97749dd46986e")
FROM_WHATSAPP = os.getenv("FROM_WHATSAPP", "whatsapp:+14155238886")
TO_WHATSAPP = os.getenv("TO_WHATSAPP", "whatsapp:+919579700854")

CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "dagrwfwzp")
CLOUD_KEY = os.getenv("CLOUDINARY_API_KEY", "914734956244956")
CLOUD_SECRET = os.getenv("CLOUDINARY_API_SECRET", "XO1OTkymg2mORW_tBBE3oFv7uj0")

# Configure Cloudinary once
cloudinary.config(
    cloud_name=CLOUD_NAME,
    api_key=CLOUD_KEY,
    api_secret=CLOUD_SECRET,
    secure=True
)

# Create Twilio client once (lazy)
_twilio_client: Optional[Client] = None
_last_alert_time = {"fire": 0.0, "smoke": 0.0, "accident": 0.0}
ALERT_COOLDOWN_SECONDS = float(os.getenv("ALERT_COOLDOWN_SECONDS", "30"))

def _get_twilio():
    global _twilio_client
    if _twilio_client is None:
        _twilio_client = Client(TWILIO_SID, TWILIO_AUTH)
    return _twilio_client

def upload_image_to_cloudinary(image_path: str) -> Optional[str]:
    try:
        result = cloudinary.uploader.upload(image_path, folder="incidents", resource_type="image")
        return result.get("secure_url")
    except Exception as e:
        print(f"[notifier] Cloudinary upload failed: {e}")
        return None

def send_whatsapp_message(body: str, media_url: Optional[str] = None) -> bool:
    try:
        client = _get_twilio()
        msg_kwargs = dict(from_=FROM_WHATSAPP, to=TO_WHATSAPP, body=body)
        if media_url:
            msg_kwargs["media_url"] = [media_url]
        message = client.messages.create(**msg_kwargs)
        print(f"[notifier] WhatsApp message SID: {message.sid}")
        return True
    except Exception as e:
        print(f"[notifier] Twilio send failed: {e}")
        return False

def notify_incident(event_type: str, image_path: Optional[str], extra: Optional[str] = None) -> None:
    """Send a throttled WhatsApp alert with optional image upload."""
    now = time.time()
    last = _last_alert_time.get(event_type, 0.0)
    if now - last < ALERT_COOLDOWN_SECONDS:
        # Throttled
        print(f"[notifier] Throttling alert for {event_type}. Cooldown has not passed.")
        return
    _last_alert_time[event_type] = now

    title = {"fire": "🔥 FIRE DETECTED",
             "smoke": "💨 SMOKE DETECTED",
             "accident": "🚑 ACCIDENT DETECTED"}.get(event_type, "⚠️ INCIDENT")
    body = f"{title}\n"
    if extra:
        body += f"{extra}\n"
    body += "Sent by ProActive Vision"

    media_url = None
    if image_path and os.path.exists(image_path):
        print(f"[notifier] Uploading image {image_path} to Cloudinary...")
        media_url = upload_image_to_cloudinary(image_path)
        if media_url:
            print(f"[notifier] Image uploaded successfully: {media_url}")

    print(f"[notifier] Sending WhatsApp notification for {event_type}...")
    send_whatsapp_message(body, media_url=media_url)
