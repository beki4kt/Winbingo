import os
from supabase import create_client

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

# --- 1. TRANSFER SYSTEM ---
def process_transfer(sender_id, receiver_id, amount):
    try:
        if amount <= 0: return "❌ Amount must be positive."
        
        # Get sender and receiver
        sender = supabase.table("users").select("balance").eq("user_id", sender_id).single().execute()
        receiver = supabase.table("users").select("balance").eq("user_id", receiver_id).single().execute()
        
        if not receiver.data: return "❌ Recipient ID not found."
        if float(sender.data['balance']) < amount: return "❌ Insufficient balance."
        
        # Execute Transfer
        new_sender_bal = float(sender.data['balance']) - amount
        new_receiver_bal = float(receiver.data['balance']) + amount
        
        supabase.table("users").update({"balance": new_sender_bal}).eq("user_id", sender_id).execute()
        supabase.table("users").update({"balance": new_receiver_bal}).eq("user_id", receiver_id).execute()
        
        # Log to requests/history table for tracking
        supabase.table("requests").insert([
            {"user_id": sender_id, "amount": -amount, "type": "transfer_out", "status": "completed", "meta": {"to": receiver_id}},
            {"user_id": receiver_id, "amount": amount, "type": "transfer_in", "status": "completed", "meta": {"from": sender_id}}
        ]).execute()
        
        return f"✅ Successfully sent {amount} ETB to {receiver_id}."
    except Exception as e:
        return f"❌ Transfer failed: {str(e)}"

# --- 2. HISTORY SYSTEM ---
def get_transaction_history(user_id):
    try:
        res = supabase.table("requests").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(10).execute()
        return res.data
    except:
        return []

# ... (Keep existing User, State, and Withdrawal functions here) ...