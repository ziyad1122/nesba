from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Request, Header
from fastapi.responses import FileResponse, RedirectResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import stripe
import shutil
from sms_service import send_otp, verify_otp
from email_service import (
    send_password_reset_email,
    generate_reset_token,
    store_reset_token,
    verify_reset_token,
    send_welcome_email,
    send_login_notification_email,
)
from paytabs_service import create_payment_page as create_paytabs_payment, verify_payment as verify_paytabs_payment

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import asyncio
import ssl
import os
os.environ.setdefault('EVENT_LOOP_POLICY', 'uvloop')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
try:
    client = AsyncIOMotorClient(
        mongo_url,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=5000
    )
    client.admin.command('ping')
    print("MongoDB connected successfully")
except Exception as e:
    print(f"MongoDB connection error: {e}")
    client = None
db = client[os.environ['DB_NAME']] if client else None

# JWT & Password
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = os.environ.get('JWT_SECRET', 'secret')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')

# Stripe
stripe_api_key = os.environ.get('STRIPE_API_KEY')

# Upload directory
UPLOAD_DIR = Path(os.environ.get('UPLOAD_DIR', '/var/www/nesba/backend/uploads'))
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "buyer"  # buyer, seller, admin
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class EmailOTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str

class PhoneLoginRequest(BaseModel):
    phone: str

class PhoneVerifyRequest(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None
    role: str = "buyer"

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    balance: float = 0.0
    phone: Optional[str] = None
    stripe_account_id: Optional[str] = None
    stripe_onboarding_complete: bool = False
    created_at: str

class TokenResponse(BaseModel):
    token: str
    user: User

class ProductCreate(BaseModel):
    title: str
    description: str
    price: float
    category: str
    cover_image: Optional[str] = None

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    seller_id: str
    seller_name: str
    title: str
    description: str
    price: float
    category: str
    cover_image: Optional[str] = None
    file_url: Optional[str] = None
    status: str = "active"
    downloads_count: int = 0
    rating: float = 0.0
    reviews_count: int = 0
    created_at: str

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    buyer_id: str
    seller_id: str
    product_id: str
    product_title: str
    amount: float
    commission: float
    seller_amount: float
    status: str
    stripe_session_id: Optional[str] = None  # legacy / Stripe session
    payment_intent_id: Optional[str] = None  # Stripe Payment Intent
    tran_ref: Optional[str] = None  # PayTabs
    payment_method: Optional[str] = None
    created_at: str

class ReviewCreate(BaseModel):
    rating: int
    comment: str

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    product_id: str
    buyer_id: str
    buyer_name: str
    rating: int
    comment: str
    created_at: str

class WithdrawalRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    seller_id: str
    seller_name: str
    amount: float
    status: str
    created_at: str
    processed_at: Optional[str] = None

class CheckoutRequest(BaseModel):
    product_id: str
    origin_url: str

class AdminStats(BaseModel):
    total_users: int
    total_products: int
    total_sales: float
    total_commission: float
    pending_withdrawals: int

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except JWTError:
        raise HTTPException(401, "Invalid token")

# Auth APIs
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(400, "Email already exists")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "role": data.role,
        "balance": 0.0,
        "phone": data.phone,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)

    # إرسال بريد ترحيبي
    try:
        send_welcome_email(data.email, data.name)
    except Exception as e:
        logger.warning(f"Failed to send welcome email: {e}")

    token = create_token(user_id)
    user = User(**{k: v for k, v in user_doc.items() if k != "password_hash"})
    return TokenResponse(token=token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin, request: Request):
    user_doc = await db.users.find_one({"email": data.email})
    if not user_doc or not verify_password(data.password, user_doc["password_hash"]):
        # تسجيل محاولة فاشلة
        await db.login_logs.insert_one({
            "email": data.email,
            "status": "failed",
            "ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", ""),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        raise HTTPException(401, "Invalid credentials")

    # تسجيل دخول ناجح
    await db.login_logs.insert_one({
        "user_id": user_doc["id"],
        "email": data.email,
        "name": user_doc.get("name", ""),
        "status": "success",
        "ip": request.client.host if request.client else "unknown",
        "user_agent": request.headers.get("user-agent", ""),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # إرسال إشعار بريدي بتسجيل الدخول
    try:
        ip_addr = request.client.host if request.client else "unknown"
        send_login_notification_email(data.email, user_doc.get("name", ""), ip_addr)
    except Exception as e:
        logger.warning(f"Failed to send login notification: {e}")

    token = create_token(user_doc["id"])
    user = User(**{k: v for k, v in user_doc.items() if k not in ["password_hash", "_id"]})
    return TokenResponse(token=token, user=user)

@api_router.post("/auth/email/send-otp")
async def send_email_otp(data: UserLogin):
    """Send OTP to email for two-factor authentication"""
    user_doc = await db.users.find_one({"email": data.email})
    if not user_doc or not verify_password(data.password, user_doc["password_hash"]):
        raise HTTPException(401, "Invalid credentials")

    # Generate and send OTP via email
    result = send_otp(data.email, is_email=True)
    if not result["success"]:
        raise HTTPException(400, result["message"])

    return {
        "message": "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
        "demo": result.get("demo", False)
    }

@api_router.post("/auth/email/verify-otp", response_model=TokenResponse)
async def verify_email_otp(data: EmailOTPVerifyRequest):
    """Verify OTP and login user"""
    # Verify OTP
    result = verify_otp(data.email, data.otp)
    if not result["success"]:
        raise HTTPException(400, result["message"])

    # Get user
    user_doc = await db.users.find_one({"email": data.email})
    if not user_doc:
        raise HTTPException(404, "User not found")

    token = create_token(user_doc["id"])
    user = User(**{k: v for k, v in user_doc.items() if k not in ["password_hash", "_id"]})
    return TokenResponse(token=token, user=user)

# Phone Auth APIs
@api_router.post("/auth/phone/send-otp")
async def send_phone_otp(data: PhoneLoginRequest):
    """Send OTP to phone number"""
    # Validate phone format (basic validation)
    if not data.phone or len(data.phone) < 10:
        raise HTTPException(400, "رقم الجوال غير صحيح")
    
    result = send_otp(data.phone)
    if not result["success"]:
        raise HTTPException(400, result["message"])
    
    return {"message": "تم إرسال رمز التحقق", "demo": result.get("demo", False)}

@api_router.post("/auth/phone/verify", response_model=TokenResponse)
async def verify_phone_otp(data: PhoneVerifyRequest):
    """Verify OTP and login/register user"""
    # Verify OTP
    result = verify_otp(data.phone, data.otp)
    if not result["success"]:
        raise HTTPException(400, result["message"])
    
    # Check if user exists
    user_doc = await db.users.find_one({"phone": data.phone})
    
    if not user_doc:
        # Register new user
        user_id = str(uuid.uuid4())
        user_doc = {
            "id": user_id,
            "email": f"{data.phone}@phone.nesba.com",  # Generate dummy email
            "phone": data.phone,
            "name": data.name or f"مستخدم {data.phone[-4:]}",
            "role": data.role,
            "balance": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    token = create_token(user_doc["id"])
    user = User(**{k: v for k, v in user_doc.items() if k not in ["password_hash", "_id"]})
    return TokenResponse(token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(**{k: v for k, v in current_user.items() if k != "password_hash"})

# Password Reset APIs
@api_router.post("/auth/forgot-password")
async def forgot_password(email: EmailStr):
    """Send password reset email"""
    # Check if user exists
    user = await db.users.find_one({"email": email})
    if not user:
        # Don't reveal if email exists or not (security)
        return {"message": "إذا كان البريد الإلكتروني مسجلاً، ستصلك رسالة لإعادة تعيين كلمة المرور"}
    
    # Generate reset token
    token = generate_reset_token()
    store_reset_token(email, token)
    
    # Create reset link
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    reset_link = f"{frontend_url}/reset-password?token={token}&email={email}"
    
    # Send email
    result = send_password_reset_email(email, reset_link)
    
    return {
        "message": "إذا كان البريد الإلكتروني مسجلاً، ستصلك رسالة لإعادة تعيين كلمة المرور",
        "demo": result.get("demo", False)
    }

@api_router.post("/auth/reset-password")
async def reset_password(email: EmailStr, token: str, new_password: str):
    """Reset password with token"""
    # Verify token
    if not verify_reset_token(email, token):
        raise HTTPException(400, "الرابط غير صالح أو منتهي الصلاحية")
    
    # Check if user exists
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(404, "المستخدم غير موجود")
    
    # Update password
    await db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    
    return {"message": "تم تغيير كلمة المرور بنجاح"}

# Stripe Connect APIs
@api_router.post("/stripe/connect/create-account")
async def create_stripe_connect_account(current_user: dict = Depends(get_current_user)):
    """Create a Stripe Connect account for seller"""
    if current_user["role"] not in ["seller", "admin"]:
        raise HTTPException(403, "Only sellers can connect Stripe accounts")
    
    try:
        import stripe
        stripe.api_key = stripe_api_key
        
        # Check if already has account
        if current_user.get("stripe_account_id"):
            account = stripe.Account.retrieve(current_user["stripe_account_id"])
            return {
                "account_id": account.id,
                "onboarding_complete": account.details_submitted
            }
        
        # Create connected account
        account = stripe.Account.create(
            type="express",
            country="US",
            email=current_user["email"],
            capabilities={
                "card_payments": {"requested": True},
                "transfers": {"requested": True},
            },
            business_type="individual",
        )
        
        # Save account ID to user
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"stripe_account_id": account.id}}
        )
        
        return {
            "account_id": account.id,
            "onboarding_complete": False
        }
        
    except Exception as e:
        logger.error(f"Error creating Stripe account: {e}")
        raise HTTPException(500, f"Failed to create Stripe account: {str(e)}")

@api_router.post("/stripe/connect/onboarding-link")
async def create_onboarding_link(current_user: dict = Depends(get_current_user)):
    """Create Stripe Connect onboarding link"""
    if current_user["role"] not in ["seller", "admin"]:
        raise HTTPException(403, "Only sellers can access this")
    
    if not current_user.get("stripe_account_id"):
        raise HTTPException(400, "No Stripe account found. Create one first.")
    
    try:
        import stripe
        stripe.api_key = stripe_api_key
        
        origin_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        
        account_link = stripe.AccountLink.create(
            account=current_user["stripe_account_id"],
            refresh_url=f"{origin_url}/dashboard/seller?tab=settings",
            return_url=f"{origin_url}/dashboard/seller?tab=settings&stripe_success=true",
            type="account_onboarding",
        )
        
        return {"url": account_link.url}
        
    except Exception as e:
        logger.error(f"Error creating onboarding link: {e}")
        raise HTTPException(500, f"Failed to create onboarding link: {str(e)}")

@api_router.get("/stripe/connect/status")
async def get_stripe_connect_status(current_user: dict = Depends(get_current_user)):
    """Check Stripe Connect account status"""
    if not current_user.get("stripe_account_id"):
        return {
            "connected": False,
            "onboarding_complete": False
        }
    
    try:
        import stripe
        stripe.api_key = stripe_api_key
        
        account = stripe.Account.retrieve(current_user["stripe_account_id"])
        
        # Update database
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": {"stripe_onboarding_complete": account.details_submitted}}
        )
        
        return {
            "connected": True,
            "onboarding_complete": account.details_submitted,
            "charges_enabled": account.charges_enabled,
            "payouts_enabled": account.payouts_enabled
        }
        
    except Exception as e:
        logger.error(f"Error getting account status: {e}")
        return {
            "connected": False,
            "onboarding_complete": False,
            "error": str(e)
        }

# Products APIs
@api_router.get("/products", response_model=List[Product])
async def get_products(category: Optional[str] = None, search: Optional[str] = None):
    query = {"status": "active"}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    try:
        products = await db.products.find(query).sort("created_at", -1).limit(100).to_list(100)
        result = []
        for p in products:
            p.pop('_id', None)
            result.append(p)
        return result
    except Exception as e:
        print(f"Error: {e}")
        return []

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    return Product(**product)

@api_router.post("/products", response_model=Product)
async def create_product(data: ProductCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["seller", "admin"]:
        raise HTTPException(403, "Only sellers can create products")
    
    product_id = str(uuid.uuid4())
    product_doc = {
        "id": product_id,
        "seller_id": current_user["id"],
        "seller_name": current_user["name"],
        **data.model_dump(),
        "status": "active",
        "downloads_count": 0,
        "rating": 0.0,
        "reviews_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    return Product(**{k: v for k, v in product_doc.items() if k != "_id"})

@api_router.post("/products/{product_id}/upload")
async def upload_product_file(product_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(404, "Product not found")
    if product["seller_id"] != current_user["id"]:
        raise HTTPException(403, "Not authorized")
    
    file_path = UPLOAD_DIR / f"{product_id}_{file.filename}"
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    await db.products.update_one({"id": product_id}, {"$set": {"file_url": str(file_path)}})
    return {"message": "File uploaded", "file_url": str(file_path)}

@api_router.get("/products/seller/{seller_id}", response_model=List[Product])
async def get_seller_products(seller_id: str):
    products = await db.products.find({"seller_id": seller_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Product(**p) for p in products]

# Reviews APIs
@api_router.get("/products/{product_id}/reviews", response_model=List[Review])
async def get_reviews(product_id: str):
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Review(**r) for r in reviews]

@api_router.post("/products/{product_id}/reviews", response_model=Review)
async def create_review(product_id: str, data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    # Check if user bought the product
    order = await db.orders.find_one({"product_id": product_id, "buyer_id": current_user["id"], "status": "completed"})
    if not order:
        raise HTTPException(403, "You must purchase this product first")
    
    review_id = str(uuid.uuid4())
    review_doc = {
        "id": review_id,
        "product_id": product_id,
        "buyer_id": current_user["id"],
        "buyer_name": current_user["name"],
        **data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reviews.insert_one(review_doc)
    
    # Update product rating using aggregation (optimized)
    pipeline = [
        {"$match": {"product_id": product_id}},
        {"$group": {
            "_id": None,
            "avg_rating": {"$avg": "$rating"},
            "count": {"$sum": 1}
        }}
    ]
    result = await db.reviews.aggregate(pipeline).to_list(1)
    
    if result:
        avg_rating = result[0]["avg_rating"]
        reviews_count = result[0]["count"]
        await db.products.update_one(
            {"id": product_id},
            {"$set": {"rating": avg_rating, "reviews_count": reviews_count}}
        )
    
    return Review(**{k: v for k, v in review_doc.items() if k != "_id"})

# Payment APIs
@api_router.get("/payments/config")
async def get_stripe_config():
    """Get Stripe publishable key"""
    publishable_key = os.environ.get('STRIPE_PUBLISHABLE_KEY', '')
    return {"publishableKey": publishable_key}

@api_router.post("/payments/create-intent")
async def create_payment_intent(data: CheckoutRequest, current_user: dict = Depends(get_current_user)):
    """Create a Stripe Payment Intent for direct card payment with Connect"""
    try:
        import stripe
        stripe.api_key = stripe_api_key
        
        # Get product details
        product = await db.products.find_one({"id": data.product_id})
        if not product:
            raise HTTPException(404, "Product not found")
        
        # Get seller details
        seller = await db.users.find_one({"id": product["seller_id"]})
        
        amount = float(product["price"])
        amount_cents = int(amount * 100)  # Convert to cents
        
        # Calculate commission (2.5%)
        commission_cents = int(amount_cents * 0.025)
        
        # Create Payment Intent with or without Connect
        intent_params = {
            "amount": amount_cents,
            "currency": "usd",
            "metadata": {
                "product_id": data.product_id,
                "buyer_id": current_user["id"],
                "seller_id": product["seller_id"],
                "product_title": product["title"]
            }
        }
        
        # If seller has connected Stripe account, use destination charges
        if seller.get("stripe_account_id") and seller.get("stripe_onboarding_complete"):
            intent_params["application_fee_amount"] = commission_cents
            intent_params["transfer_data"] = {
                "destination": seller["stripe_account_id"]
            }
        
        intent = stripe.PaymentIntent.create(**intent_params)
        
        # Create payment transaction record
        transaction_id = str(uuid.uuid4())
        transaction_doc = {
            "id": transaction_id,
            "payment_intent_id": intent.id,
            "product_id": data.product_id,
            "buyer_id": current_user["id"],
            "seller_id": product["seller_id"],
            "amount": amount,
            "currency": "usd",
            "status": "pending",
            "payment_status": "pending",
            "direct_transfer": seller.get("stripe_account_id") is not None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction_doc)
        
        return {
            "clientSecret": intent.client_secret, 
            "amount": amount,
            "direct_transfer": seller.get("stripe_account_id") is not None
        }
        
    except Exception as e:
        logger.error(f"Error creating payment intent: {e}")
        raise HTTPException(500, f"Failed to create payment intent: {str(e)}")

@api_router.post("/payments/confirm")
async def confirm_payment(payment_intent_id: str, current_user: dict = Depends(get_current_user)):
    """Confirm payment and create order"""
    try:
        import stripe
        stripe.api_key = stripe_api_key
        
        # Get payment intent
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status != "succeeded":
            raise HTTPException(400, "Payment not successful")
        
        # Find transaction
        transaction = await db.payment_transactions.find_one({"payment_intent_id": payment_intent_id})
        if not transaction:
            raise HTTPException(404, "Transaction not found")
        
        # Check if already processed
        if transaction.get("order_id"):
            return {"success": True, "order_id": transaction["order_id"], "message": "Already processed"}
        
        # Get product
        product = await db.products.find_one({"id": transaction["product_id"]})
        
        # Calculate commission
        commission = float(transaction["amount"]) * 0.025
        seller_amount = float(transaction["amount"]) - commission
        
        # Create order
        order_id = str(uuid.uuid4())
        order_doc = {
            "id": order_id,
            "buyer_id": transaction["buyer_id"],
            "seller_id": transaction["seller_id"],
            "product_id": transaction["product_id"],
            "product_title": product["title"],
            "amount": float(transaction["amount"]),
            "commission": commission,
            "seller_amount": seller_amount,
            "status": "completed",
            "payment_intent_id": payment_intent_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.orders.insert_one(order_doc)
        
        # Update seller balance
        await db.users.update_one(
            {"id": transaction["seller_id"]}, 
            {"$inc": {"balance": seller_amount}}
        )
        
        # Update product downloads count
        await db.products.update_one(
            {"id": transaction["product_id"]}, 
            {"$inc": {"downloads_count": 1}}
        )
        
        # Update transaction
        await db.payment_transactions.update_one(
            {"payment_intent_id": payment_intent_id},
            {"$set": {
                "order_id": order_id,
                "status": "completed",
                "payment_status": "paid"
            }}
        )
        
        return {"success": True, "order_id": order_id}
        
    except Exception as e:
        logger.error(f"Error confirming payment: {e}")
        raise HTTPException(500, f"Failed to confirm payment: {str(e)}")

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, current_user: dict = Depends(get_current_user)):
    """Get payment status by payment_intent_id (Stripe) or tran_ref (PayTabs). Used by checkout success page."""
    # Try Stripe payment_intent_id first
    transaction = await db.payment_transactions.find_one({"payment_intent_id": session_id})
    if not transaction:
        # Try PayTabs tran_ref
        transaction = await db.payment_transactions.find_one({"tran_ref": session_id})
    if not transaction:
        raise HTTPException(404, "Transaction not found")
    if transaction["buyer_id"] != current_user["id"]:
        raise HTTPException(403, "Not authorized")
    return {
        "payment_status": transaction.get("payment_status", "pending"),
        "status": transaction.get("status", "pending"),
        "order_id": transaction.get("order_id"),
    }

# PayTabs Payment APIs
@api_router.post("/payments/paytabs/create")
async def create_paytabs_checkout(data: CheckoutRequest, current_user: dict = Depends(get_current_user)):
    """Create PayTabs payment page"""
    try:
        # Get product
        product = await db.products.find_one({"id": data.product_id})
        if not product:
            raise HTTPException(404, "Product not found")
        
        # Calculate amount in SAR (assuming product price is in USD, convert to SAR)
        # 1 USD = 3.75 SAR (you can update this)
        amount_sar = float(product["price"]) * 3.75
        
        # Prepare product info
        product_info = {
            "name": product["title"],
            "description": product.get("description", product["title"])
        }
        
        # Prepare customer info
        customer_info = {
            "name": current_user["name"],
            "email": current_user["email"],
            "phone": current_user.get("phone", "0500000000")
        }
        
        # Return URL
        return_url = f"{data.origin_url}/paytabs/callback"
        
        # Create payment page
        result = create_paytabs_payment(
            amount=amount_sar,
            product_info=product_info,
            customer_info=customer_info,
            return_url=return_url
        )
        
        if not result["success"]:
            raise HTTPException(400, result.get("message", "Failed to create payment"))
        
        # Store transaction
        transaction_id = str(uuid.uuid4())
        transaction_doc = {
            "id": transaction_id,
            "tran_ref": result["tran_ref"],
            "product_id": data.product_id,
            "buyer_id": current_user["id"],
            "seller_id": product["seller_id"],
            "amount": float(product["price"]),
            "amount_sar": amount_sar,
            "currency": "SAR",
            "status": "pending",
            "payment_status": "pending",
            "payment_method": "paytabs",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction_doc)
        
        return {
            "redirect_url": result["redirect_url"],
            "tran_ref": result["tran_ref"],
            "demo": result.get("demo", False)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating PayTabs payment: {e}")
        raise HTTPException(500, f"Failed to create payment: {str(e)}")

@api_router.get("/paytabs/callback")
async def paytabs_callback(tran_ref: str, respStatus: str, respMessage: str):
    """Handle PayTabs callback"""
    try:
        # Find transaction
        transaction = await db.payment_transactions.find_one({"tran_ref": tran_ref})
        if not transaction:
            raise HTTPException(404, "Transaction not found")
        
        # Check if already processed
        if transaction.get("order_id"):
            return {"status": "already_processed", "order_id": transaction["order_id"]}
        
        # Verify payment
        if respStatus == "A":  # Approved
            # Get product
            product = await db.products.find_one({"id": transaction["product_id"]})
            
            # Calculate commission
            commission = float(transaction["amount"]) * 0.025
            seller_amount = float(transaction["amount"]) - commission
            
            # Create order
            order_id = str(uuid.uuid4())
            order_doc = {
                "id": order_id,
                "buyer_id": transaction["buyer_id"],
                "seller_id": transaction["seller_id"],
                "product_id": transaction["product_id"],
                "product_title": product["title"],
                "amount": float(transaction["amount"]),
                "commission": commission,
                "seller_amount": seller_amount,
                "status": "completed",
                "payment_method": "paytabs",
                "tran_ref": tran_ref,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.orders.insert_one(order_doc)
            
            # Update seller balance
            await db.users.update_one(
                {"id": transaction["seller_id"]},
                {"$inc": {"balance": seller_amount}}
            )
            
            # Update product downloads
            await db.products.update_one(
                {"id": transaction["product_id"]},
                {"$inc": {"downloads_count": 1}}
            )
            
            # Update transaction
            await db.payment_transactions.update_one(
                {"tran_ref": tran_ref},
                {"$set": {
                    "order_id": order_id,
                    "status": "completed",
                    "payment_status": "paid"
                }}
            )
            
            # Redirect to success page
            frontend_url = os.environ.get('FRONTEND_URL', '')
            return RedirectResponse(url=f"{frontend_url}/checkout/success?session_id={tran_ref}")
        
        else:
            # Payment failed
            await db.payment_transactions.update_one(
                {"tran_ref": tran_ref},
                {"$set": {
                    "status": "failed",
                    "payment_status": "failed",
                    "error_message": respMessage
                }}
            )
            
            frontend_url = os.environ.get('FRONTEND_URL', '')
            return RedirectResponse(url=f"{frontend_url}/checkout/failed?message={respMessage}")
            
    except Exception as e:
        logger.error(f"Error in PayTabs callback: {e}")
        raise HTTPException(500, str(e))



# Orders APIs
@api_router.get("/orders/my-purchases", response_model=List[Order])
async def get_my_purchases(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"buyer_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Order(**o) for o in orders]

@api_router.get("/orders/my-sales", response_model=List[Order])
async def get_my_sales(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"seller_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [Order(**o) for o in orders]

@api_router.get("/orders/{order_id}/download")
async def download_product(order_id: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(404, "Order not found")
    if order["buyer_id"] != current_user["id"]:
        raise HTTPException(403, "Not authorized")
    
    product = await db.products.find_one({"id": order["product_id"]})
    if not product or not product.get("file_url"):
        raise HTTPException(404, "File not found")
    
    file_path = Path(product["file_url"])
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    
    return FileResponse(file_path, filename=file_path.name)

# Withdrawals APIs
@api_router.post("/withdrawals/request")
async def request_withdrawal(amount: float, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["seller", "admin"]:
        raise HTTPException(403, "Only sellers can withdraw")
    
    if current_user["balance"] < amount:
        raise HTTPException(400, "Insufficient balance")
    
    request_id = str(uuid.uuid4())
    request_doc = {
        "id": request_id,
        "seller_id": current_user["id"],
        "seller_name": current_user["name"],
        "amount": amount,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.withdrawal_requests.insert_one(request_doc)
    
    # Deduct from balance
    await db.users.update_one({"id": current_user["id"]}, {"$inc": {"balance": -amount}})
    
    return {"message": "Withdrawal request submitted", "request_id": request_id}

@api_router.get("/withdrawals/my-requests", response_model=List[WithdrawalRequest])
async def get_my_withdrawals(current_user: dict = Depends(get_current_user)):
    requests = await db.withdrawal_requests.find({"seller_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [WithdrawalRequest(**r) for r in requests]

# Admin APIs
@api_router.get("/admin/stats", response_model=AdminStats)
async def get_admin_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    
    total_users = await db.users.count_documents({})
    total_products = await db.products.count_documents({})
    
    # Calculate totals using aggregation (optimized)
    pipeline = [
        {"$group": {
            "_id": None,
            "total_sales": {"$sum": "$amount"},
            "total_commission": {"$sum": "$commission"}
        }}
    ]
    result = await db.orders.aggregate(pipeline).to_list(1)
    
    total_sales = result[0]["total_sales"] if result else 0
    total_commission = result[0]["total_commission"] if result else 0
    
    pending_withdrawals = await db.withdrawal_requests.count_documents({"status": "pending"})
    
    return AdminStats(
        total_users=total_users,
        total_products=total_products,
        total_sales=total_sales,
        total_commission=total_commission,
        pending_withdrawals=pending_withdrawals
    )

@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.get("/admin/products")
async def get_all_products_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    return products

# Admin Login Logs API
@api_router.get("/admin/login-logs")
async def get_login_logs(
    current_user: dict = Depends(get_current_user),
    limit: int = 100,
):
    if current_user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    logs = (
        await db.login_logs.find({}, {"_id": 0})
        .sort("timestamp", -1)
        .to_list(limit)
    )
    return logs

@api_router.get("/admin/withdrawals", response_model=List[WithdrawalRequest])
async def get_all_withdrawals(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    requests = await db.withdrawal_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [WithdrawalRequest(**r) for r in requests]

@api_router.put("/admin/withdrawals/{request_id}/approve")
async def approve_withdrawal(request_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(403, "Admin only")
    
    await db.withdrawal_requests.update_one(
        {"id": request_id},
        {"$set": {"status": "approved", "processed_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Withdrawal approved"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()