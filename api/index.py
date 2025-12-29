import os
import json
import logging
from fastapi import FastAPI, Request
from telegram import Update, Bot, KeyboardButton, ReplyKeyboardMarkup, WebAppInfo, BotCommand, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters
from .database import register_user, get_user, update_balance # Assumes database.py is in the same folder

# Configuration from Vercel Env Vars
TOKEN = os.getenv("BOT_TOKEN")
WEBAPP_URL = os.getenv("WEBAPP_URL") # Add your Vercel/GitHub game URL to Vercel Env Vars too!

# Initialize FastAPI
app = FastAPI()

# Initialize Telegram Application
# We use a global variable to keep the application instance alive between requests
ptb_app = Application.builder().token(TOKEN).build()

async def setup_commands():
    """Sets the blue 'Menu' button commands."""
    commands = [
        BotCommand("start", "🎮 Open Game Menu"),
        BotCommand("balance", "💰 Check Wallet"),
        BotCommand("support", "📞 Get Help")
    ]
    await ptb_app.bot.set_my_commands(commands)

# --- BOT HANDLERS ---

async def start(update: Update, context):
    user_id = update.effective_user.id
    user_data = get_user(user_id)
    
    if not user_data:
        # Step 1: Registration
        btn = [[KeyboardButton("📱 Register & Get 100 Coins", request_contact=True)]]
        await update.message.reply_text(
            "Welcome to Addis Bingo! 🎱\nTo start playing, please share your phone number for automatic registration.",
            reply_markup=ReplyKeyboardMarkup(btn, resize_keyboard=True, one_time_keyboard=True)
        )
    else:
        # Step 2: Main Menu for Registered Users
        kb = [[InlineKeyboardButton("🎮 Play Bingo Now", web_app=WebAppInfo(url=WEBAPP_URL))]]
        await update.message.reply_text(
            f"Welcome back, {user_data['first_name']}!\n💰 Balance: {user_data['balance']} coins",
            reply_markup=InlineKeyboardMarkup(kb)
        )

async def handle_contact(update: Update, context):
    contact = update.effective_message.contact
    user = update.effective_user
    if register_user(user.id, user.first_name, contact.phone_number):
        await update.message.reply_text("✅ Success! 100 bonus coins added to your account.")
        await start(update, context)

async def handle_webapp_data(update: Update, context):
    """Receives Win/Loss data from your JS game."""
    data = json.loads(update.effective_message.web_app_data.data)
    user_id = update.effective_user.id
    
    if "win" in data:
        new_bal = update_balance(user_id, data["win"], "Bingo Win")
        await update.message.reply_text(f"🎉 Winner! +{data['win']} coins.\nNew Balance: {new_bal}")

# Register Handlers to PTB
ptb_app.add_handler(CommandHandler("start", start))
ptb_app.add_handler(MessageHandler(filters.CONTACT, handle_contact))
ptb_app.add_handler(MessageHandler(filters.StatusUpdate.WEB_APP_DATA, handle_webapp_data))

# --- VERCEL WEBHOOK ROUTE ---

@app.post("/webhook")
async def webhook(request: Request):
    """The entry point for Telegram's POST requests."""
    if not ptb_app.running:
        await ptb_app.initialize()
        await setup_commands()
    
    data = await request.json()
    update = Update.de_json(data, ptb_app.bot)
    await ptb_app.process_update(update)
    return {"status": "ok"}

@app.get("/")
async def index():
    return {"message": "Bingo Bot is running on Vercel!"}
