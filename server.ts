// server.ts
import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

// Fix for __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// 1. Setup Telegram Bot
const botToken = process.env.BOT_TOKEN;
if (!botToken) {
  console.warn("⚠️ BOT_TOKEN is missing. Bot logic will not start.");
}

const bot = new Telegraf(botToken || 'YOUR_BOT_TOKEN_HERE');

// 2. Define the Bot Menu Logic
const mainMenu = Markup.inlineKeyboard([
  [Markup.button.webApp('Play 🎮', process.env.APP_URL || 'https://your-app.fly.dev'), Markup.button.callback('Register 📝', 'register')],
  [Markup.button.callback('Check Balance 💰', 'balance'), Markup.button.callback('Deposit 💵', 'deposit')],
  [Markup.button.callback('Contact Support 📞', 'support'), Markup.button.callback('Instruction 📖', 'instruction')],
  [Markup.button.callback('Transfer 🎁', 'transfer'), Markup.button.callback('Withdraw 🏦', 'withdraw')],
  [Markup.button.callback('Invite 🔗', 'invite')]
]);

// 3. Handle Commands
bot.start(async (ctx) => {
  try {
    await ctx.replyWithPhoto(
      'https://telegram.org/img/t_logo.png', 
      {
        caption: '👋 Welcome to Win Bingo!\n\nChoose an option below to get started.',
        ...mainMenu
      }
    );
  } catch (e) {
    console.error("Failed to send image, sending text instead.");
    await ctx.reply('👋 Welcome to Win Bingo!\n\nChoose an option below to get started.', mainMenu);
  }

  // Set the "Menu" button
  try {
    await bot.telegram.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'play', description: 'Play Bingo game' },
      { command: 'deposit', description: 'Deposit money' },
      { command: 'balance', description: 'Check your balance' },
      { command: 'support', description: 'Contact support' },
    ]);
  } catch (err) {
    console.warn("Could not set commands (likely network issue), skipping.");
  }
});

// 4. Handle Button Actions
bot.action('register', (ctx) => ctx.reply('📝 Registration feature coming soon!'));
bot.action('balance', (ctx) => ctx.reply('💰 Your current balance is 0.00 ETB.'));
bot.action('deposit', (ctx) => ctx.reply('💵 Deposit methods: Telebirr, Chapa.'));
bot.action('support', (ctx) => ctx.reply('📞 Contact @YourSupportHandle for help.'));
bot.action('instruction', (ctx) => ctx.reply('📖 How to play: Match 5 numbers in a row, column, or diagonal!'));
bot.action('withdraw', (ctx) => ctx.reply('🏦 Withdrawals are processed within 24 hours.'));
bot.action('invite', (ctx) => ctx.reply('🔗 Share this link to invite friends: https://t.me/YourBotName?start=ref123'));

// 5. Global Error Handling
bot.catch((err: any, ctx) => {
  console.log(`⚠️ Ooops, encountered an error for ${ctx.updateType}`, err);
});

if (botToken) {
  bot.launch().then(() => console.log('🤖 Bot is running!'));
}

// 6. Serve the React Frontend (CORRECTED PATH)
// We use '../dist' because the server code runs from inside 'dist-server'
const distPath = path.join(__dirname, '../dist');

app.use(express.static(distPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));