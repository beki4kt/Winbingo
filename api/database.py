import os
from supabase import create_client

# Supabase Setup
supabase = create_client(
    os.getenv("SUPABASE_URL", ""), 
    os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
)

def get_user(user_id):
    res = supabase.table("users").select("*").eq("user_id", user_id).execute()
    return res.data[0] if res.data else None

def register_user(user_id, first_name, phone):
    data = {"user_id": user_id, "first_name": first_name, "phone": phone, "balance": 100.0}
    supabase.table("users").upsert(data, on_conflict="user_id").execute()
    return True

def update_user_state(user_id, state, temp_data={}):
    supabase.table("user_states").upsert({"user_id": user_id, "state": state, "temp_data": temp_data}).execute()

def get_user_state(user_id):
    res = supabase.table("user_states").select("*").eq("user_id", user_id).execute()
    return res.data[0] if res.data else None

def clear_user_state(user_id):
    supabase.table("user_states").delete().eq("user_id", user_id).execute()

def log_withdrawal(u_id, amount, method, phone, name):
    user = get_user(u_id)
    new_bal = float(user['balance']) - float(amount)
    supabase.table("users").update({"balance": new_bal}).eq("user_id", u_id).execute()
    res = supabase.table("requests").insert({"user_id": u_id, "amount": amount, "status": "pending", "meta": {"phone": phone, "name": name}}).execute()
    return res.data[0]['id']

def update_request_status(req_id, status):
    supabase.table("requests").update({"status": status}).eq("id", req_id).execute()

def process_transfer(sender_id, receiver_id, amt):
    sender = get_user(sender_id); receiver = get_user(receiver_id)
    if not receiver: return "❌ Recipient not found."
    if sender['balance'] < amt: return "❌ Insufficient funds."
    supabase.table("users").update({"balance": sender['balance'] - amt}).eq("user_id", sender_id).execute()
    supabase.table("users").update({"balance": receiver['balance'] + amt}).eq("user_id", receiver_id).execute()
    return "✅ Transfer Successful!"

def get_history(u_id, category):
    res = supabase.table("requests").select("*").eq("user_id", u_id).limit(10).execute()
    return res.data