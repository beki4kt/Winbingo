import os
import httpx
from fastapi import FastAPI, Request
from .database import (
    register_user, get_user, update_user_state, 
    get_user_state, clear_user_state, log_withdrawal, 
    update_request_status
)

app = FastAPI()
TOKEN = os.getenv("BOT_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_ID", "0"))
WEBAPP_URL = os.getenv("WEBAPP_URL")
BASE_URL = f"https://api.telegram.org/bot{TOKEN}"

async def call_api(method, payload):
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{BASE_URL}/{method}", json=payload)
        return response.json()

# --- KEYBOARDS ---
def main_menu():
    return {
        "keyboard": [
            [{"text": "🎮 Play Bingo"}],
            [{"text": "💰 Wallet"}, {"text": "👥 Refer & Earn"}],
            [{"text": "⚙️ Help & Support"}]
        ],
        "resize_keyboard": True,
        "persistent": True
    }

@app.post("/webhook")
async def handle_webhook(request: Request):
    update = await request.json()
    
    # --- 1. CALLBACK QUERIES (Buttons) ---
    if "callback_query" in update:
        query = update["callback_query"]
        data = query["data"]
        u_id = query["from"]["id"]

        if data == "wit":
            update_user_state(u_id, "AWAITING_METHOD")
            await call_api("sendMessage", {
                "chat_id": u_id,
                "text": "🏦 *Step 1: Choose Payment Method*\nSelect your preferred bank:",
                "reply_markup": {"inline_keyboard": [[{"text": "Telebirr", "callback_data": "meth_telebirr"}]]},
                "parse_mode": "Markdown"
            })

        elif data == "meth_telebirr":
            update_user_state(u_id, "AWAITING_PHONE", {"method": "Telebirr"})
            await call_api("sendMessage", {"chat_id": u_id, "text": "📱 *Step 2: Enter Telebirr Phone*\nType your 10-digit number (e.g., 0912345678):"})

        elif data == "confirm_wit":
            state_data = get_user_state(u_id)
            if state_data:
                d = state_data['temp_data']
                req_id = log_withdrawal(u_id, d['amount'], d['method'], d['phone'], d['name'])
                await call_api("sendMessage", {"chat_id": u_id, "text": "✅ *Request Sent!*\nYour withdrawal is being processed. You will be notified when it is paid.", "reply_markup": main_menu()})
                clear_user_state(u_id)
                
                # Notify Admin
                await call_api("sendMessage", {
                    "chat_id": ADMIN_ID,
                    "text": f"🚨 *WITHDRAWAL REQUEST*\n\nUser: {u_id}\nMethod: {d['method']}\nPhone: `{d['phone']}`\nName: {d['name']}\nAmt: `{d['amount']} ETB`",
                    "reply_markup": {"inline_keyboard": [[{"text": "✅ Mark Paid", "callback_data": f"paid_{req_id}_{u_id}"}]]},
                    "parse_mode": "Markdown"
                })

        elif data.startswith("paid_"):
            if u_id == ADMIN_ID:
                _, req_id, target_u_id = data.split("_")
                update_request_status(req_id, "completed")
                await call_api("sendMessage", {"chat_id": target_u_id, "text": "🎊 *Payment Sent!*\nYour withdrawal has been processed. Check your account!"})
                await call_api("editMessageText", {"chat_id": ADMIN_ID, "message_id": query["message"]["message_id"], "text": f"✅ Request #{req_id} marked as paid."})
        
        return {"ok": True}

    # --- 2. MESSAGE HANDLERS ---
    if "message" not in update: return {"ok": True}
    msg = update["message"]
    u_id = msg["from"]["id"]
    text = msg.get("text", "")

    # Check for Active State (Withdrawal Flow)
    state_obj = get_user_state(u_id)
    if state_obj:
        state = state_obj['state']
        temp = state_obj['temp_data']

        if state == "AWAITING_PHONE":
            temp['phone'] = text
            update_user_state(u_id, "AWAITING_NAME", temp)
            await call_api("sendMessage", {"chat_id": u_id, "text": "👤 *Step 3: Account Name*\nEnter the full name on the Telebirr account:"})
            return {"ok": True}

        elif state == "AWAITING_NAME":
            temp['name'] = text
            update_user_state(u_id, "AWAITING_AMOUNT", temp)
            await call_api("sendMessage", {"chat_id": u_id, "text": "💰 *Step 4: Amount*\nEnter amount to withdraw (Min 50):"})
            return {"ok": True}

        elif state == "AWAITING_AMOUNT":
            try:
                amt = float(text)
                user = get_user(u_id)
                if amt < 50 or amt > user['balance']:
                    await call_api("sendMessage", {"chat_id": u_id, "text": f"❌ Invalid amount. Minimum is 50 and your balance is {user['balance']}."})
                else:
                    temp['amount'] = amt
                    update_user_state(u_id, "AWAITING_CONFIRM", temp)
                    confirm_text = (
                        f"📝 *Confirm Withdrawal*\n\n"
                        f"🏦 Method: {temp['method']}\n"
                        f"📞 Phone: `{temp['phone']}`\n"
                        f"👤 Name: {temp['name']}\n"
                        f"💰 Amount