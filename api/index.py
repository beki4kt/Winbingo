import os
import json
import httpx
from fastapi import FastAPI, Request
from .database import register_user, get_user, update_balance

app = FastAPI()
TOKEN = os.getenv("BOT_TOKEN")
# Make sure WEBAPP_URL is in Vercel Env Vars (e.g. https://your-github.io/repo/)
WEBAPP_URL = os.getenv("WEBAPP_URL") 
BASE_URL = f"https://api.telegram.org/bot{TOKEN}"

async def call_api(method, payload):
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{BASE_URL}/{method}", json=payload)
        return response.json()

@app.post("/webhook")
async def handle_webhook(request: Request):
    update = await request.json()
    
    # 1. Handle Messages (Text & /start)
    if "message" in update:
        msg = update["message"]
        chat_id = msg["chat"]["id"]
        user_id = msg["from"]["id"]
        first_name = msg["from"].get("first_name", "Player")

        # --- COMMAND: /start ---
        if "text" in msg and msg["text"] == "/start":
            user = get_user(user_id)
            if not user:
                # Ask for registration
                payload = {
                    "chat_id": chat_id,
                    "text": f"👋 Welcome {first_name} to Addis Bingo!\n\nPlease register to get your 100 bonus coins.",
                    "reply_markup": {
                        "keyboard": [[{"text": "📱 Register with Phone", "request_contact": True}]],
                        "resize_keyboard": True, "one_time_keyboard": True
                    }
                }
            else:
                # Show Main Menu
                payload = {
                    "chat_id": chat_id,
                    "text": f"🕹 Welcome back, {user['first_name']}!\n💰 Balance: {user['balance']} coins",
                    "reply_markup": {
                        "inline_keyboard": [[{"text": "🎮 Play Bingo Now", "web_app": {"url": WEBAPP_URL}}]]
                    }
                }
            await call_api("sendMessage", payload)

        # --- CONTACT: Phone Registration ---
        elif "contact" in msg:
            contact = msg["contact"]
            if register_user(user_id, first_name, contact["phone_number"]):
                await call_api("sendMessage", {
                    "chat_id": chat_id, 
                    "text": "✅ Registered! 100 coins added. Type /start to play!"
                })

        # --- WEBAPP DATA: Handling Win/Loss ---
        elif "web_app_data" in msg:
            data = json.loads(msg["web_app_data"]["data"])
            if "win" in data:
                amount = data["win"]
                new_bal = update_balance(user_id, amount, "Bingo Win")
                await call_api("sendMessage", {
                    "chat_id": chat_id, 
                    "text": f"🎊 BINGO! You won {amount} coins!\nNew Balance: {new_bal}"
                })

    return {"ok": True}

@app.get("/")
def health():
    return {"status": "Bingo Bot is Online"}