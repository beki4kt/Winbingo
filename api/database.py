import os
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

# --- USER FUNCTIONS ---
def get_user(user_id):
    res = supabase.table("users").select("*").eq("user_id", user_id).execute()
    return res.data[0] if res.data else None

def register_user(user_id, first_name, phone):
    data = {"user_id": user_id, "first_name": first_name, "phone": phone, "balance": 100.0}
    supabase.table("users").upsert(data, on_conflict="user_id").execute()
    return True

# --- STATE MANAGEMENT ---
def update_user_state(user_id, state, temp_data={}):
    supabase.table("user_states").upsert({"user_id": user_id, "state": state, "temp_data": temp_data}).execute()

def get_user_state(user_id):
    res = supabase.table("user_states").select("*").eq("user_id", user_id).execute()
    return res.data[0] if res.data else None

def clear_user_state(user_id):
    supabase.table("user_states").delete().eq("user_id", user_id).execute()

# --- WITHDRAWAL LOGIC ---
def log_withdrawal(u_id, amount, method, phone, name):
    # Deduct balance immediately
    user = get_user(u_id)
    new_bal = float(user['balance']) - float(amount)
    supabase.table("users").update({"balance": new_bal}).eq("user_id", u_id).execute()
    
    # Log request
    data = {
        "user_id": u_id, 
        "amount": amount, 
        "type": "withdrawal", 
        "status": "pending",
        "meta": {"method": method, "phone": phone, "name": name}
    }
    res = supabase.table("requests").insert(data).execute()
    return res.data[0]['id']

def update_request_status(req_id, status):
    supabase.table("requests").update({"status": status}).eq("id", req_id).execute()