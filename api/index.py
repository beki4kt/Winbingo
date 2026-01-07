import os
import httpx
from fastapi import FastAPI, Request

app = FastAPI()
TOKEN = os.getenv("8555988777:AAEjZ3bIQSeazIxO2EAo8OwBIs8l_qJ_WRg")
WEB_APP_URL = "https://winbingoet1.vercel.app"

# Safety Import: If database.py fails, the bot will still run but show an error message
try:
    from api.database import get_user, register_user
    DB_CONNECTED = True
except Exception as e:
    print(f"DATABASE IMPORT ERROR: {e}")
    DB_CONNECTED = False

async def call_api(method, payload):
    async with httpx.AsyncClient() as client:
        return await client.post(f"https://api.telegram.org/bot8555988777:AAEjZ3bIQSeazIxO2EAo8OwBIs8l_qJ_WRg/{method}", json=payload)

@app.post("/webhook")
async def handle_webhook(request: Request):
    try:
        update = await request.json()
        if "message" in update:
            chat_id = update["message"]["chat"]["id"]
            
            # Handle Contact Share (Registration)
            if "contact" in update["message"]:
                if not DB_CONNECTED:
                    await call_api("sendMessage", {"chat_id": chat_id, "text": "⚠️ Database connection error. Please try again later."})
                    return {"ok": True}
                
                contact = update["message"]["contact"]
                register_user(chat_id, contact.get("first_name", "User"), contact["phone_number"])
                await call_api("sendMessage", {
                    "chat_id": chat_id, 
                    "text": "✅ *Registered Successfully!*", 
                    "parse_mode": "Markdown",
                    "reply_markup": {"remove_keyboard": True}
                })
                return {"ok": True}

            # Standard /start Command
            text = update["message"].get("text", "")
            if text == "/start":
                payload = {
                    "chat_id": chat_id,
                    "text": "👋 *Welcome to Winner Bingo!*\nChoose an option below.",
                    "parse_mode": "Markdown",
                    "reply_markup": {
                        "inline_keyboard": [
                            [{"text": "Play 🎮", "web_app": {"url": WEB_APP_URL}}, {"text": "Register 📝", "callback_data": "reg"}],
                            [{"text": "Check Balance 💵", "callback_data": "bal"}, {"text": "Deposit 💰", "callback_data": "dep"}],
                            [{"text": "Transfer 🎁", "callback_data": "trans"}, {"text": "Withdraw 🥳", "callback_data": "with"}]
                        ]
                    }
                }
                await call_api("sendMessage", payload)

        elif "callback_query" in update:
            query = update["callback_query"]
            chat_id = query["message"]["chat"]["id"]
            data = query["data"]

            if data == "reg":
                await call_api("sendMessage", {
                    "chat_id": chat_id,
                    "text": "📱 Click below to share your contact.",
                    "reply_markup": {"keyboard": [[{"text": "Share Contact 📱", "request_contact": True}]], "one_time_keyboard": True, "resize_keyboard": True}
                })
            
            elif data == "bal":
                balance = "0.00"
                if DB_CONNECTED:
                    user = get_user(chat_id)
                    balance = user['balance'] if user else "0.00 (Not Registered)"
                await call_api("sendMessage", {"chat_id": chat_id, "text": f"💵 *Balance:* `{balance} ETB`", "parse_mode": "Markdown"})

            await call_api("answerCallbackQuery", {"callback_query_id": query["id"]})

        return {"ok": True}
    except Exception as e:
        print(f"CRASH: {e}")
        return {"ok": True}