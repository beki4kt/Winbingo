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
