import os
import httpx
from fastapi import FastAPI, Request

# Change this line to use the full path from the root
try:
    from api.database import (
        register_user, get_user, update_user_state, get_user_state, 
        clear_user_state, log_withdrawal, update_request_status,
        process_transfer, get_history
    )
except ImportError:
    # Local development fallback
    from database import (
        register_user, get_user, update_user_state, get_user_state, 
        clear_user_state, log_withdrawal, update_request_status,
        process_transfer, get_history
    )
app = FastAPI()
TOKEN = os.getenv("BOT_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_ID", "0"))
BASE_URL = f"https://api.telegram.org/bot{TOKEN}"

async def call_api(method, payload):
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{BASE_URL}/{method}", json=payload)
        return response.json()

@app.post("/webhook")
async def handle_webhook(request: Request):
    update = await request.json()
    
    # --- A. HANDLE BUTTONS (CALLBACKS) ---
    if "callback_query" in update:
        query = update["callback_query"]; data = query["data"]; u_id = query["from"]["id"]
        
        if data == "wit":
            update_user_state(u_id, "AWAITING_METHOD")
            await call_api("sendMessage", {"chat_id": u_id, "text": "🏦 *Select Method:*", "reply_markup": {"inline_keyboard": [[{"text": "Telebirr", "callback_data": "meth_telebirr"}]]}, "parse_mode": "Markdown"})
        
        elif data == "meth_telebirr":
            update_user_state(u_id, "AWAITING_PHONE", {"method": "Telebirr"})
            await call_api("sendMessage", {"chat_id": u_id, "text": "📱 Enter Telebirr Number (10 digits):"})

        elif data == "confirm_wit":
            state = get_user_state(u_id)
            d = state['temp_data']
            req_id = log_withdrawal(u_id, d['amount'], d['method'], d['phone'], d['name'])
            await call_api("sendMessage", {"chat_id": u_id, "text": "✅ Withdrawal Request Sent!"})
            clear_user_state(u_id)
            # Notify Admin
            await call_api("sendMessage", {"chat_id": ADMIN_ID, "text": f"🚨 *Withdrawal Alert*\nPhone: {d['phone']}\nAmt: {d['amount']}", "reply_markup": {"inline_keyboard": [[{"text": "Mark Paid", "callback_data": f"paid_{req_id}_{u_id}"}]]}})
        return {"ok": True}

    # --- B. HANDLE COMMANDS & MESSAGES ---
    if "message" not in update: return {"ok": True}
    msg = update["message"]; u_id = msg["from"]["id"]; text = msg.get("text", "")

    # State Check (For Withdrawal Input)
    state_obj = get_user_state(u_id)
    if state_obj:
        state = state_obj['state']; temp = state_obj['temp_data']
        if state == "AWAITING_PHONE":
            temp['phone'] = text; update_user_state(u_id, "AWAITING_NAME", temp)
            await call_api("sendMessage", {"chat_id": u_id, "text": "👤 Enter Account Name:"})
            return {"ok": True}
        elif state == "AWAITING_NAME":
            temp['name'] = text; update_user_state(u_id, "AWAITING_AMOUNT", temp)
            await call_api("sendMessage", {"chat_id": u_id, "text": "💰 Enter Amount:"})
            return {"ok": True}
        elif state == "AWAITING_AMOUNT":
            try:
                amt = float(text); user = get_user(u_id)
                if amt >= 50 and amt <= user['balance']:
                    temp['amount'] = amt; update_user_state(u_id, "AWAITING_CONFIRM", temp)
                    await call_api("sendMessage", {"chat_id": u_id, "text": f"📝 Confirm: {amt} ETB to {temp['phone']}?", "reply_markup": {"inline_keyboard": [[{"text": "Confirm", "callback_data": "confirm_wit"}]]}})
                else: await call_api("sendMessage", {"chat_id": u_id, "text": "❌ Invalid amount."})
            except: pass
            return {"ok": True}

    # Commands Logic
    if text == "/balance":
        user = get_user(u_id)
        await call_api("sendMessage", {"chat_id": u_id, "text": f"💰 *Balance:* `{user['balance']} ETB`", "parse_mode": "Markdown"})
    
    elif text.startswith("/transfer"):
        # Usage: /transfer 123456 50
        try:
            _, target, amt = text.split(); res = process_transfer(u_id, int(target), float(amt))
            await call_api("sendMessage", {"chat_id": u_id, "text": res})
        except: await call_api("sendMessage", {"chat_id": u_id, "text": "❌ Format: `/transfer ID Amount`"})

    elif text == "/check_transaction":
        history = get_history(u_id, "transaction")
        res = "🧾 *Transactions:*\n" + "\n".join([f"• {h['type']}: {h['amount']} ETB" for h in history])
        await call_api("sendMessage", {"chat_id": u_id, "text": res, "parse_mode": "Markdown"})

    elif text == "/game_history":
        history = get_history(u_id, "game")
        res = "🎮 *Game History:*\n" + "\n".join([f"• {h['game']}: {h['result']} ({h['amount']} ETB)" for h in history])
        await call_api("sendMessage", {"chat_id": u_id, "text": res, "parse_mode": "Markdown"})

    return {"ok": True}
    from telegram import ReplyKeyboardMarkup, KeyboardButton

def main_menu():
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton("🎮 Play Bingo")],
            [KeyboardButton("💰 Wallet"), KeyboardButton("👥 Refer & Earn")],
            [KeyboardButton("⚙️ Help & Support")]
        ],
        resize_keyboard=True, # Makes buttons smaller and professional
        is_persistent=True    # Keeps the menu visible even when typing
    )