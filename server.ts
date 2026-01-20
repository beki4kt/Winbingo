// ---------------------------------------------------------
// 1. DEBUG LOG: Server Starting
// ---------------------------------------------------------
console.log("🔄 server.ts is loading...");

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

console.log("📂 Root path set to:", rootPath);

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

// Game Loop
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
if (!botToken) {
    console.error("❌ FATAL: BOT_TOKEN is missing in environment variables.");
}
const bot = new Telegraf(botToken || 'YOUR_TOKEN');
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
  } catch (err) {
      console.error("Database Error:", err);
      return null;
  }
}

// --- KEYBOARDS ---

const mainMenu = Markup.inlineKeyboard([
  [Markup.button.webApp('OPEN MENU / ምናሌን ክፈት 📱', appUrl)],
  [Markup.button.callback('Deposit / ገቢ 💵', 'deposit_manual'), Markup.button.callback('Withdraw / ወጪ 🏦', 'withdraw_manual')],
  [Markup.button.callback('Transfer / ያስተላልፉ 💸', 'transfer_help')],
  [Markup.button.callback('Support / እርዳታ 📞', 'support'), Markup.button.callback('Rules / ደንቦች 📖', 'rules')]
]);

const registerKeyboard = Markup.keyboard([
  [Markup.button.contactRequest('📱 Share Contact / ስልክ ቁጥር ያጋሩ')]
]).resize().oneTime();


// --- COMMANDS ---

bot.telegram.setMyCommands([
  { command: 'start', description: 'Start / መጀመሪያ' },
  { command: 'menu', description: 'Open Menu / ምናሌ' },
  { command: 'balance', description: 'Balance / ቀሪ ሂሳብ' },
  { command: 'transfer', description: 'Transfer / ያስተላልፉ' },
  { command: 'support', description: 'Support / እርዳታ' },
]);

// 1. START
bot.start(async (ctx) => {
  const user = await getOrCreateUser(ctx);
  
  // CHECK: Is user registered?
  if (!user || !user.isRegistered) {
    return ctx.reply(
      "👋 **Welcome to Win Bingo! / ወደ ዊን ቢንጎ እንኳን በደህና መጡ!**\n\nTo start playing, please register by sharing your phone number.\n\nለመጫወት፣ እባክዎ ስልክ ቁጥርዎን በማጋራት ይመዝገቡ። 👇", 
      { 
        parse_mode: 'Markdown', 
        ...registerKeyboard 
      }
    );
  }

  // REGISTERED: Show Main Menu
  try {
    await ctx.replyWithPhoto(
      { source: path.join(rootPath, 'win.png') }, 
      {
        caption: `👋 **Welcome back, ${ctx.from.first_name}!**\n\n**እንኳን ደህና መጡ!**\n\nSelect an option below:\nከታች ካሉት አማራጮች ይምረጡ፡`,
        parse_mode: 'Markdown',
        ...mainMenu
      }
    );
  } catch (e) {
    console.warn("⚠️ win.png failed to load:", e);
    ctx.reply("👋 **Welcome back! / እንኳን ደህና መጡ!**", { parse_mode: 'Markdown', ...mainMenu });
  }
});

// 2. HANDLE CONTACT
bot.on('contact', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  
  if (user && !user.isRegistered && ctx.message.contact.user_id === ctx.from.id) {
    await prisma.user.update({
      where: { telegramId: user.telegramId },
      data: { isRegistered: true, phoneNumber: ctx.message.contact.phone_number }
    });

    ctx.reply(
      "🎉 **Registration Complete! / ምዝገባው ተሳክቷል!**\n\nYou can now play and deposit.\nአሁን መጫወት እና ገቢ ማድረግ ይችላሉ።", 
      { parse_mode: 'Markdown', ...Markup.removeKeyboard() }
    );
    
    // Follow up with the menu image
    try {
        await ctx.replyWithPhoto(
          { source: path.join(rootPath, 'win.png') }, 
          {
            caption: "**Win Bingo Menu / ዊን ቢንጎ ምናሌ**",
            parse_mode: 'Markdown',
            ...mainMenu
          }
        );
    } catch (e) {
        ctx.reply("**Win Bingo Menu / ዊን ቢንጎ ምናሌ**", mainMenu);
    }

  } else {
    ctx.reply("❌ **Error / ስህተት**\nPlease share your own contact.\nእባክዎ የራስዎን ስልክ ቁጥር ያጋሩ።", registerKeyboard);
  }
});

// 3. BALANCE
bot.command('balance', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  if (user) {
    ctx.reply(`💰 **Your Wallet / የኪስ ቦርሳ**\n\nBalance: **${user.balance.toFixed(2)} ETB**`, { parse_mode: 'Markdown' });
  }
});

// 4. TRANSFER
bot.command('transfer', async (ctx) => {
  if (!ctx.message || !('text' in ctx.message)) return;

  const parts = ctx.message.text.split(' ');
  if (parts.length !== 3) {
    return ctx.reply("⚠️ **Usage:** `/transfer <amount> @username`\nExample: `/transfer 100 @abebe`", { parse_mode: 'Markdown' });
  }

  const amount = parseFloat(parts[1]);
  const targetUsername = parts[2].replace('@', '');

  if (isNaN(amount) || amount <= 0) return ctx.reply("❌ Invalid amount.");

  const sender = await getOrCreateUser(ctx);
  if (!sender || sender.balance < amount) return ctx.reply("❌ **Insufficient Balance / በቂ ቀሪ ሂሳብ የለዎትም**");

  const receiver = await prisma.user.findFirst({ where: { username: targetUsername } });
  if (!receiver) return ctx.reply("❌ User not found / ተጠቃሚው አልተገኘም");

  try {
    await prisma.$transaction([
      prisma.user.update({ where: { id: sender.id }, data: { balance: { decrement: amount } } }),
      prisma.user.update({ where: { id: receiver.id }, data: { balance: { increment: amount } } })
    ]);
    
    ctx.reply(`✅ **Transfer Successful / ዝውውሩ ተሳክቷል!**\nSent ${amount} ETB to @${targetUsername}`, { parse_mode: 'Markdown' });
    
    bot.telegram.sendMessage(receiver.telegramId.toString(), `💰 You received **${amount} ETB** from @${sender.username}!`, { parse_mode: 'Markdown' }).catch(() => {});
  
  } catch (e) {
    console.error(e);
    ctx.reply("❌ Transaction failed.");
  }
});

bot.action('transfer_help', (ctx) => ctx.reply("To transfer, type: /transfer [amount] [@username]\n\nለማስተላለፍ ይህንን ይፃፉ: /transfer [amount] [@username]"));
bot.action(['deposit_manual', 'withdraw_manual'], (ctx) => ctx.reply("ℹ️ **Manual Action / በእጅ የሚሰራ**\n\nPlease contact admin: @YourAdminHandle\nእባክዎ አድሚኑን ያናግሩ: @YourAdminHandle"));
bot.action('rules', (ctx) => ctx.reply("📖 **Rules / ደንቦች**\n\nMatch 5 numbers in a row, column, or diagonal!\nአምስት ቁጥሮችን በተርታ፣ በአምድ ወይም በዲያግናል ያገናኙ!"));
bot.action('support', (ctx) => ctx.reply("📞 **Support / እርዳታ**\n\nContact: @YourAdminHandle"));

bot.catch((err) => console.log('Bot Error:', err));

// --- SERVER ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

app.get('/api/game/sync', (req, res) => res.json(globalGame));
app.get('/api/user', async (req, res) => {
  const tid = req.query.id as string;
  if (!tid) return res.status(400).json({ error: "No ID" });
  
  try {
      const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tid) } });
      if (user) {
        res.json({ ...user, telegramId: user.telegramId.toString() });
      } else {
        res.status(404).json({ error: "Not found" });
      }
  } catch (err) {
      console.error("API Error:", err);
      res.status(500).json({ error: "DB Error" });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));

// ---------------------------------------------------------
// 2. DEBUG LOG: Listen and Launch
// ---------------------------------------------------------
app.listen(port, () => {
    console.log(`✅ Server is listening on port ${port}`);
    
    if (botToken) {
        console.log("🤖 Attempting to launch bot...");
        bot.launch()
           .then(() => console.log("✅ Bot launched successfully!"))
           .catch((err) => console.error("❌ Bot launch failed:", err));
    }
});

process.once('SIGINT', () => { console.log("SIGINT received"); bot.stop('SIGINT'); prisma.$disconnect(); });
process.once('SIGTERM', () => { console.log("SIGTERM received"); bot.stop('SIGTERM'); prisma.$disconnect(); });