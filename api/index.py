import os
import httpx
from fastapi import FastAPI, Request

app = FastAPI()

TOKEN = os.getenv("8555988777:AAEjZ3bIQSeazIxO2EAo8OwBIs8l_qJ_WRg")
WEB_APP_URL = "https://winbingoet1.vercel.app" # Your WebApp URL
BASE_URL = f"https://api.telegram.org/bot8555988777:AAEjZ3bIQSeazIxO2EAo8OwBIs8l_qJ_WRg"

async def call_api(method, payload):
    async with httpx.AsyncClient() as client:
        return await client.post(f"{BASE_URL}/{method}", json=payload)

@app.post("/webhook")
async def handle_webhook(request: Request):
    update = await request.json()
    
    # Handle normal messages (like /start)
    if "message" in update:
        msg = update["message"]
        chat_id = msg["chat"]["id"]
        text = msg.get("text", "")

        if text == "/start":
            payload = {
                "chat_id": chat_id,
                "text": "👋 *Welcome to Winner Bingo!*\nChoose an option below to get started.",
                "parse_mode": "Markdown",
                "reply_markup": {
                    "inline_keyboard": [
                        [
                            {"text": "Play 🎮", "web_app": {"url": WEB_APP_URL}},
                            {"text": "Register 📝", "callback_data": "register"}
                        ],
                        [
                            {"text": "Check Balance 💵", "callback_data": "balance"},
                            {"text": "Deposit 💰", "callback_data": "deposit"}
                        ],
                        [
                            {"text": "Contact Support...", "callback_data": "support"},
                            {"text": "Instruction 📖", "callback_data": "instruction"}
                        ],
                        [
                            {"text": "Transfer 🎁", "callback_data": "transfer"},
                            {"text": "Withdraw 🥳", "callback_data": "withdraw"}
                        ],
                        [{"text": "Invite 🔗", "callback_data": "invite"}]
                    ]
                }
            }
            await call_api("sendMessage", payload)

    # Handle button clicks (Callback Queries)
    elif "callback_query" in update:
        query = update["callback_query"]
        chat_id = query["message"]["chat"]["id"]
        data = query["data"]

        # Define responses for each button
        responses = {
            "register": "📝 Please send your phone number to register.",
            "balance": "💵 Your current balance is: *0.00 ETB*",
            "deposit": "💰 Min deposit: 50 ETB. Send to: [Bank Details]",
            "support": "☎️ Support: @YourSupportUsername",
            "instruction": "📖 Rules: 1. Pick numbers. 2. Win big!",
            "transfer": "🎁 Send money to friends using `/transfer [ID] [Amount]`",
            "withdraw": "🥳 Minimum withdrawal is 100 ETB.",
            "invite": f"🔗 Your Invite Link: `https://t.me/your_bot?start={chat_id}`"
        }

        text = responses.get(data, "Feature coming soon!")
        
        # Answer the callback to stop the loading spinner on the button
        await call_api("answerCallbackQuery", {"callback_query_id": query["id"]})
        # Send the response message
        await call_api("sendMessage", {"chat_id": chat_id, "text": text, "parse_mode": "Markdown"})

    return {"ok": True}

@app.get("/")
async def health():
    return {"status": "Bingo Bot is live"}