import os
import httpx
from fastapi import FastAPI, Request
from .database import (
    register_user, get_user, update_user_state, get_user_state, 
    clear_user_state, log_withdrawal, update_request_status,
    process_transfer, get_transaction_history
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
    if "message" not in update: return {"ok": True}
    
    msg = update["message"]
    u_id = msg["from"]["id"]
    text = msg.get("text", "")

    # --- 1. TRANSFER LOGIC (/transfer UserID Amount) ---
    if text.startswith("/transfer"):
        parts = text.split()
        if len(parts) != 3:
            await call_api("sendMessage", {"chat_id": u_id, "text": "❌ Usage: `/transfer [UserID] [Amount]`", "parse_mode": "Markdown"})
        else:
            try:
                target_id = int(parts[1])
                amount = float(parts[2])
                result = process_transfer(u_id, target_id, amount)
                await call_api("sendMessage", {"chat_id": u_id, "text": result})
                if "✅" in result: # Notify recipient
                    await call_api("sendMessage", {"chat_id": target_id, "text": f"💰 You received {amount} ETB from {u_id}!"})
            except ValueError:
                await call_api("sendMessage", {"chat_id": u_id, "text": "❌ Invalid ID or Amount."})
        return {"ok": True}

    # --- 2. HISTORY LOGIC ---
    elif text == "/check_transaction":
        history = get_transaction_history(u_id)
        if not history:
            response = "📭 No transactions found."
        else:
            response = "📜 *Recent Transactions:*\n\n" + "\n".join(
                [f"🔹 {h['type'].title()}: {h['amount']} ETB ({h['status']})" for h in history[:10]]
            )
        await call_api("sendMessage", {"chat_id": u_id, "text": response, "parse_mode": "Markdown"})
        return {"ok": True}

    # --- 3. COMMAND MENU REPLICATION ---
    elif text == "/balance":
        user = get_user(u_id)
        await call_api("sendMessage", {"chat_id": u_id, "text": f"💳 *Account Balance:*\n`{user['balance']} ETB`", "parse_mode": "Markdown"})

    elif text == "/invite":
        await call_api("sendMessage", {"chat_id": u_id, "text": f"👥 *Invite & Earn*\nLink: `t.me/AddisBingoBot?start={u_id}`", "parse_mode": "Markdown"})

    # ... (Keep existing Registration and Withdrawal state logic here) ...
    
    return {"ok": True}