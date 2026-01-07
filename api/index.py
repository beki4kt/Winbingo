import os
import httpx
from fastapi import FastAPI, Request

app = FastAPI()
TOKEN = os.getenv("8555988777:AAEjZ3bIQSeazIxO2EAo8OwBIs8l_qJ_WRg")
WEB_APP_URL = "https://winbingoet1.vercel.app"

async def call_api(method, payload):
    async with httpx.AsyncClient() as client:
        return await client.post(f"https://api.telegram.org/bot8555988777:AAEjZ3bIQSeazIxO2EAo8OwBIs8l_qJ_WRg/{method}", json=payload)

@app.post("/webhook")
@app.post("/api/webhook") # Support both paths
async def handle_webhook(request: Request):
    try:
        update = await request.json()
        print(f"DEBUG: {update}") # Check Vercel Functions logs

        if "message" in update:
            chat_id = update["message"]["chat"]["id"]
            text = update["message"].get("text", "")

            if text == "/start":
                payload = {
                    "chat_id": chat_id,
                    "text": "👋 *Welcome to Winner Bingo!*\nChoose an option below.",
                    "parse_mode": "Markdown",
                    "reply_markup": {
                        "inline_keyboard": [
                            [
                                {"text": "Play 🎮", "web_app": {"url": WEB_APP_URL}},
                                {"text": "Register 📝", "callback_data": "reg"}
                            ],
                            [
                                {"text": "Check Balance 💵", "callback_data": "bal"},
                                {"text": "Deposit 💰", "callback_data": "dep"}
                            ],
                            [
                                {"text": "Contact Support...", "callback_data": "sup"},
                                {"text": "Instruction 📖", "callback_data": "inst"}
                            ],
                            [
                                {"text": "Transfer 🎁", "callback_data": "trans"},
                                {"text": "Withdraw 🥳", "callback_data": "with"}
                            ],
                            [{"text": "Invite 🔗", "callback_data": "inv"}]
                        ]
                    }
                }
                await call_api("sendMessage", payload)
        
        return {"ok": True}
    except Exception as e:
        print(f"ERROR: {e}")
        return {"ok": True}

@app.get("/")
async def health():
    return {"status": "Bot Online"}