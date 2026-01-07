import os
from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_user(user_id):
    res = supabase.table("users").select("*").eq("user_id", user_id).execute()
    return res.data[0] if res.data else None

ddef register_user(user_id, first_name, phone):
    # Check if user already exists to avoid double bonuses
    existing = get_user(user_id)
    if not existing:
        data = {
            "user_id": user_id, 
            "first_name": first_name, 
            "phone": phone, 
            "balance": 100.0  # Initial Bonus
        }
        supabase.table("users").insert(data).execute()
    return True