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
import crypto from 'crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootPath = path.join(__dirname, '../');

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 8080;

app.use(cors());

// --- 🧠 STATE MANAGEMENT (For Deposit/Withdraw Flow) ---
// This tracks what the user is currently doing
interface UserState {
  step: 'IDLE' | 'DEPOSIT_AMOUNT' | 'DEPOSIT_CONFIRM' | 'WITHDRAW_AMOUNT' | 'WITHDRAW_PHONE';
  data: any;
}
const userStates = new Map<string, UserState>();

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

// Helper: Generate Random Reference (like "FHE9tDzdwg")
function generateReference() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// --- KEYBOARDS ---

const dashboardMenu = Markup.inlineKeyboard([
  [Markup.button.webApp('Play / ይጫወቱ 🎮', appUrl), Markup.button.callback('Register / ይመዝገቡ 📝', 'register_check')],
  [Markup.button.callback('Check Balance / ሂሳብ 💰', 'balance'), Markup.button.callback('Deposit / ገቢ 💵', 'deposit_start')],
  [Markup.button.callback('Withdraw / ወጪ 🏦', 'withdraw_start')],
  [Markup.button.callback('Support / እርዳታ 📞', 'support'), Markup.button.callback('Instruction / መመሪያ 📖', 'instruction')],
  [Markup.button.callback('Transfer / ያስተላልፉ 🎁', 'transfer_help'), Markup.button.callback('Invite / ይጋብዙ 🔗', 'invite')]
]);

const requestContactMenu = Markup.keyboard([
  [Markup.button.contactRequest('📱 Share Contact / ስልክ ቁጥር ያጋሩ')]
]).resize().oneTime();

const cancelKeyboard = Markup.keyboard([['❌ Cancel / ሰርዝ']]).resize();

// --- BOT HANDLERS ---

bot.start(async (ctx) => {
  // Force reset menu button
  try { await ctx.setChatMenuButton({ type: 'commands' }); } catch (e) {}

  const user = await getOrCreateUser(ctx);
  
  if (!user || !user.isRegistered) {
    return ctx.reply(
      "👋 **Welcome to Win Bingo!**\n**ወደ ዊን ቢንጎ እንኳን በደህና መጡ!**\n\nTo start playing, please register by sharing your phone number.\nለመጫወት፣ እባክዎ ስልክ ቁጥርዎን በማጋራት ይመዝገቡ። 👇", 
      { parse_mode: 'Markdown', ...requestContactMenu }
    );
  }
  sendDashboard(ctx);
});

// CONTACT HANDLER
bot.on('contact', async (ctx) => {
  try { await ctx.setChatMenuButton({ type: 'commands' }); } catch (e) {}
  const user = await getOrCreateUser(ctx);
  
  if (user && !user.isRegistered && ctx.message.contact.user_id === ctx.from.id) {
    await prisma.user.update({
      where: { telegramId: user.telegramId },
      data: { isRegistered: true, phoneNumber: ctx.message.contact.phone_number }
    });
    await ctx.reply("✅ **Registration Successful! / ምዝገባው ተሳክቷል!**", { parse_mode: 'Markdown', ...Markup.removeKeyboard() });
    sendDashboard(ctx);
  } else {
    ctx.reply("❌ **Error / ስህተት**\nPlease share your own contact.", requestContactMenu);
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

// ---------------------------------------------------------
// 💰 DEPOSIT FLOW
// ---------------------------------------------------------
bot.command('deposit', (ctx) => startDeposit(ctx));
bot.action('deposit_start', (ctx) => startDeposit(ctx));

function startDeposit(ctx: any) {
  if (!ctx.from) return;
  // Step 1: Choose Method
  ctx.reply(
    "Choose Your Preferred Deposit Method\nየመረጡትን የገቢ አማራጭ ይምረጡ",
    Markup.inlineKeyboard([
      [Markup.button.callback('Telegram Stars ⭐️', 'dep_stars')],
      [Markup.button.callback('Manual (Telebirr/CBE) 🏦', 'dep_manual')]
    ])
  );
}

bot.action('dep_stars', (ctx) => ctx.reply("Coming soon! Please use Manual method for now."));

bot.action('dep_manual', (ctx) => {
  if (!ctx.from) return;
  const uid = ctx.from.id.toString();
  // Step 2: Ask Amount
  userStates.set(uid, { step: 'DEPOSIT_AMOUNT', data: {} });
  ctx.reply("Enter the amount of money you want to deposit:\nእንዲሞላልዎት የሚፈልጉትን የገንዘብ መጠን ያስገቡ:", cancelKeyboard);
});

// ---------------------------------------------------------
// 🏦 WITHDRAW FLOW
// ---------------------------------------------------------
bot.command('withdraw', (ctx) => startWithdraw(ctx));
bot.action('withdraw_start', (ctx) => startWithdraw(ctx));

function startWithdraw(ctx: any) {
  if (!ctx.from) return;
  const uid = ctx.from.id.toString();
  // Step 1: Ask Amount
  userStates.set(uid, { step: 'WITHDRAW_AMOUNT', data: {} });
  ctx.reply("Enter amount to withdraw:\nሊያወጡት የሚፈልጉትን መጠን ያስገቡ:", cancelKeyboard);
}


// ---------------------------------------------------------
// 📩 TEXT HANDLER (The Brain of the Conversation)
// ---------------------------------------------------------
bot.on('text', async (ctx) => {
  if (!ctx.from) return;
  const uid = ctx.from.id.toString();
  const text = ctx.message.text;
  const state = userStates.get(uid);

  // 1. Handle Cancel
  if (text.includes('Cancel') || text.includes('ሰርዝ')) {
    userStates.delete(uid);
    return ctx.reply("❌ Process Cancelled / ተሰርዟል", { ...Markup.removeKeyboard() }).then(() => sendDashboard(ctx));
  }

  // 2. Handle Game Logic based on State
  if (!state) return; // If no active state, ignore normal text (or handle other commands)

  // --- HANDLE DEPOSIT ---
  if (state.step === 'DEPOSIT_AMOUNT') {
    const amount = parseFloat(text);
    if (isNaN(amount) || amount < 5) return ctx.reply("❌ Invalid amount. Minimum is 5 ETB.\nትክክለኛ ቁጥር ያስገቡ።");

    const ref = generateReference();
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(uid) } });

    // Step 3: Show Payment Details (Matches Image 23.jpg)
    const detailsMsg = `
**Payment Details / የክፍያ ዝርዝሮች**
\`\`\`
Name:      ${user?.firstName || 'User'}
Phone:     ${user?.phoneNumber || 'N/A'}
Amount:    ${amount} ETB
Reference: ${ref}
\`\`\`
**Deposit Options / ብር ማስገባት የምችሉት:**
1. Telebirr to Agent Telebirr Only
2. CBE to Agent CBE Only
    `;

    await ctx.reply(detailsMsg, { parse_mode: 'Markdown' });

    // Step 4: Show Instructions (Matches Image 22.jpg)
    const instructionsMsg = `
**Pay from Telebirr to Agent Only**

📞 **Telebirr Agent / የቴሌብር ወኪል:**
\`0924497619\`

**Instructions / መመሪያ:**
1. Deposit **${amount} ETB** to the Telebirr account above.
   ከላይ ባለው የቴሌብር አካውንት **${amount} ብር** ያስገቡ።

2. Ensure the amount matches exactly.
   የሚያስገቡት መጠን እዚህ ከመረጡት ጋር አንድ መሆኑን ያረጋግጡ።

3. Copy the SMS message you receive from Telebirr.
   ከቴሌብር የሚደርስዎትን የኤስኤምኤስ (SMS) መልእክት ኮፒ (Copy) ያድርጉ።

4. **Paste the SMS here** to confirm payment.
   የደረሰዎትን መልእክት እዚህ ይለጥፉ (Paste)።
    `;

    userStates.set(uid, { step: 'DEPOSIT_CONFIRM', data: { amount, ref } });
    return ctx.reply(instructionsMsg, { parse_mode: 'Markdown', ...cancelKeyboard });
  }

  if (state.step === 'DEPOSIT_CONFIRM') {
    // Mock Verification logic
    const sms = text;
    const amount = state.data.amount;
    
    // In a real app, you would parse the SMS to verify transaction
    // For now, we accept it and notify admin
    
    await ctx.reply("✅ **Request Received! / ጥያቄዎ ተቀብሏል!**\n\nOur system is verifying your transaction. Your balance will be updated shortly.\nሲስተሙ ክፍያዎን እያረጋገጠ ነው። በቅርቡ ሂሳብዎ ይስተካከላል።", { parse_mode: 'Markdown', ...Markup.removeKeyboard() });
    
    // Notify Admin (Optional)
    // bot.telegram.sendMessage(ADMIN_ID, `New Deposit: ${amount} ETB\nRef: ${state.data.ref}\nSMS: ${sms}`);
    
    userStates.delete(uid); // Clear state
    return sendDashboard(ctx);
  }


  // --- HANDLE WITHDRAW ---
  if (state.step === 'WITHDRAW_AMOUNT') {
    const amount = parseFloat(text);
    const user = await prisma.user.findUnique({ where: { telegramId: BigInt(uid) } });

    if (isNaN(amount) || amount <= 0) return ctx.reply("❌ Invalid amount.");
    if (!user || user.balance < amount) return ctx.reply("❌ Insufficient Balance / በቂ ገንዘብ የለዎትም።");

    userStates.set(uid, { step: 'WITHDRAW_PHONE', data: { amount } });
    return ctx.reply("📞 Enter the phone number to receive payment:\nገንዘብዎ የሚላክበትን ስልክ ቁጥር ያስገቡ:", cancelKeyboard);
  }

  if (state.step === 'WITHDRAW_PHONE') {
    const phone = text;
    const amount = state.data.amount;

    await ctx.reply(`✅ **Withdrawal Requested! / ወጪ ተጠይቋል!**\n\nAmount: ${amount} ETB\nPhone: ${phone}\n\nWe will process it shortly.`, { parse_mode: 'Markdown', ...Markup.removeKeyboard() });
    
    userStates.delete(uid);
    return sendDashboard(ctx);
  }
});


// ---------------------------------------------------------
// OTHER COMMANDS
// ---------------------------------------------------------
bot.command('menu', (ctx) => sendDashboard(ctx));
bot.command('balance', async (ctx) => {
  const user = await getOrCreateUser(ctx);
  ctx.reply(`💰 **Balance / ቀሪ ሂሳብ**: ${user?.balance.toFixed(2)} ETB`);
});
bot.action('balance', async (ctx) => {
  if(!ctx.from) return;
  const user = await prisma.user.findUnique({ where: { telegramId: BigInt(ctx.from.id) } });
  ctx.reply(`💰 Balance: ${user?.balance.toFixed(2)} ETB`);
});

bot.action('instruction', (ctx) => ctx.reply("📖 **How to Play / መመሪያ**\n\nMatch 5 numbers in a row, column, or diagonal.\nአምስት ቁጥሮችን በተርታ፣ በአምድ ወይም በዲያግናል ያገናኙ!"));
bot.action('support', (ctx) => ctx.reply("📞 Support: @YourAdminHandle"));
bot.action(['invite'], (ctx) => ctx.reply("Invite feature coming soon!"));
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
       // Define commands for the Menu Button
      bot.telegram.setMyCommands([
        { command: 'menu', description: 'Open Menu / ምናሌ' },
        { command: 'deposit', description: 'Deposit / ገቢ' },
        { command: 'withdraw', description: 'Withdraw / ወጪ' },
        { command: 'balance', description: 'Balance / ቀሪ ሂሳብ' },
        { command: 'instruction', description: 'Help / መመሪያ' }
      ]);
      bot.launch().then(() => console.log("🤖 Bot Launched")).catch(e => console.error("Bot failed:", e));
    }
});

process.once('SIGINT', () => { bot.stop(); prisma.$disconnect(); });
process.once('SIGTERM', () => { bot.stop(); prisma.$disconnect(); });