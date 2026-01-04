import os
import httpx
from fastapi import FastAPI, Request

# VERCEL FIX: Use a robust import strategy for serverless functions
try:
    from api.database import (
        register_user, get_user, update_user_state, get_user_state, 
        clear_user_state, log_withdrawal, update_request_status,
        process_transfer, get_history
    )
except ImportError:
    from database import (
        register_user, get_user, update_user_state, get_user_state, 
        clear_user_state, log_withdrawal, update_request_status,
        process_transfer, get_history
    )

app = FastAPI(redirect_slashes=False) # Add this to stop FastAPI from redirecting

@app.post("/webhook")
@app.post("/webhook/") # Add both versions to be safe
async def handle_webhook(request: Request):
    # ... your code ...
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
    print(f"DEBUG: Received Update -> {update}") # Check Vercel Logs for this!

    if "message" not in update: return {"ok": True}
    
    msg = update["message"]
    u_id = msg["from"]["id"]
    text = msg.get("text", "")

    # Basic response test
    if text == "/start":
        await call_api("sendMessage", {
            "chat_id": u_id, 
            "text": "🚀 *Bot Online!*\nI am connected to the database.",
            "parse_mode": "Markdown"
        })
    
    # ... (Rest of your command logic goes here) ...

    return {"ok": True}

@app.get("/")
async def health_check():
    return {"status": "Vercel server is running!"}