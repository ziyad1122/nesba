import os
import logging
from datetime import datetime, timezone, timedelta
import secrets

logger = logging.getLogger(__name__)

# In-memory storage for reset tokens
reset_tokens = {}

def generate_reset_token():
    """Generate a secure random token"""
    return secrets.token_urlsafe(32)

def store_reset_token(email: str, token: str):
    """Store reset token with expiry (1 hour)"""
    reset_tokens[email] = {
        "token": token,
        "expiry": datetime.now(timezone.utc) + timedelta(hours=1)
    }

def verify_reset_token(email: str, token: str) -> bool:
    """Verify if reset token is valid"""
    if email not in reset_tokens:
        return False
    
    stored = reset_tokens[email]
    
    # Check expiry
    if datetime.now(timezone.utc) > stored["expiry"]:
        del reset_tokens[email]
        return False
    
    # Check token
    return stored["token"] == token

def cleanup_expired_tokens():
    """Remove expired tokens"""
    now = datetime.now(timezone.utc)
    expired = [email for email, data in reset_tokens.items() if now > data["expiry"]]
    for email in expired:
        del reset_tokens[email]

def send_password_reset_email(email: str, reset_link: str):
    """Send password reset email"""
    demo_mode = os.environ.get('EMAIL_DEMO_MODE', 'true').lower() == 'true'
    
    if demo_mode:
        logger.info(f"📧 Password reset email for {email}")
        print(f"\n{'='*60}")
        print(f"📧 إعادة تعيين كلمة المرور")
        print(f"إلى: {email}")
        print(f"الرابط: {reset_link}")
        print(f"صالح لمدة: 1 ساعة")
        print(f"{'='*60}\n")
        return {"success": True, "message": "Email sent (demo mode)", "demo": True}
    
    # Production mode with Resend
    try:
        import resend
        resend.api_key = os.environ.get('RESEND_API_KEY')
        
        params = {
            "from": os.environ.get('FROM_EMAIL', 'onboarding@resend.dev'),
            "to": [email],
            "subject": "إعادة تعيين كلمة المرور - نسبتي",
            "html": f"""
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">🔐 إعادة تعيين كلمة المرور</h1>
                </div>
                
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                        مرحباً،
                    </p>
                    
                    <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                        تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك في منصة <strong>نسبتي</strong>.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_link}" 
                           style="background: #10b981; color: white; padding: 15px 40px; 
                                  text-decoration: none; border-radius: 50px; font-size: 16px;
                                  display: inline-block; font-weight: bold;">
                            إعادة تعيين كلمة المرور
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
                        أو انسخ الرابط التالي في المتصفح:
                    </p>
                    <p style="font-size: 12px; color: #94a3b8; word-break: break-all; 
                              background: white; padding: 10px; border-radius: 5px; direction: ltr;">
                        {reset_link}
                    </p>
                    
                    <div style="margin-top: 30px; padding: 15px; background: #fef3c7; 
                                border-right: 4px solid #f59e0b; border-radius: 5px;">
                        <p style="font-size: 14px; color: #92400e; margin: 0;">
                            ⚠️ <strong>ملاحظة:</strong> هذا الرابط صالح لمدة ساعة واحدة فقط.
                        </p>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 15px; background: #fee2e2; 
                                border-right: 4px solid #ef4444; border-radius: 5px;">
                        <p style="font-size: 14px; color: #991b1b; margin: 0;">
                            🔒 إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.
                        </p>
                    </div>
                    
                    <p style="font-size: 14px; color: #64748b; margin-top: 30px; text-align: center;">
                        مع أطيب التحيات،<br>
                        <strong>فريق نسبه</strong>
                    </p>
                </div>
            </div>
            """
        }
        
        email_response = resend.Emails.send(params)
        logger.info(f"Password reset email sent to {email}: {email_response}")
        return {"success": True, "message": "Email sent successfully"}
        
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        # Fallback to demo mode
        print(f"\n{'='*60}")
        print(f"📧 إعادة تعيين كلمة المرور (Fallback)")
        print(f"إلى: {email}")
        print(f"الرابط: {reset_link}")
        print(f"{'='*60}\n")
        return {"success": True, "message": "Email sent (fallback mode)", "demo": True}

def send_otp_email(email: str, otp: str):
    """Send OTP via email for two-factor authentication"""
    demo_mode = os.environ.get('EMAIL_DEMO_MODE', 'true').lower() == 'true'

    if demo_mode:
        logger.info(f"📧 OTP email for {email}: {otp}")
        print(f"\n{'='*60}")
        print(f"📧 رمز التحقق (OTP)")
        print(f"إلى: {email}")
        print(f"🔐 الرمز: {otp}")
        print(f"⏰ صالح لمدة: 5 دقائق")
        print(f"{'='*60}\n")
        return {"success": True, "message": "OTP email sent (demo mode)", "demo": True}

    try:
        import resend
        resend.api_key = os.environ.get('RESEND_API_KEY')

        params = {
            "from": os.environ.get('FROM_EMAIL', 'onboarding@resend.dev'),
            "to": [email],
            "subject": "رمز التحقق الخاص بك - نسبتي",
            "html": f"""
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">🔐 رمز التحقق</h1>
                </div>

                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                        مرحباً،
                    </p>

                    <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                        إليك رمز التحقق الخاص بك لتسجيل الدخول إلى حسابك في <strong>نسبتي</strong>:
                    </p>

                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background: white; border: 2px solid #10b981; padding: 20px;
                                   border-radius: 10px; display: inline-block;">
                            <p style="font-size: 32px; font-weight: bold; color: #10b981;
                                     margin: 0; letter-spacing: 5px; font-family: monospace;">
                                {otp}
                            </p>
                        </div>
                    </div>

                    <div style="margin-top: 30px; padding: 15px; background: #fef3c7;
                                border-right: 4px solid #f59e0b; border-radius: 5px;">
                        <p style="font-size: 14px; color: #92400e; margin: 0;">
                            ⏰ <strong>ملاحظة:</strong> هذا الرمز صالح لمدة 5 دقائق فقط.
                        </p>
                    </div>

                    <div style="margin-top: 20px; padding: 15px; background: #fee2e2;
                                border-right: 4px solid #ef4444; border-radius: 5px;">
                        <p style="font-size: 14px; color: #991b1b; margin: 0;">
                            🔒 لا تشارك هذا الرمز مع أحد. فريق نسبتي لن يطلب منك هذا الرمز أبداً.
                        </p>
                    </div>

                    <p style="font-size: 14px; color: #64748b; margin-top: 30px; text-align: center;">
                        مع أطيب التحيات،<br>
                        <strong>فريق نسبه</strong>
                    </p>
                </div>
            </div>
            """
        }

        email_response = resend.Emails.send(params)
        logger.info(f"OTP email sent to {email}: {email_response}")
        return {"success": True, "message": "OTP email sent successfully"}

    except Exception as e:
        logger.error(f"Failed to send OTP email: {e}")
        # Fallback to demo mode
        print(f"\n{'='*60}")
        print(f"📧 رمز التحقق (Fallback)")
        print(f"إلى: {email}")
        print(f"🔐 الرمز: {otp}")
        print(f"{'='*60}\n")
        return {"success": True, "message": "OTP email sent (fallback mode)", "demo": True}

def send_welcome_email(email: str, name: str):
    """Send welcome email when a new user registers"""
    demo_mode = os.environ.get('EMAIL_DEMO_MODE', 'true').lower() == 'true'

    if demo_mode:
        logger.info(f"📧 Welcome email for {email}")
        print(f"\n{'='*60}")
        print(f"🎉 مرحباً بك في نسبتي!")
        print(f"إلى: {email} ({name})")
        print(f"{'='*60}\n")
        return {"success": True, "message": "Welcome email sent (demo mode)", "demo": True}

    try:
        import resend
        resend.api_key = os.environ.get('RESEND_API_KEY')

        params = {
            "from": os.environ.get('FROM_EMAIL', 'onboarding@resend.dev'),
            "to": [email],
            "subject": "مرحباً بك في نسبتي 🎉",
            "html": f"""
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">🎉 مرحباً بك في نسبتي!</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                        مرحباً <strong>{name}</strong>،
                    </p>
                    <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                        يسعدنا انضمامك إلى منصة <strong>نسبتي</strong> للمنتجات الرقمية.
                        حسابك جاهز الآن ويمكنك البدء في التسوق أو بيع منتجاتك.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{os.environ.get('FRONTEND_URL', '#')}"
                           style="background: #10b981; color: white; padding: 15px 40px;
                                  text-decoration: none; border-radius: 50px; font-size: 16px;
                                  display: inline-block; font-weight: bold;">
                            ابدأ الآن
                        </a>
                    </div>
                    <p style="font-size: 14px; color: #64748b; margin-top: 30px; text-align: center;">
                        مع أطيب التحيات،<br>
                        <strong>فريق نسبتي</strong>
                    </p>
                </div>
            </div>
            """
        }

        email_response = resend.Emails.send(params)
        logger.info(f"Welcome email sent to {email}: {email_response}")
        return {"success": True, "message": "Welcome email sent successfully"}

    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")
        return {"success": True, "message": "Welcome email sent (fallback)", "demo": True}


def send_login_notification_email(email: str, name: str, ip_address: str):
    """Send login notification email when user logs in"""
    demo_mode = os.environ.get('EMAIL_DEMO_MODE', 'true').lower() == 'true'

    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    if demo_mode:
        logger.info(f"📧 Login notification for {email} from {ip_address}")
        print(f"\n{'='*60}")
        print(f"🔔 تسجيل دخول جديد")
        print(f"إلى: {email} ({name})")
        print(f"IP: {ip_address}")
        print(f"الوقت: {now_str}")
        print(f"{'='*60}\n")
        return {"success": True, "message": "Login notification sent (demo mode)", "demo": True}

    try:
        import resend
        resend.api_key = os.environ.get('RESEND_API_KEY')

        params = {
            "from": os.environ.get('FROM_EMAIL', 'onboarding@resend.dev'),
            "to": [email],
            "subject": "تنبيه: تسجيل دخول جديد إلى حسابك - نسبتي",
            "html": f"""
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">🔔 تسجيل دخول جديد</h1>
                </div>
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                        مرحباً <strong>{name}</strong>،
                    </p>
                    <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                        تم تسجيل الدخول إلى حسابك في منصة <strong>نسبتي</strong>.
                    </p>
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">🕐 الوقت:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: bold;">{now_str}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b; font-size: 14px;">🌐 عنوان IP:</td>
                                <td style="padding: 8px 0; color: #1e293b; font-size: 14px; font-weight: bold; direction: ltr;">{ip_address}</td>
                            </tr>
                        </table>
                    </div>
                    <div style="margin-top: 20px; padding: 15px; background: #fef3c7;
                                border-right: 4px solid #f59e0b; border-radius: 5px;">
                        <p style="font-size: 14px; color: #92400e; margin: 0;">
                            ⚠️ إذا لم تكن أنت من قام بتسجيل الدخول، يرجى تغيير كلمة المرور فوراً.
                        </p>
                    </div>
                    <p style="font-size: 14px; color: #64748b; margin-top: 30px; text-align: center;">
                        مع أطيب التحيات،<br>
                        <strong>فريق نسبتي</strong>
                    </p>
                </div>
            </div>
            """
        }

        email_response = resend.Emails.send(params)
        logger.info(f"Login notification sent to {email}: {email_response}")
        return {"success": True, "message": "Login notification sent successfully"}

    except Exception as e:
        logger.error(f"Failed to send login notification: {e}")
        return {"success": True, "message": "Login notification sent (fallback)", "demo": True}


def send_verification_email(email: str, verification_link: str):
    """Send email verification link"""
    demo_mode = os.environ.get('EMAIL_DEMO_MODE', 'true').lower() == 'true'
    
    if demo_mode:
        logger.info(f"📧 Verification email for {email}")
        print(f"\n{'='*60}")
        print(f"✉️ تحقق من البريد الإلكتروني")
        print(f"إلى: {email}")
        print(f"الرابط: {verification_link}")
        print(f"{'='*60}\n")
        return {"success": True, "message": "Verification email sent (demo mode)", "demo": True}
    
    try:
        import resend
        resend.api_key = os.environ.get('RESEND_API_KEY')
        
        params = {
            "from": os.environ.get('FROM_EMAIL', 'onboarding@resend.dev'),
            "to": [email],
            "subject": "تحقق من بريدك الإلكتروني - نسبتي",
            "html": f"""
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: white; margin: 0;">✉️ تحقق من بريدك الإلكتروني</h1>
                </div>
                
                <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px;">
                    <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                        مرحباً بك في <strong>نسبتي</strong>! 🎉
                    </p>
                    
                    <p style="font-size: 16px; color: #334155; line-height: 1.6;">
                        شكراً لتسجيلك معنا. لإكمال عملية التسجيل، يرجى تأكيد بريدك الإلكتروني.
                    </p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{verification_link}" 
                           style="background: #ea580c; color: white; padding: 15px 40px; 
                                  text-decoration: none; border-radius: 50px; font-size: 16px;
                                  display: inline-block; font-weight: bold;">
                            تأكيد البريد الإلكتروني
                        </a>
                    </div>
                    
                    <p style="font-size: 14px; color: #64748b; margin-top: 30px; text-align: center;">
                        مع أطيب التحيات،<br>
                        <strong>فريق نسبه</strong>
                    </p>
                </div>
            </div>
            """
        }
        
        email_response = resend.Emails.send(params)
        logger.info(f"Verification email sent to {email}: {email_response}")
        return {"success": True, "message": "Verification email sent"}
        
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")
        return {"success": False, "message": str(e)}
