import os
import httpx
from fastapi import FastAPI, Request

# Vercel-friendly import strategy
try:
    from api.database import (
        get_user, register_user, update_user_state, 
        get_user_state, clear_user_state, log_withdrawal, 
        process_transfer, get_history
    )
except ImportError:
    from database import (
        get_user, register_user, update_user_state, 
        get_user_state, clear_user_state, log_withdrawal, 
        process_transfer, get_history
    )

app = FastAPI()
TOKEN = os.getenv("BOT_TOKEN")
BASE_URL = f"https://api.telegram.org/bot{TOKEN}"

async def call_api(method, payload):
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{BASE_URL}/{method}", json=payload)
        return response.json()

@app.post("/webhook")
async def handle_webhook(request: Request):
    try:
        update = await request.json()
        print(f"DEBUG_RECEIVE: {update}") # Check 'Functions' logs in Vercel for this

        if "message" not in update:
            return {"ok": True}

        msg = update["message"]
        u_id = msg["from"]["id"]
        first_name = msg["from"].get("first_name", "User")
        text = msg.get("text", "")

        # 1. Start Command / Registration
        if text == "/start":
            user = get_user(u_id)
            if not user:
                # Register new user with 100 ETB bonus
                register_user(u_id, first_name, "Not Provided")
                welcome_text = f"👋 Hello {first_name}!\n\nWelcome to Bingo ET! You've received a 100 ETB bonus. 🎁\n\nUse the Menu button to explore."
            else:
                welcome_text = f"Welcome back, {first_name}!\nYour balance: {user['balance']} ETB"
            
            await call_api("sendMessage", {"chat_id": u_id, "text": welcome_text, "parse_mode": "Markdown"})

        # 2. Balance Check
        elif text == "/balance":
            user = get_user(u_id)
            await call_api("sendMessage", {"chat_id": u_id, "text": f"💰 *Current Balance:* `{user['balance']} ETB`", "parse_mode": "Markdown"})

        # 3. Handle Transfers
        elif text.startswith("/transfer"):
            try:
                _, target_id, amount = text.split()
                result = process_transfer(u_id, int(target_id), float(amount))
                await call_api("sendMessage", {"chat_id": u_id, "text": result})
            except:
                await call_api("sendMessage", {"chat_id": u_id, "text": "❌ Use: `/transfer [ID] [Amount]`"})

        return {"ok": True}

    except Exception as e:
        print(f"CRITICAL_ERROR: {str(e)}")
        return {"ok": False, "error": str(e)}

@app.get("/")
@app.get("/api")
async def health_check():
    return {"status": "Vercel server is live!", "token_detected": bool(TOKEN)}