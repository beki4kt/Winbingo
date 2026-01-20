// server.ts
import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url'; // <--- Add this
import { dirname } from 'path';      // <--- Add this

dotenv.config();
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

// 2. Define the Bot Menu Logic (Matches your Images)
const mainMenu = Markup.inlineKeyboard([
  [Markup.button.webApp('Play 🎮', process.env.APP_URL || 'https://your-app.fly.dev'), Markup.button.callback('Register 📝', 'register')],
  [Markup.button.callback('Check Balance 💰', 'balance'), Markup.button.callback('Deposit 💵', 'deposit')],
  [Markup.button.callback('Contact Support 📞', 'support'), Markup.button.callback('Instruction 📖', 'instruction')],
  [Markup.button.callback('Transfer 🎁', 'transfer'), Markup.button.callback('Withdraw 🏦', 'withdraw')],
  [Markup.button.callback('Invite 🔗', 'invite')]
]);

// 3. Handle Commands
bot.start((ctx) => {
  ctx.replyWithPhoto(
    { url: 'https://via.placeholder.com/600x400.png?text=Win+Bingo' }, // Replace with your actual banner image URL
    {
      caption: '👋 Welcome to Win Bingo!\n\nChoose an option below to get started.',
      ...mainMenu
    }
  );
  
  // Set the "Menu" button (The bottom left menu in your screenshot)
  bot.telegram.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'register', description: 'Register account' },
    { command: 'play', description: 'Play Bingo game' },
    { command: 'deposit', description: 'Deposit money' },
    { command: 'balance', description: 'Check your balance' },
    { command: 'withdraw', description: 'Withdraw money' },
    { command: 'transfer', description: 'Send money to others' },
    { command: 'invite', description: 'Invite friends' },
    { command: 'support', description: 'Contact support' },
  ]);
});

// 4. Handle Button Actions (Backend Logic Placeholders)
bot.action('register', (ctx) => ctx.reply('📝 Registration feature coming soon!'));
bot.action('balance', (ctx) => ctx.reply('💰 Your current balance is 0.00 ETB.'));
bot.action('deposit', (ctx) => ctx.reply('💵 Deposit methods: Telebirr, Chapa.'));
bot.action('support', (ctx) => ctx.reply('📞 Contact @YourSupportHandle for help.'));
bot.action('instruction', (ctx) => ctx.reply('📖 How to play: Match 5 numbers in a row, column, or diagonal!'));
bot.action('withdraw', (ctx) => ctx.reply('🏦 Withdrawals are processed within 24 hours.'));
bot.action('invite', (ctx) => ctx.reply('🔗 Share this link to invite friends: https://t.me/YourBotName?start=ref123'));

// Launch the bot (Polling mode is easiest for Fly.io single instance)
if (botToken) {
  bot.launch().then(() => console.log('🤖 Bot is running!'));
}

// 5. Serve the React Frontend
// This tells Express to serve the "dist" folder where Vite builds your app
app.use(express.static(path.join(__dirname, 'dist')));

// Handle all other routes by serving index.html (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));