import os
import httpx
from fastapi import FastAPI, Request

app = FastAPI()
TOKEN = os.getenv("8555988777:AAEjZ3bIQSeazIxO2EAo8OwBIs8l_qJ_WRg")
# Your Vercel URL where the WebApp is hosted
WEB_APP_URL = "https://winbingoet1.vercel.app"

async def send_telegram(method, payload):
    async with httpx.AsyncClient() as client:
        url = f"https://api.telegram.org/bot8555988777:AAEjZ3bIQSeazIxO2EAo8OwBIs8l_qJ_WRg/{method}"
        return await client.post(url, json=payload)

@app.post("/webhook")
async def handle_webhook(request: Request):
    update = await request.json()
    if "message" not in update:
        return {"ok": True}

    msg = update["message"]
    chat_id = msg["chat"]["id"]
    text = msg.get("text", "")

    # Exact layout from your screenshot
    if text == "/start":
        payload = {
            "chat_id": chat_id,
            "text": "👋 *Welcome to Beteseb Bingo!*\nChoose an Option below.",
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
                    [
                        {"text": "Invite 🔗", "callback_data": "inv"}
                    ]
                ]
            }
        }
        await send_telegram("sendMessage", payload)

    return {"ok": True}

@app.get("/")
async def health():
    return {"status": "Bingo Bot is Online"}