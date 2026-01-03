import os
import json
import httpx
import hashlib
import hmac
from fastapi import FastAPI, Request, HTTPException
from .database import (
    register_user, get_user, update_balance, log_request, 
    update_request_status, get_pending_requests, get_all_users
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

@app.get("/")
async def root():
    return {"status": "running", "message": "Addis Bingo Bot Backend"}

# --- BROADCAST LOGIC ---
@app.post("/api/broadcast")
async def broadcast(request: Request):
    data = await request.json()
    # Security check: Match Admin ID
    if int(data.get("admin_id")) != ADMIN_ID:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    msg = data.get("message")
    users = get_all_users()
    count = 0
    for user in users:
        try:
            await call_api("sendMessage", {
                "chat_id": user['user_id'], 
                "text": f"📢 **ANNOUNCEMENT**\n\n{msg}", 
                "parse_mode": "Markdown"
            })
            count += 1
        except:
            continue
    return {"status": "success", "sent_to": count}

# --- WEBHOOK LOGIC ---
@app.post("/webhook")
async def handle_webhook(request: Request):
    update = await request.json()
    
    # Callback Query (Buttons)
    if "callback_query" in update:
        query = update["callback_query"]
        data = query["data"]
        admin_chat_id = query["message"]["chat"]["id"]
        
        if data.startswith("approve"):
            _, req_id, t_id, amt = data.split("_")
            update_balance(int(t_id), float(amt), "Manual Deposit")
            update_request_status(req_id, "approved")
            await call_api("sendMessage", {"chat_id": t_id, "text": f"✅ Your deposit of {amt} coins was approved!"})
            await call_api("editMessageText", {
                "chat_id": admin_chat_id,
                "message_id": query["message"]["message_id"],
                "text": f"✅ Approved Request #{req_id}"
            })
        return {"ok": True}

    # Standard Messages
    if "message" in update:
        msg = update["message"]
        chat_id = msg["chat"]["id"]
        user_id = msg["from"]["id"]
        
        if "text" in msg:
            text = msg["text"]
            if text == "/start":
                user = get_user(user_id)
                if not user:
                    payload = {
                        "chat_id": chat_id,
                        "text": "👋 Welcome! Please register.",
                        "reply_markup": {"keyboard": [[{"text": "📱 Register", "request_contact": True}]], "resize_keyboard": True}
                    }
                else:
                    payload = {
                        "chat_id": chat_id,
                        "text": f"🕹 Welcome back! Balance: {user['balance']}",
                        "reply_markup": {"inline_keyboard": [[{"text": "🎮 Play Bingo", "web_app": {"url": WEBAPP_URL}}]]}
                    }
                await call_api("sendMessage", payload)
            
            elif text == "/deposit":
                await call_api("sendMessage", {"chat_id": chat_id, "text": "Send a screenshot of your payment."})

    return {"ok": True}