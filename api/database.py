import os
from supabase import create_client

# These are pulled from your Vercel Environment Variables
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

def register_user(user_id, first_name, phone):
    try:
        data = {
            "user_id": user_id,
            "first_name": first_name,
            "phone": phone,
            "balance": 100.0  # Starting bonus
        }
        supabase.table("users").insert(data).execute()
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

def get_user(user_id):
    try:
        res = supabase.table("users").select("*").eq("user_id", user_id).execute()
        return res.data[0] if res.data else None
    except:
        return None

def update_balance(user_id, amount, action):
    user = get_user(user_id)
    if user:
        new_balance = user['balance'] + amount
        supabase.table("users").update({"balance": new_balance}).eq("user_id", user_id).execute()
        # Log to history
        supabase.table("history").insert({"user_id": user_id, "amount": amount, "action": action}).execute()
        return new_balance
    return 0