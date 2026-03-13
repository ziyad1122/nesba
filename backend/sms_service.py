import os
import random
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

# In-memory OTP storage (في الإنتاج، استخدم Redis أو MongoDB)
otp_storage = {}

def generate_otp():
    """Generate a 6-digit OTP"""
    return str(random.randint(100000, 999999))

def send_otp(identifier: str, is_email: bool = False) -> dict:
    """
    Send OTP to phone number or email
    في الوضع التجريبي، يتم طباعة OTP في console
    """
    otp = generate_otp()
    expiry = datetime.now(timezone.utc) + timedelta(minutes=5)

    # Store OTP
    otp_storage[identifier] = {
        "otp": otp,
        "expiry": expiry,
        "attempts": 0
    }

    # Check if in demo mode
    demo_mode = os.environ.get('SMS_DEMO_MODE', 'false').lower() == 'true'

    if is_email:
        # Send via email
        try:
            from email_service import send_otp_email
            result = send_otp_email(identifier, otp)
            return result
        except Exception as e:
            logger.error(f"Failed to send OTP email: {e}")
            # Fallback to console
            print(f"\n{'='*50}")
            print(f"📧 البريد الإلكتروني: {identifier}")
            print(f"🔐 رمز OTP: {otp}")
            print(f"⏰ صالح لمدة: 5 دقائق")
            print(f"{'='*50}\n")
            return {"success": True, "message": "OTP sent (fallback mode)", "demo": True}

    # Send via SMS
    if demo_mode:
        logger.info(f"📱 OTP for {identifier}: {otp}")
        print(f"\n{'='*50}")
        print(f"📱 رقم الجوال: {identifier}")
        print(f"🔐 رمز OTP: {otp}")
        print(f"⏰ صالح لمدة: 5 دقائق")
        print(f"{'='*50}\n")
        return {"success": True, "message": "OTP sent (demo mode)", "demo": True}

    # Production mode with Twilio
    try:
        from twilio.rest import Client

        account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        twilio_phone = os.environ.get('TWILIO_PHONE_NUMBER')

        if not all([account_sid, auth_token, twilio_phone]):
            raise Exception("Twilio credentials not configured")

        client = Client(account_sid, auth_token)

        message = client.messages.create(
            body=f"رمز التحقق الخاص بك في نسبه هو: {otp}\nصالح لمدة 5 دقائق",
            from_=twilio_phone,
            to=identifier
        )

        logger.info(f"OTP sent to {identifier} via Twilio: {message.sid}")
        return {"success": True, "message": "OTP sent successfully"}

    except ImportError:
        logger.warning("Twilio not installed, using demo mode")
        print(f"\n{'='*50}")
        print(f"📱 رقم الجوال: {identifier}")
        print(f"🔐 رمز OTP: {otp}")
        print(f"⏰ صالح لمدة: 5 دقائق")
        print(f"{'='*50}\n")
        return {"success": True, "message": "OTP sent (demo mode)", "demo": True}
    except Exception as e:
        logger.error(f"Failed to send OTP: {e}")
        return {"success": False, "message": str(e)}

def verify_otp(phone_number: str, otp: str) -> dict:
    """Verify OTP for phone number"""
    if phone_number not in otp_storage:
        return {"success": False, "message": "لم يتم إرسال رمز OTP لهذا الرقم"}
    
    stored = otp_storage[phone_number]
    
    # Check expiry
    if datetime.now(timezone.utc) > stored["expiry"]:
        del otp_storage[phone_number]
        return {"success": False, "message": "انتهت صلاحية رمز OTP"}
    
    # Check attempts
    if stored["attempts"] >= 3:
        del otp_storage[phone_number]
        return {"success": False, "message": "تم تجاوز عدد المحاولات المسموحة"}
    
    # Verify OTP
    if stored["otp"] != otp:
        stored["attempts"] += 1
        return {"success": False, "message": "رمز OTP غير صحيح"}
    
    # Success - remove OTP
    del otp_storage[phone_number]
    return {"success": True, "message": "تم التحقق بنجاح"}

def cleanup_expired_otps():
    """Remove expired OTPs from storage"""
    now = datetime.now(timezone.utc)
    expired = [phone for phone, data in otp_storage.items() if now > data["expiry"]]
    for phone in expired:
        del otp_storage[phone]
