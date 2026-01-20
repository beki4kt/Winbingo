// server.ts
console.log("🔄 server.ts is starting...");

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
const rootPath = path.join(__dirname, '../');

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 8080;

app.use(cors());

// --- 🎮 MULTIPLAYER ENGINE ---
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

setInterval(() => {
  if (globalGame.status === 'running') {
    if (globalGame.calledNumbers.length >= 75) {
      globalGame.status = 'ended';
      setTimeout(() => {
        globalGame = {
          roomId: 'LIVE-' + Math.floor(Math.random() * 1000),
          calledNumbers: [],
          currentCall: null,
          status: 'running',
          nextCallTime: Date.now() + 5000
        };
      }, 10000);
      return;
    }
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
if (!botToken) console.error("❌ BOT_TOKEN is missing!");
const bot = new Telegraf(botToken || '');
const appUrl = process.env.APP_URL || 'https://your-app.fly.dev';

// DB Helper
async function getOrCreateUser(ctx: Context) {
  if (!ctx.from) return null;
  const telegramId = BigInt(ctx.from.id);
  try {
    return await prisma.user.upsert({
      where: { telegramId },
      update: { username: ctx.from.username, firstName: ctx.from.first_name },
      create: { telegramId, username: ctx.from.username, firstName: ctx.from.first_name }
    });
  } catch (e) {
    console.error("DB Error:", e);
    return null;
  }
}

// --- KEYBOARDS ---

// 1. The Main Dashboard (Inline Buttons)
const dashboardMenu = Markup.inlineKeyboard([
  [Markup.button.webApp('Play / ይጫወቱ 🎮', appUrl), Markup.button.callback('Register / ይመዝገቡ 📝', 'register_check')],
  [Markup.button.callback('Check Balance / ሂሳብ 💰', 'balance'), Markup.button.callback('Deposit / ገቢ 💵', 'deposit')],
  [Markup.button.callback('Support / እርዳታ 📞', 'support'), Markup.button.callback('Instruction / መመሪያ 📖', 'instruction')],
  [Markup.button.callback('Transfer / ያስተላልፉ 🎁', 'transfer_help'), Markup.button.callback('Withdraw / ወጪ 🏦', 'withdraw')],
  [Markup.button.callback('Invite / ይጋብዙ 🔗', 'invite')]
]);

// 2. Registration Request (Persistent Keyboard)
const requestContactMenu = Markup.keyboard([
  [Markup.button.contactRequest('📱 Share Contact / ስልክ ቁጥር ያጋሩ')]
]).resize().oneTime();


// --- COMMANDS CONFIGURATION ---
const commands = [
  { command: 'start', description: 'Start the bot / መጀመሪያ' },
  { command: 'menu', description: 'Open Menu / ምናሌ' },
  { command: 'register', description: 'Register account / ይመዝገቡ' },
  { command: 'play', description: 'Play Bingo / ይጫወቱ' },
  { command: 'balance', description: 'Check balance / ቀሪ ሂሳብ' },
  { command: 'deposit', description: 'Deposit money / ገቢ' },
  { command: 'withdraw', description: 'Withdraw money / ወጪ' },
  { command: 'transfer', description: 'Send money / ያስተላልፉ' },
  { command: 'instruction', description: 'How to play / መመሪያ' },
  { command: 'support', description: 'Contact support / እርዳታ' }
];

// --- BOT HANDLERS ---

bot.start(async (ctx) => {
  const user = await getOrCreateUser(ctx);
  
  // A. NOT REGISTERED? -> Force Registration
  if (!user || !user.isRegistered) {
    return ctx.reply(
      "👋 **Welcome to Win Bingo!**\n**ወደ ዊን ቢንጎ እንኳን በደህና መጡ!**\n\nTo start playing, please register by sharing your phone number.\nለመጫወት፣ እባክዎ ስልክ ቁጥርዎን በማጋራት ይመዝገቡ። 👇", 
      { 
        parse_mode: 'Markdown', 
        ...requestContactMenu 
      }
    );
  }

  // B. REGISTERED? -> Show Dashboard
  sendDashboard(ctx);
});

// CONTACT HANDLER
bot.on('contact', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  
  if (user && !user.isRegistered && ctx.message.contact.user_id === ctx.from.id) {
    await prisma.user.update({
      where: { telegramId: user.telegramId },
      data: { isRegistered: true, phoneNumber: ctx.message.contact.phone_number }
    });

    // Remove the "Share Contact" keyboard explicitly
    await ctx.reply(
      "✅ **Registration Successful! / ምዝገባው ተሳክቷል!**\n\nYou can now play and deposit.\nአሁን መጫወት እና ገቢ ማድረግ ይችላሉ።", 
      { parse_mode: 'Markdown', ...Markup.removeKeyboard() }
    );

    sendDashboard(ctx);
  } else {
    ctx.reply("❌ **Error / ስህተት**\nPlease share your own contact.\nእባክዎ የራስዎን ስልክ ቁጥር ያጋሩ።", requestContactMenu);
  }
});

async function sendDashboard(ctx: any) {
  try {
    await ctx.replyWithPhoto(
      { source: path.join(rootPath, 'win.png') }, 
      {
        caption: "🏆 **Win Bingo Main Menu**\n\nChoose an option below:\nከታች ካሉት አማራጮች ይምረጡ፡",
        parse_mode: 'Markdown',
        ...dashboardMenu
      }
    );
  } catch (e) {
    ctx.reply("🏆 **Win Bingo Main Menu**", dashboardMenu);
  }
}

// COMMAND HANDLERS
bot.command('menu', (ctx) => sendDashboard(ctx));
bot.command('register', (ctx) => ctx.reply("ℹ️ You are already registered!\nተመዝግበዋል።", dashboardMenu));
bot.command('play', (ctx) => ctx.reply("🎮 Click below to play:", Markup.inlineKeyboard([Markup.button.webApp('Play Now / ይጫወቱ', appUrl)])));

bot.command('balance', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  ctx.reply(`💰 **Balance / ቀሪ ሂሳብ**: ${user?.balance.toFixed(2)} ETB`);
});

bot.command('transfer', async (ctx) => {
  const parts = ctx.message.text.split(' ');
  if (parts.length !== 3) return ctx.reply("⚠️ Usage: `/transfer 100 @username`");
  const amount = parseFloat(parts[1]);
  const targetUsername = parts[2].replace('@', '');
  if (isNaN(amount) || amount <= 0) return ctx.reply("❌ Invalid amount.");
  
  const sender = await getOrCreateUser(ctx);
  if (!sender || sender.balance < amount) return ctx.reply("❌ Insufficient funds / በቂ ገንዘብ የለዎትም");
  
  const receiver = await prisma.user.findFirst({ where: { username: targetUsername } });
  if (!receiver) return ctx.reply("❌ User not found / ተጠቃሚው አልተገኘም");

  await prisma.$transaction([
    prisma.user.update({ where: { id: sender.id }, data: { balance: { decrement: amount } } }),
    prisma.user.update({ where: { id: receiver.id }, data: { balance: { increment: amount } } })
  ]);
  
  ctx.reply(`✅ Sent ${amount} ETB to @${targetUsername}`);
  bot.telegram.sendMessage(receiver.telegramId.toString(), `💰 You received ${amount} ETB from @${sender.username}!`).catch(()=>{});
});

bot.action('register_check', (ctx) => ctx.reply("✅ You are registered. / ተመዝግበዋል።"));
bot.action('balance', async (ctx) => {
  if(!ctx.from) return;
  const user = await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from.id) } });
  ctx.reply(`💰 Balance: ${user?.balance.toFixed(2)} ETB`);
});
bot.action('instruction', (ctx) => ctx.reply("📖 **How to Play / መመሪያ**\n\nMatch 5 numbers in a row, column, or diagonal.\nአምስት ቁጥሮችን በተርታ፣ በአምድ ወይም በዲያግናል ያገናኙ!"));
bot.action('support', (ctx) => ctx.reply("📞 Support: @YourAdminHandle"));
bot.action(['deposit', 'withdraw', 'invite'], (ctx) => ctx.reply("ℹ️ Contact admin for this feature.\nለዚህ አገልግሎት አድሚኑን ያናግሩ።"));
bot.action('transfer_help', (ctx) => ctx.reply("To transfer: /transfer <amount> <username>"));

bot.catch((err) => console.log('Bot Error:', err));

// --- SERVER & API ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('/api/game/sync', (req, res) => res.json(globalGame));
app.get('/api/user', async (req, res) => {
  const tid = req.query.id as string;
  if (!tid) return res.status(400).json({ error: "No ID" });
  try {
      const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tid) } });
      user ? res.json({ ...user, telegramId: user.telegramId.toString() }) : res.status(404).json({ error: "Not found" });
  } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

app.listen(port, () => {
    console.log(`✅ Server running on ${port}`);
    if (botToken) {
      // 1. Set commands
      bot.telegram.setMyCommands(commands);
      
      // 2. CRITICAL FIX: Force the blue button to be "Commands" menu, NOT "Play Web App"
      // This overwrites any previous setting that stuck on the bot
      bot.telegram.setChatMenuButton({ menuButton: { type: 'commands' } });
      
      bot.launch().then(() => console.log("🤖 Bot Launched")).catch(e => console.error("Bot failed:", e));
    }
});

process.once('SIGINT', () => { bot.stop(); prisma.$disconnect(); });
process.once('SIGTERM', () => { bot.stop(); prisma.$disconnect(); });