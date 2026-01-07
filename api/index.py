import os
import httpx
from fastapi import FastAPI, Request
try:
    from api.database import (
        get_user, register_user, update_user_state, 
        get_user_state, clear_user_state
    )
except ImportError:
    from database import get_user, register_user, update_user_state, get_user_state, clear_user_state

app = FastAPI()
TOKEN = os.getenv("8555988777:AAEjZ3bIQSeazIxO2EAo8OwBIs8l_qJ_WRg")
WEB_APP_URL = "https://winbingoet1.vercel.app"
BASE_URL = f"https://api.telegram.org/bot8555988777:AAEjZ3bIQSeazIxO2EAo8OwBIs8l_qJ_WRg"

async def call_api(method, payload):
    async with httpx.AsyncClient() as client:
        return await client.post(f"{BASE_URL}/{method}", json=payload)

@app.post("/webhook")
async def handle_webhook(request: Request):
    update = await request.json()
    
    # --- 1. HANDLE TEXT MESSAGES ---
    if "message" in update:
        msg = update["message"]
        chat_id = msg["chat"]["id"]
        
        # Handle Contact Sharing (Registration)
        if "contact" in update["message"]:
            contact = update["message"]["contact"]
            phone = contact["phone_number"]
            first_name = contact.get("first_name", "User")
            
            # Save to Database
            register_user(chat_id, first_name, phone)
            
            await call_api("sendMessage", {
                "chat_id": chat_id,
                "text": "✅ *Registration Successful!*\n\nYour account is linked to " + phone + ".\nYou received a 100 ETB bonus!",
                "parse_mode": "Markdown",
                "reply_markup": {"remove_keyboard": True} # Hide the "Share Contact" button
            })
            return {"ok": True}

        text = msg.get("text", "")
        if text == "/start":
            payload = {
                "chat_id": chat_id,
                "text": "👋 *Welcome to Winner Bingo!*\nChoose an option below.",
                "parse_mode": "Markdown",
                "reply_markup": {
                    "inline_keyboard": [
                        [{"text": "Play 🎮", "web_app": {"url": WEB_APP_URL}}, {"text": "Register 📝", "callback_data": "reg"}],
                        [{"text": "Check Balance 💵", "callback_data": "bal"}, {"text": "Deposit 💰", "callback_data": "dep"}],
                        [{"text": "Transfer 🎁", "callback_data": "trans"}, {"text": "Withdraw 🥳", "callback_data": "with"}],
                        [{"text": "Invite 🔗", "callback_data": "inv"}]
                    ]
                }
            }
            await call_api("sendMessage", payload)

    # --- 2. HANDLE BUTTON CLICKS ---
    elif "callback_query" in update:
        query = update["callback_query"]
        chat_id = query["message"]["chat"]["id"]
        data = query["data"]

        if data == "reg":
            # Request Phone Number via Keyboard
            await call_api("sendMessage", {
                "chat_id": chat_id,
                "text": "📱 Please click the button below to share your contact and complete registration.",
                "reply_markup": {
                    "keyboard": [[{"text": "Share Contact 📱", "request_contact": True}]],
                    "one_time_keyboard": True,
                    "resize_keyboard": True
                }
            })

        elif data == "bal":
            user = get_user(chat_id)
            balance = user['balance'] if user else "0.00"
            await call_api("sendMessage", {"chat_id": chat_id, "text": f"💵 *Your Wallet Balance:*\n\n`{balance} ETB`", "parse_mode": "Markdown"})

        elif data == "dep":
            await call_api("sendMessage", {
                "chat_id": chat_id, 
                "text": "💰 *Manual Deposit (Telebirr)*\n\n1. Send amount to: `0912345678`\n2. Name: Winner Bingo Admin\n3. Send screenshot to @Support_User",
                "parse_mode": "Markdown"
            })

        elif data == "with":
            await call_api("sendMessage", {
                "chat_id": chat_id,
                "text": "🥳 *Withdrawal Request*\n\nMinimum: 100 ETB\nMethod: Telebirr\nPlease contact @Support_User with your ID and amount."
            })

        await call_api("answerCallbackQuery", {"callback_query_id": query["id"]})

    return {"ok": True}