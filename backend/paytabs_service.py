import os
import logging
import requests
from datetime import datetime, timezone
import uuid

logger = logging.getLogger(__name__)

PAYTABS_BASE_URL = "https://secure.paytabs.sa"

def get_paytabs_config():
    """Get PayTabs configuration"""
    return {
        "server_key": os.environ.get('PAYTABS_SERVER_KEY', 'demo_mode'),
        "profile_id": os.environ.get('PAYTABS_PROFILE_ID', 'demo_mode'),
        "region": os.environ.get('PAYTABS_REGION', 'SAU'),  # SAU for Saudi Arabia
    }

def create_payment_page(amount: float, product_info: dict, customer_info: dict, return_url: str):
    """
    Create PayTabs payment page
    
    Args:
        amount: Payment amount
        product_info: {"name": str, "description": str}
        customer_info: {"name": str, "email": str, "phone": str}
        return_url: URL to return after payment
    
    Returns:
        {"redirect_url": str, "tran_ref": str} or error
    """
    config = get_paytabs_config()
    
    # Demo mode
    if config["server_key"] == "demo_mode":
        tran_ref = f"demo_{uuid.uuid4().hex[:16]}"
        demo_url = f"{return_url}?tran_ref={tran_ref}&respStatus=A&respMessage=Success"
        
        logger.info(f"💳 PayTabs Demo Mode")
        print(f"\n{'='*60}")
        print(f"💳 PayTabs Payment (Demo Mode)")
        print(f"المبلغ: {amount} SAR")
        print(f"المنتج: {product_info['name']}")
        print(f"العميل: {customer_info['name']} ({customer_info['email']})")
        print(f"رابط الدفع: {demo_url}")
        print(f"Reference: {tran_ref}")
        print(f"{'='*60}\n")
        
        return {
            "success": True,
            "redirect_url": demo_url,
            "tran_ref": tran_ref,
            "demo": True
        }
    
    # Production mode
    try:
        # PayTabs API endpoint
        url = f"{PAYTABS_BASE_URL}/payment/request"
        
        # Generate unique cart ID
        cart_id = f"CART_{uuid.uuid4().hex[:12].upper()}"
        tran_ref = f"TXN_{uuid.uuid4().hex[:16].upper()}"
        
        # Prepare request data
        payload = {
            "profile_id": config["profile_id"],
            "tran_type": "sale",
            "tran_class": "ecom",
            "cart_id": cart_id,
            "cart_description": product_info.get("description", product_info["name"]),
            "cart_currency": "SAR",
            "cart_amount": float(amount),
            "return": return_url,
            "callback": return_url.replace("/checkout/", "/api/paytabs/callback/"),
            "customer_details": {
                "name": customer_info["name"],
                "email": customer_info["email"],
                "phone": customer_info.get("phone", "0500000000"),
                "street1": "N/A",
                "city": "Riyadh",
                "state": "RD",
                "country": config["region"],
                "zip": "12345"
            },
            "hide_shipping": True,
            "payment_methods": ["all"]  # Accept all payment methods
        }
        
        headers = {
            "Authorization": config["server_key"],
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        
        if result.get("redirect_url"):
            logger.info(f"PayTabs payment page created: {cart_id}")
            return {
                "success": True,
                "redirect_url": result["redirect_url"],
                "tran_ref": result.get("tran_ref", cart_id),
                "cart_id": cart_id
            }
        else:
            logger.error(f"PayTabs error: {result}")
            return {
                "success": False,
                "message": result.get("message", "Failed to create payment page")
            }
            
    except requests.exceptions.RequestException as e:
        logger.error(f"PayTabs API error: {e}")
        return {
            "success": False,
            "message": f"Payment gateway error: {str(e)}"
        }
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return {
            "success": False,
            "message": f"Error: {str(e)}"
        }

def verify_payment(tran_ref: str):
    """
    Verify payment status with PayTabs
    
    Args:
        tran_ref: Transaction reference from PayTabs
    
    Returns:
        {"success": bool, "status": str, "amount": float, ...}
    """
    config = get_paytabs_config()
    
    # Demo mode
    if config["server_key"] == "demo_mode":
        return {
            "success": True,
            "status": "A",  # Approved
            "message": "Payment successful (demo mode)",
            "demo": True
        }
    
    try:
        url = f"{PAYTABS_BASE_URL}/payment/query"
        
        payload = {
            "profile_id": config["profile_id"],
            "tran_ref": tran_ref
        }
        
        headers = {
            "Authorization": config["server_key"],
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        
        return {
            "success": result.get("payment_result", {}).get("response_status") == "A",
            "status": result.get("payment_result", {}).get("response_status"),
            "message": result.get("payment_result", {}).get("response_message"),
            "amount": result.get("cart_amount"),
            "currency": result.get("cart_currency")
        }
        
    except Exception as e:
        logger.error(f"Error verifying payment: {e}")
        return {
            "success": False,
            "message": str(e)
        }
