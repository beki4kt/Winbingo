import logging
import os
from supabase import create_client, Client
from telegram import (
    Update, 
    InlineKeyboardButton, 
    InlineKeyboardMarkup, 
    ReplyKeyboardMarkup, 
    KeyboardButton,
    ReplyKeyboardRemove,
    WebAppInfo,
    MenuButtonWebApp
)
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters,
)

# --- CONFIGURATION ---
BINGO_TOKEN = "YOUR_BINGO_BOT_TOKEN_HERE"
SUPABASE_URL = "https://your-project-url.supabase.co"
SUPABASE_KEY = "your-anon-key"
ADMIN_ID = 373753326
IMAGE_FILENAME = "winner_logo.jpg"
BINGO_WEBAPP_URL = "https://winbingoet1.vercel.app/"

# Initialize Supabase
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)

# --- UI HELPERS ---

def get_main_menu():
    keyboard = [
        [InlineKeyboardButton("Play 🎮", web_app=WebAppInfo(url=BINGO_WEBAPP_URL)), 
         InlineKeyboardButton("Register 📝", callback_data="reg_start")],
        [InlineKeyboardButton("Check Balance 💵", callback_data="balance"), 
         InlineKeyboardButton("Deposit 💵", callback_data="deposit_info")],
        [InlineKeyboardButton("Contact Support...", url="https://t.me/AddisSupport2"), 
         InlineKeyboardButton("Instruction 📖", callback_data="how_to")],
        [InlineKeyboardButton("Transfer 🎁", callback_data="transfer_prompt"), 
         InlineKeyboardButton("Withdraw 💰", callback_data="withdraw_info")],
        [InlineKeyboardButton("Invite 🔗", callback_data="invite_info")]
    ]
    return InlineKeyboardMarkup(keyboard)

# --- HANDLERS ---

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user_id = update.effective_user.id
    
    # Set the Bottom Left WebApp Button (Image 3 style)
    await context.bot.set_chat_menu_button(
        chat_id=update.effective_chat.id,
        menu_button=MenuButtonWebApp(text="Play Bingo 🕹", web_app=WebAppInfo(url=BINGO_WEBAPP_URL))
    )

    welcome_text = "👋 Welcome to Winner Bingo!\nChoose an Option below."
    if os.path.exists(IMAGE_FILENAME):
        await update.message.reply_photo(photo=open(IMAGE_FILENAME, "rb"), caption=welcome_text, reply_markup=get_main_menu())
    else:
        await update.message.reply_text(welcome_text, reply_markup=get_main_menu())

async def reg_start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    user_id = query.from_user.id

    # Check if user exists in Supabase
    res = supabase.table("users").select("*").eq("id", user_id).execute()
    if res.data:
        await context.bot.send_message(chat_id=user_id, text="⚠️ You are already registered!")
        return

    keyboard = [[KeyboardButton("📱 Share Contact to Register", request_contact=True)]]
    await context.bot.send_message(
        chat_id=user_id, 
        text="ምዝገባ ለመጀመር ከታች ያለውን ቁልፍ ይጫኑ።", 
        reply_markup=ReplyKeyboardMarkup(keyboard, resize_keyboard=True, one_time_keyboard=True)
    )

async def contact_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    contact = update.message.contact
    user_id = update.effective_user.id
    
    # Save to Supabase
    try:
        supabase.table("users").insert({
            "id": user_id,
            "phone": contact.phone_number,
            "username": update.effective_user.first_name,
            "balance": 0.0
        }).execute()
        
        await update.message.reply_text("✅ Registration Successful!", reply_markup=ReplyKeyboardRemove())
        await start(update, context) # Show menu again
    except Exception as e:
        await update.message.reply_text("❌ Error saving to database.")

async def check_balance(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    user_id = query.from_user.id

    res = supabase.table("users").select("balance").eq("id", user_id).execute()
    balance = res.data[0]['balance'] if res.data else "Not Registered"
    
    await query.edit_message_caption(caption=f"💰 Your Balance: **{balance} ETB**", reply_markup=get_main_menu())

async def menu_click_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    data = query.data
    
    if data == "balance":
        await check_balance(update, context)
    elif data == "deposit_info":
        text = "💳 **Deposit**\n📍 CBE: `1000610149786` \n📍 Telebirr: `0919184337` \nSend receipt to Support."
        await query.edit_message_caption(caption=text, reply_markup=get_main_menu())
    elif data == "transfer_prompt":
        await query.answer("Transfer feature requires Admin manual confirmation. Contact Support.", show_alert=True)
    # Add other handlers...

def main():
    app = Application.builder().token(BINGO_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(reg_start, pattern="^reg_start$"))
    app.add_handler(CallbackQueryHandler(menu_click_handler))
    app.add_handler(MessageHandler(filters.CONTACT, contact_callback))
    app.run_polling()

if __name__ == "__main__":
    main()