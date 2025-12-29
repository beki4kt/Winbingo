import os, json, logging, traceback
from fastapi import FastAPI, Request
from telegram import Update, Bot, KeyboardButton, ReplyKeyboardMarkup

# Initialize logging to see errors in Vercel logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

@app.post("/webhook")
async def webhook(request: Request):
    try:
        data = await request.json()
        # Log the incoming data so we know Telegram reached us
        logger.info(f"Incoming Update: {data}")
        
        update = Update.de_json(data, Bot(os.getenv("BOT_TOKEN")))
        
        if update.message and update.message.text == "/start":
            # Test if we can send a simple message first
            await update.message.reply_text("I am alive! Attempting registration menu...")
            
            # Show the registration button
            btn = [[KeyboardButton("📱 Register", request_contact=True)]]
            await update.message.reply_text(
                "Click below to register:",
                reply_markup=ReplyKeyboardMarkup(btn, resize_keyboard=True)
            )
            
        return {"status": "ok"}
    except Exception as e:
        # This will print the EXACT error in your Vercel Logs
        error_msg = traceback.format_exc()
        logger.error(f"CRASH: {error_msg}")
        return {"status": "error", "message": str(e)}
