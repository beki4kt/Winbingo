import os
import httpx
from fastapi import FastAPI, Request
# Import your database functions
from api.database import get_user, register_user

app = FastAPI()
TOKEN = os.getenv("8555988777:AAEjZ3bIQSeazIxO2EAo8OwBIs8l_qJ_WRg")
WEB_APP_URL = "https://winbingoet1.vercel.app"
BASE_URL = f"https://api.telegram.org/bot8555988777:AAEjZ3bIQSeazIxO2EAo8OwBIs8l_qJ_WRg"

async def call_api(method, payload):
    async with httpx.AsyncClient() as client:
        return await client.post(f"{BASE_URL}/{method}", json=payload)

@app.post("/api/webhook")
async def handle_webhook(request: Request):
    update = await request.json()
    
    # --- 1. HANDLE CONTACT SHARING (Registration) ---
    if "message" in update and "contact" in update["message"]:
        msg = update["message"]
        chat_id = msg["chat"]["id"]
        contact = msg["contact"]
        phone = contact["phone_number"]
        first_name = contact.get("first_name", "User")
        
        # Save to Supabase via your database.py function
        register_user(chat_id, first_name, phone)
        
        await call_api("sendMessage", {
            "chat_id": chat_id,
            "text": f"✅ *Registration Successful!*\n\nWelcome {first_name}!\nYour account is linked to `{phone}`.\nYou've received a **100 ETB** welcome bonus! 🎁",
            "parse_mode": "Markdown",
            "reply_markup": {"remove_keyboard": True} # Cleans up the big contact button
        })
        return {"ok": True}

    # --- 2. HANDLE TEXT COMMANDS ---
    if "message" in update and "text" in update["message"]:
        chat_id = update["message"]["chat"]["id"]
        text = update["message"]["text"]

        if text == "/start":
            payload = {
                "chat_id": chat_id,
                "text": "👋 *Welcome to Winner Bingo!*\n\nEthiopia's #1 Telegram Bingo Game. Play with your friends and win real money!",
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

    # --- 3. HANDLE BUTTON CLICKS (Callback Queries) ---
    elif "callback_query" in update:
        query = update["callback_query"]
        chat_id = query["message"]["chat"]["id"]
        data = query["data"]

        if data == "reg":
            await call_api("sendMessage", {
                "chat_id": chat_id,
                "text": "📱 To register, please click the button below to share your contact number with us.",
                "reply_markup": {
                    "keyboard": [[{"text": "Share Contact 📱", "request_contact": True}]],
                    "one_time_keyboard": True,
                    "resize_keyboard": True
                }
            })

        elif data == "bal":
            user = get_user(chat_id)
            balance = user['balance'] if user else "0.00 (Unregistered)"
            await call_api("sendMessage", {
                "chat_id": chat_id, 
                "text": f"💵 *Your Wallet*\n\nTotal Balance: `{balance} ETB`", 
                "parse_mode": "Markdown"
            })

        elif data == "dep":
            await call_api("sendMessage", {
                "chat_id": chat_id,
                "text": "💰 *Manual Deposit (Telebirr)*\n\n1. Transfer to: `09XXXXXXXX` (Admin Name)\n2. Min Deposit: 50 ETB\n3. Send screenshot to: @YourSupportHandle\n\n_Your balance will be updated within 15 minutes._",
                "parse_mode": "Markdown"
            })

        elif data == "with":
            await call_api("sendMessage", {
                "chat_id": chat_id,
                "text": "🥳 *Withdrawal*\n\nMinimum: 100 ETB\nMethod: Telebirr\nPlease send your request to @YourSupportHandle with your User ID and Amount."
            })

        await call_api("answerCallbackQuery", {"callback_query_id": query["id"]})

    return {"ok": True}