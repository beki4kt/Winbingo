import os
import asyncio
from fastapi import FastAPI, Request
from telegram import Update, Bot, KeyboardButton, ReplyKeyboardMarkup

# 1. Initialize FastAPI
app = FastAPI()

# 2. Get Token from Vercel Environment Variables
TOKEN = os.getenv("BOT_TOKEN")
bot = Bot(token=TOKEN)

@app.post("/webhook")
async def handle_webhook(request: Request):
    try:
        # Get the JSON data from Telegram
        payload = await request.json()
        update = Update.de_json(payload, bot)

        # Check if there is a message and if it's /start
        if update.message and update.message.text:
            text = update.message.text
            user_id = update.effective_user.id
            
            if text == "/start":
                # SIMPLE RESPONSE TEST
                await bot.send_message(
                    chat_id=user_id, 
                    text="✅ Bot is alive on Vercel!\n\nIf you see this, the connection is working. Now we can re-enable the database."
                )
                
                # REGISTRATION BUTTON TEST
                kb = [[KeyboardButton("📱 Register Phone", request_contact=True)]]
                await bot.send_message(
                    chat_id=user_id,
                    text="Please share your contact:",
                    reply_markup=ReplyKeyboardMarkup(kb, resize_keyboard=True, one_time_keyboard=True)
                )

        return {"status": "ok"}
    except Exception as e:
        print(f"Error: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/")
def home():
    return {"message": "Server is running. Send a POST request to /webhook"}
    import os
import httpx
from fastapi import FastAPI, Request

app = FastAPI()

TOKEN = os.getenv("BOT_TOKEN")
# Make sure your WEBAPP_URL is also in Vercel Env Vars!
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://your-github-game-url.com")

async def send_telegram_request(method, payload):
    url = f"https://api.telegram.org/bot{TOKEN}/{method}"
    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload)
        return resp.json()

@app.post("/webhook")
async def handle_webhook(request: Request):
    data = await request.json()
    
    # Check if this is a message
    if "message" in data:
        chat_id = data["message"]["chat"]["id"]
        text = data["message"].get("text", "")

        if text == "/start":
            # Send the Welcome Message with the Game Button
            payload = {
                "chat_id": chat_id,
                "text": "🎱 Welcome to Addis Bingo!\n\nClick the button below to start playing and win coins!",
                "reply_markup": {
                    "inline_keyboard": [[
                        {
                            "text": "🎮 Play Bingo Now",
                            "web_app": {"url": WEBAPP_URL}
                        }
                    ]]
                }
            }
            await send_telegram_request("sendMessage", payload)
            
    return {"ok": True}

@app.get("/")
def health_check():
    return {"status": "Bingo Bot is Online"}
