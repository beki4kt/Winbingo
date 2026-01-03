import os
from supabase import create_client

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

def get_user(user_id):
    res = supabase.table("users").select("*").eq("user_id", user_id).execute()
    return res.data[0] if res.data else None

def update_user_state(u_id, state, temp={}):
    supabase.table("user_states").upsert({"user_id": u_id, "state": state, "temp_data": temp}).execute()

def get_user_state(u_id):
    res = supabase.table("user_states").select("*").eq("user_id", u_id).execute()
    return res.data[0] if res.data else None

def clear_user_state(u_id):
    supabase.table("user_states").delete().eq("user_id", u_id).execute()

def process_transfer(sender_id, receiver_id, amt):
    sender = get_user(sender_id); receiver = get_user(receiver_id)
    if not receiver: return "❌ Recipient not found."
    if sender['balance'] < amt: return "❌ Insufficient funds."
    
    # Update Balances
    supabase.table("users").update({"balance": sender['balance'] - amt}).eq("user_id", sender_id).execute()
    supabase.table("users").update({"balance": receiver['balance'] + amt}).eq("user_id", receiver_id).execute()
    
    # Log History
    supabase.table("history").insert([
        {"user_id": sender_id, "type": "transfer", "amount": -amt, "category": "transaction"},
        {"user_id": receiver_id, "type": "transfer", "amount": amt, "category": "transaction"}
    ]).execute()
    return "✅ Transfer Successful!"

def get_history(u_id, category):
    res = supabase.table("history").select("*").eq("user_id", u_id).eq("category", category).order("created_at", desc=True).limit(5).execute()
    return res.data

def log_withdrawal(u_id, amt, method, phone, name):
    user = get_user(u_id)
    supabase.table("users").update({"balance": user['balance'] - amt}).eq("user_id", u_id).execute()
    res = supabase.table("requests").insert({"user_id": u_id, "amount": amt, "status": "pending", "meta": {"phone": phone, "name": name}}).execute()
    return res.data[0]['id']