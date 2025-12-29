import os
from supabase import create_client, Client

# These should be set in Vercel Environment Variables
URL = os.environ.get("SUPABASE_URL")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(URL, KEY)

def init_db():
    # In Supabase, you usually create tables via their "SQL Editor" web UI.
    # Run the SQL provided below in the Supabase Dashboard to set up.
    pass

def register_user(user_id, name, phone):
    try:
        data = {
            "user_id": user_id,
            "first_name": name,
            "phone": phone,
            "balance": 100.0
        }
        supabase.table("users").insert(data).execute()
        return True
    except Exception as e:
        print(f"Error registering: {e}")
        return False

def get_user(user_id):
    res = supabase.table("users").select("*").eq("user_id", user_id).execute()
    return res.data[0] if res.data else None

def update_balance(user_id, amount, action):
    # 1. Get current user
    user = get_user(user_id)
    if user:
        new_balance = user['balance'] + amount
        # 2. Update balance
        supabase.table("users").update({"balance": new_balance}).eq("user_id", user_id).execute()
        # 3. Log history
        supabase.table("history").insert({
            "user_id": user_id, 
            "amount": amount, 
            "action": action
        }).execute()
        return new_balance