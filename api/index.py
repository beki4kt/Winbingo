import os
import json
import httpx
from fastapi import FastAPI, Request
from .database import register_user, get_user, update_balance, log_request, update_request_status, get_pending_requests

app = FastAPI()
@app.get("/")
async def root():
    return {"status": "running", "message": "Addis Bingo Bot is Online"}
TOKEN = os.getenv("BOT_TOKEN")
ADMIN_ID = int(os.getenv("ADMIN_ID", "0")) # Add your ID to Vercel Env Vars!
WEBAPP_URL = os.getenv("WEBAPP_URL")
BASE_URL = f"https://api.telegram.org/bot{TOKEN}"

async def call_api(method, payload):
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{BASE_URL}/{method}", json=payload)
        return response.json()

@app.post("/webhook")
async def handle_webhook(request: Request):
    update = await request.json()
    
    # --- 1. HANDLE BUTTON CLICKS (CALLBACK QUERIES) ---
    if "callback_query" in update:
        query = update["callback_query"]
        data = query["data"]
        admin_chat_id = query["message"]["chat"]["id"]
        
        # Format: approve_reqID_userID_amount
        if data.startswith("approve"):
            _, req_id, t_id, amt = data.split("_")
            # Update Database
            update_balance(int(t_id), float(amt), "Manual Deposit")
            update_request_status(req_id, "approved")
            
            # Notify User & Admin
            await call_api("sendMessage", {"chat_id": t_id, "text": f"✅ Your deposit of {amt} coins was approved!"})
            await call_api("editMessageText", {
                "chat_id": admin_chat_id,
                "message_id": query["message"]["message_id"],
                "text": f"✅ Approved Request #{req_id} for User {t_id}"
            })

        elif data.startswith("reject"):
            _, req_id, t_id = data.split("_")
            update_request_status(req_id, "rejected")
            await call_api("sendMessage", {"chat_id": t_id, "text": "❌ Your deposit request was rejected. Contact support."})
            await call_api("editMessageText", {
                "chat_id": admin_chat_id,
                "message_id": query["message"]["message_id"],
                "text": f"❌ Rejected Request #{req_id}"
            })
        return {"ok": True}

    # --- 2. HANDLE MESSAGES (TEXT & PHOTOS) ---
    if "message" in update:
        msg = update["message"]
        chat_id = msg["chat"]["id"]
        user_id = msg["from"]["id"]
        first_name = msg["from"].get("first_name", "Player")

        # HANDLE PHOTOS (RECEIPTS)
        if "photo" in msg:
            req_id = log_request(user_id, 100, "deposit") # Defaulting to 100 for now
            
            # Forward to Admin
            await call_api("forwardMessage", {"chat_id": ADMIN_ID, "from_chat_id": chat_id, "message_id": msg["message_id"]})
            
            # Send Admin Control Panel
            admin_payload = {
                "chat_id": ADMIN_ID,
                "text": f"🔔 **New Deposit**\nUser: {first_name}\nID: `{user_id}`\nReq ID: {req_id}",
                "parse_mode": "Markdown",
                "reply_markup": {
                    "inline_keyboard": [[
                        {"text": "✅ Approve 100", "callback_data": f"approve_{req_id}_{user_id}_100"},
                        {"text": "❌ Reject", "callback_data": f"reject_{req_id}_{user_id}"}
                    ]]
                }
            }
            await call_api("sendMessage", admin_payload)
            await call_api("sendMessage", {"chat_id": chat_id, "text": "⏳ Receipt received! Waiting for admin approval."})

        # HANDLE TEXT COMMANDS
        if "text" in msg:
            text = msg["text"]

            if text == "/start":
                user = get_user(user_id)
                if not user:
                    payload = {
                        "chat_id": chat_id,
                        "text": "👋 Welcome! Please register to start playing.",
                        "reply_markup": {"keyboard": [[{"text": "📱 Register", "request_contact": True}]], "resize_keyboard": True}
                    }
                else:
                    payload = {
                        "chat_id": chat_id,
                        "text": f"🕹 Welcome back!\n💰 Balance: {user['balance']} coins",
                        "reply_markup": {"inline_keyboard": [[{"text": "🎮 Play Bingo", "web_app": {"url": WEBAPP_URL}}]]}
                    }
                await call_api("sendMessage", payload)

            elif text == "/deposit":
                await call_api("sendMessage", {
                    "chat_id": chat_id,
                    "text": "🏦 **CBE:** 1000XXXXXXXX\n**Telebirr:** 09XXXXXXXX\n\nSend a screenshot of the receipt here."
                })

            elif text == "/admin" and user_id == ADMIN_ID:
                pending = get_pending_requests()
                if not pending:
                    await call_api("sendMessage", {"chat_id": ADMIN_ID, "text": "✅ No pending requests."})
                else:
                    report = "📝 **Pending:**\n" + "\n".join([f"ID {r['id']}: {r['user_id']}" for r in pending])
                    await call_api("sendMessage", {"chat_id": ADMIN_ID, "text": report})

            elif "web_app_data" in msg:
                # Same logic as before for game wins
                pass

    return {"ok": True}
    @app.get("/")
def home():
    return {"status": "Online", "message": "Addis Bingo Bot is running"}