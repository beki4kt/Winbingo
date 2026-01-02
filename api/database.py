import os
from supabase import create_client

# Initialize Supabase
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

# --- USER FUNCTIONS ---

def register_user(user_id, first_name, phone):
    try:
        data = {
            "user_id": user_id,
            "first_name": first_name,
            "phone": phone,
            "balance": 100.0  # Sign-up bonus
        }
        supabase.table("users").insert(data).execute()
        return True
    except Exception as e:
        print(f"Registration Error: {e}")
        return False

def get_user(user_id):
    try:
        res = supabase.table("users").select("*").eq("user_id", user_id).execute()
        return res.data[0] if res.data else None
    except:
        return None

def update_balance(user_id, amount, action):
    try:
        user = get_user(user_id)
        if user:
            new_balance = float(user['balance']) + float(amount)
            supabase.table("users").update({"balance": new_balance}).eq("user_id", user_id).execute()
            
            # Log to transaction history
            supabase.table("history").insert({
                "user_id": user_id, 
                "amount": amount, 
                "action": action
            }).execute()
            return new_balance
    except Exception as e:
        print(f"Balance Update Error: {e}")
    return 0

# --- ADMIN REQUEST FUNCTIONS ---

def log_request(user_id, amount, req_type):
    """Logs a pending deposit or withdrawal request."""
    try:
        data = {
            "user_id": user_id,
            "amount": amount,
            "type": req_type,
            "status": "pending"
        }
        res = supabase.table("requests").insert(data).execute()
        return res.data[0]['id'] if res.data else 0
    except Exception as e:
        print(f"Log Request Error: {e}")
        return 0

def update_request_status(req_id, status):
    """Updates status to 'approved' or 'rejected'."""
    try:
        supabase.table("requests").update({"status": status}).eq("id", req_id).execute()
        return True
    except Exception as e:
        print(f"Update Status Error: {e}")
        return False

def get_pending_requests():
    """Fetches all requests waiting for admin action."""
    try:
        res = supabase.table("requests").select("*").eq("status", "pending").execute()
        return res.data
    except:
        return []