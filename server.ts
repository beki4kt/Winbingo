// server.ts
import express from 'express';
import { Telegraf, Markup, Context } from 'telegraf';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootPath = path.join(__dirname, '../'); // Path to find win.png in root

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 8080;

app.use(cors());

// --- 🎮 MULTIPLAYER ENGINE ---
// Defines the state of the single active game room
interface GameState {
  roomId: string;
  calledNumbers: number[];
  currentCall: number | null;
  status: 'waiting' | 'running' | 'ended';
  nextCallTime: number;
}

let globalGame: GameState = {
  roomId: 'LIVE-1',
  calledNumbers: [],
  currentCall: null,
  status: 'running',
  nextCallTime: Date.now() + 5000
};

// Game Loop: Picks a number every 5 seconds
setInterval(() => {
  if (globalGame.status === 'running') {
    if (globalGame.calledNumbers.length >= 75) {
      // Restart Game Logic
      globalGame.status = 'ended';
      setTimeout(() => {
        globalGame = {
          roomId: 'LIVE-' + Math.floor(Math.random() * 1000),
          calledNumbers: [],
          currentCall: null,
          status: 'running',
          nextCallTime: Date.now() + 5000
        };
      }, 10000); // 10s break between games
      return;
    }

    // Pick unique number
    let nextNum;
    do { nextNum = Math.floor(Math.random() * 75) + 1; } 
    while (globalGame.calledNumbers.includes(nextNum));

    globalGame.currentCall = nextNum;
    globalGame.calledNumbers.push(nextNum);
    globalGame.nextCallTime = Date.now() + 5000;
  }
}, 5000);

// --- 🤖 BOT LOGIC ---
const botToken = process.env.BOT_TOKEN;
if (!botToken) console.warn("BOT_TOKEN is missing!");
const bot = new Telegraf(botToken || 'YOUR_TOKEN');
const appUrl = process.env.APP_URL || 'https://your-app.fly.dev';

// Database Helper
async function getOrCreateUser(ctx: Context) {
  if (!ctx.from) return null;
  const telegramId = BigInt(ctx.from.id);
  
  // Upsert ensures we update the username if it changed
  const user = await prisma.user.upsert({
    where: { telegramId },
    update: { 
      username: ctx.from.username, 
      firstName: ctx.from.first_name 
    },
    create: {
      telegramId,
      username: ctx.from.username,
      firstName: ctx.from.first_name
    }
  });
  return user;
}

// Menus
const mainMenu = Markup.inlineKeyboard([
  [Markup.button.webApp('PLAY BINGO 🎮', appUrl)],
  [Markup.button.callback('Deposit 💵', 'deposit_manual'), Markup.button.callback('Withdraw 🏦', 'withdraw_manual')],
  [Markup.button.callback('Transfer 💸', 'transfer_help')],
  [Markup.button.callback('Support 📞', 'support'), Markup.button.callback('Rules 📖', 'rules')]
]);

const registerKeyboard = Markup.keyboard([
  [Markup.button.contactRequest('📱 Share Contact to Register')]
]).resize().oneTime();


// --- COMMANDS ---

bot.telegram.setMyCommands([
  { command: 'start', description: 'Open Main Menu' },
  { command: 'play', description: 'Start Bingo App' },
  { command: 'register', description: 'Create Account (One-Time)' },
  { command: 'balance', description: 'Check Wallet' },
  { command: 'transfer', description: 'Send Money' },
  { command: 'deposit', description: 'Add Funds' },
  { command: 'withdrawal', description: 'Cash Out' },
]);

// 1. START (Image + Menu)
bot.start(async (ctx) => {
  await getOrCreateUser(ctx);
  try {
    await ctx.replyWithPhoto(
      { source: path.join(rootPath, 'win.png') }, 
      {
        caption: "👋 **Welcome to Win Bingo!**\n\nThe most trusted multiplayer bingo game.\nSelect an option below to start winning!",
        parse_mode: 'Markdown',
        ...mainMenu
      }
    );
  } catch (e) {
    console.error("Image load error:", e);
    // Fallback if image fails
    ctx.reply("👋 **Welcome to Win Bingo!**", { parse_mode: 'Markdown', ...mainMenu });
  }
});

// 2. PLAY
bot.command('play', (ctx) => {
  ctx.reply("🚀 **Ready to win?** Click below!", Markup.inlineKeyboard([
    Markup.button.webApp('Open Bingo App 🎮', appUrl)
  ]));
});

// 3. REGISTER (One-Time)
bot.command('register', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (user?.isRegistered) {
    return ctx.reply("✅ **You are already registered!**\n\nGo to /play to start the game.", { parse_mode: 'Markdown' });
  }
  ctx.reply("👇 **Tap the button below** to verify your account with your contact number.", registerKeyboard);
});

bot.on('contact', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  // Validation: Must be not registered, and contact must match sender
  if (user && !user.isRegistered && ctx.message.contact.user_id === ctx.from.id) {
    await prisma.user.update({
      where: { telegramId: user.telegramId },
      data: { isRegistered: true, phoneNumber: ctx.message.contact.phone_number }
    });
    ctx.reply("🎉 **Registration Complete!**\n\nYou can now use /deposit to add funds.", Markup.removeKeyboard());
  } else {
    ctx.reply("❌ **Registration Failed.** Please make sure you are sharing your own contact.", Markup.removeKeyboard());
  }
});

// 4. DEPOSIT & WITHDRAWAL (Manual)
bot.command(['deposit', 'withdrawal'], (ctx) => {
  ctx.reply("ℹ️ **Manual Processing**\n\nPlease contact our agent at @YourAdminHandle to process this request.");
});
bot.action(['deposit_manual', 'withdraw_manual'], (ctx) => {
    ctx.reply("ℹ️ Please contact @YourAdminHandle to process this transaction.");
});

// 5. BALANCE (Database)
bot.command('balance', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (user) {
    ctx.reply(`💰 **Your Wallet**\n\nBalance: **${user.balance.toFixed(2)} ETB**`, { parse_mode: 'Markdown' });
  }
});

// 6. TRANSFER (Database Logic)
bot.command('transfer', async (ctx) => {
  // Expected format: /transfer 50 @username
  const parts = ctx.message.text.split(' ');
  if (parts.length !== 3) {
    return ctx.reply("⚠️ **Usage:** `/transfer <amount> @username`\nExample: `/transfer 100 @john_doe`", { parse_mode: 'Markdown' });
  }

  const amount = parseFloat(parts[1]);
  const targetUsername = parts[2].replace('@', '');

  if (isNaN(amount) || amount <= 0) return ctx.reply("❌ Invalid amount.");

  const sender = await getOrCreateUser(ctx);
  if (!sender || sender.balance < amount) return ctx.reply("❌ **Insufficient Balance.**");

  // Find Receiver
  const receiver = await prisma.user.findFirst({
    where: { username: targetUsername }
  });

  if (!receiver) return ctx.reply("❌ User not found. Have they started the bot?");

  // Transaction
  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: sender.id },
        data: { balance: { decrement: amount } }
      }),
      prisma.user.update({
        where: { id: receiver.id },
        data: { balance: { increment: amount } }
      })
    ]);
    ctx.reply(`✅ **Transfer Successful!**\nSent ${amount} ETB to @${targetUsername}`, { parse_mode: 'Markdown' });
    // Optional: Notify receiver if they have started the bot
    bot.telegram.sendMessage(Number(receiver.telegramId), `💰 You received **${amount} ETB** from @${sender.username || 'Unknown'}!`, { parse_mode: 'Markdown' }).catch(() => {});
  } catch (e) {
    ctx.reply("❌ Transaction failed. Please try again.");
    console.error(e);
  }
});

bot.action('transfer_help', (ctx) => ctx.reply("To transfer funds, type:\n\n/transfer [amount] [@username]"));
bot.action('rules', (ctx) => ctx.reply("📖 Match 5 numbers in a row, column, or diagonal to win!"));
bot.action('support', (ctx) => ctx.reply("📞 Contact Support: @YourAdminHandle"));


bot.catch((err) => console.log('Bot Error:', err));
if (botToken) bot.launch();


// --- API FOR FRONTEND ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Sync Endpoint for Multiplayer
app.get('/api/game/sync', (req, res) => res.json(globalGame));

// User Info Endpoint
app.get('/api/user', async (req, res) => {
  const tid = req.query.id as string;
  if (!tid) return res.status(400).json({ error: "No ID" });
  
  // Use Prisma to find user
  const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tid) } });
  
  if (user) {
    res.json({ 
        ...user, 
        telegramId: user.telegramId.toString() // Convert BigInt to string for JSON
    });
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(port, () => console.log(`🚀 Server running on ${port}`));

process.once('SIGINT', () => { bot.stop(); prisma.$disconnect(); });
process.once('SIGTERM', () => { bot.stop(); prisma.$disconnect(); });